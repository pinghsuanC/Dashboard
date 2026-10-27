// Moves one test account through the plan-gating walkthrough.
// Run: npx tsx testScripts/gating-user.ts <stage>
// Development branch only (`.env`). The login is GATING_TEST_USER_EMAIL /
// _PASSWORD in `.env.example` (gitignored), read by this script alone.
//
// Stages:
//   reset   delete the account and its stored files, then create it again:
//           verified, password sign-in, Free, 3 collections, 49 items;
//           snippets fill one page plus one, to check /items/snippets paging
//   trial   add a granted period (no vendor) ending in 14 days
//   lapse   end every granted period 3 days ago, past the 1-day grace
//   paid    add a granted yearly period ending in a year; the walkthrough
//           pays through Stripe Checkout instead, this is the fallback
//   status  print the counts and periods
//
// Reload the app after a stage: the client session only follows a database
// change on a full page load. Server checks follow it on the next request.
import { readFileSync } from "node:fs";

import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env (see CLAUDE.md).");
  process.exit(1);
}

// Only these two keys: the rest of `.env.example` is placeholders.
const example = dotenv.parse(readFileSync(".env.example"));
const email = example.GATING_TEST_USER_EMAIL;
const password = example.GATING_TEST_USER_PASSWORD;
if (!email || !password) {
  console.error("Set GATING_TEST_USER_EMAIL and GATING_TEST_USER_PASSWORD in .env.example.");
  process.exit(1);
}
// `reset` deletes the account: never let it reach a real one.
if (!email.endsWith("@example.com")) {
  console.error(`Refusing ${email}: the gating account must be an @example.com address.`);
  process.exit(1);
}

const STAGES = ["reset", "trial", "lapse", "paid", "status"] as const;
type Stage = (typeof STAGES)[number];
const stage = process.argv[2] as Stage;
if (!STAGES.includes(stage)) {
  console.error(`Usage: npx tsx testScripts/gating-user.ts <${STAGES.join("|")}>`);
  process.exit(1);
}

const { prisma } = await import("../src/services/prisma");
const { BCRYPT_ROUNDS } = await import("../src/lib/constants/security");
const { DAY_MS } = await import("../src/lib/constants/time");
const { ITEMS_PER_PAGE } = await import("../src/lib/constants/limits");

const ITEM_COUNT = 49;
const COLLECTIONS = ["Gating Alpha", "Gating Beta", "Gating Gamma"];
const KINDS = ["snippet", "note", "command", "prompt", "link"] as const;
const SNIPPET_COUNT = ITEMS_PER_PAGE + 1;
const OTHER_KINDS = KINDS.slice(1);
const kindFor = (n: number) =>
  n <= SNIPPET_COUNT ? "snippet" : OTHER_KINDS[(n - SNIPPET_COUNT - 1) % OTHER_KINDS.length];

const findUser = () =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });

const requireUser = async () => {
  const user = await findUser();
  if (!user) {
    console.error(`No user ${email}. Run the reset stage first.`);
    process.exit(1);
  }
  return user;
};

/** Deletes every object under the user's folder; the rows go with the user. */
const deleteStoredFiles = async (userId: string) => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.warn("R2 settings missing: stored files, if any, are left in the bucket.");
    return;
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  const listed = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: `users/${userId}/` }));
  const keys = (listed.Contents ?? []).flatMap((object) => (object.Key ? [{ Key: object.Key }] : []));
  if (keys.length > 0) await s3.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET_NAME, Delete: { Objects: keys } }));
  console.log(`Deleted ${keys.length} stored file(s).`);
};

const reset = async () => {
  const existing = await findUser();
  if (existing) {
    await deleteStoredFiles(existing.id);
    // Cascades to items, collections, tags and periods.
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const types = await prisma.itemType.findMany({
    where: { isSystem: true, userId: null, name: { in: [...KINDS] } },
    select: { id: true, name: true },
  });
  const typeId = (name: string) => {
    const type = types.find((row) => row.name === name);
    if (!type) throw new Error(`System type ${name} is missing; run the seed first.`);
    return type.id;
  };

  // One minute apart, oldest first.
  const start = Date.now() - ITEM_COUNT * 60_000;
  const at = (n: number) => new Date(start + n * 60_000);

  // Before the transaction: a 12-round hash would eat into its 5 s timeout.
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: "Gating Test",
        emailVerified: new Date(),
        passwordHash,
      },
      select: { id: true },
    });

    const collections = await Promise.all(
      COLLECTIONS.map((name) =>
        tx.collection.create({
          data: { userId: user.id, name, slug: name.toLowerCase().replace(/\s+/g, "-") },
          select: { id: true },
        }),
      ),
    );

    for (let n = 1; n <= ITEM_COUNT; n++) {
      const kind = kindFor(n);
      await tx.item.create({
        data: {
          userId: user.id,
          typeId: typeId(kind),
          title: `Gating ${kind} ${String(n).padStart(2, "0")}`,
          content: kind === "link" ? null : `${kind} body ${n}`,
          language: kind === "snippet" ? "typescript" : null,
          url: kind === "link" ? `https://example.com/gating/${n}` : null,
          createdAt: at(n),
          updatedAt: at(n),
          // Every third item sits in a collection, spread across the three.
          ...(n % 3 === 0 && {
            collections: { create: { collectionId: collections[(n / 3) % collections.length].id } },
          }),
        },
      });
    }
  });
  console.log(
    `Reset ${email}: Free, ${COLLECTIONS.length} collections, ${ITEM_COUNT} items (${SNIPPET_COUNT} snippets).`,
  );
};

const trial = async () => {
  const { id } = await requireUser();
  const now = Date.now();
  await prisma.subscriptionPeriod.create({
    data: {
      userId: id,
      status: "PAID",
      vendor: null,
      interval: "MONTH",
      periodStart: new Date(now),
      periodEnd: new Date(now + 14 * DAY_MS),
    },
  });
  console.log("Added a granted trial period ending in 14 days.");
};

const lapse = async () => {
  const { id } = await requireUser();
  const now = Date.now();
  const { count } = await prisma.subscriptionPeriod.updateMany({
    where: { userId: id, vendor: null },
    data: { periodStart: new Date(now - 17 * DAY_MS), periodEnd: new Date(now - 3 * DAY_MS) },
  });
  console.log(`Ended ${count} granted period(s) 3 days ago.`);
};

const paid = async () => {
  const { id } = await requireUser();
  const now = Date.now();
  await prisma.subscriptionPeriod.create({
    data: {
      userId: id,
      status: "PAID",
      vendor: null,
      interval: "YEAR",
      periodStart: new Date(now),
      periodEnd: new Date(now + 365 * DAY_MS),
    },
  });
  console.log("Added a granted yearly period ending in a year.");
};

const status = async () => {
  const { id } = await requireUser();
  const [items, files, collections, periods] = await Promise.all([
    prisma.item.count({ where: { userId: id } }),
    prisma.item.findMany({
      where: { userId: id, fileKey: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, mimeType: true },
    }),
    prisma.collection.count({ where: { userId: id } }),
    prisma.subscriptionPeriod.findMany({
      where: { userId: id },
      orderBy: { createdAt: "asc" },
      select: { status: true, vendor: true, interval: true, periodEnd: true },
    }),
  ]);
  console.log(`${email}: ${items} items (${files.length} with a file), ${collections} collections`);
  // Ids to open as /api/items/<id>/file.
  for (const file of files) console.log(`  file ${file.id} ${file.mimeType} "${file.title}"`);
  for (const period of periods) {
    const end = period.periodEnd?.toISOString() ?? "no end";
    console.log(`  ${period.status} ${period.vendor ?? "granted"} ${period.interval} ends ${end}`);
  }
  if (periods.length === 0) console.log("  no periods (Free)");
};

const run: Record<Stage, () => Promise<void>> = { reset, trial, lapse, paid, status };
await run[stage]();
if (stage !== "status") await status();
await prisma.$disconnect();
