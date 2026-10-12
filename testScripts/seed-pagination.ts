// Adds 40 items and 40 collections to one account, to page through.
// Run: npx tsx testScripts/seed-pagination.ts <email>
// Development branch only (`.env`). Run it once: it stops if the data is there.
//
// Items: 25 snippets (two pages of /items/snippets), 10 notes, 5 links.
// Collections: "Pagination test 01".."40"; the first holds 30 of the items
// (two pages of /collections/pagination-test-01).
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env (see CLAUDE.md).");
  process.exit(1);
}

const email = process.argv[2] ?? process.env.TEST_USER_EMAIL;
if (!email) {
  console.error("Usage: npx tsx testScripts/seed-pagination.ts <email>");
  process.exit(1);
}

const { prisma } = await import("../src/services/prisma");

const PREFIX = "Pagination test";
const SLUG_PREFIX = "pagination-test";
const pad = (n: number) => String(n).padStart(2, "0");

const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
if (!user) {
  console.error(`No user with email ${email}.`);
  process.exit(1);
}

const existing = await prisma.collection.count({ where: { userId: user.id, slug: { startsWith: SLUG_PREFIX } } });
if (existing > 0) {
  console.log(`Already seeded (${existing} ${PREFIX} collections). Nothing to do.`);
  process.exit(0);
}

const types = await prisma.itemType.findMany({
  where: { isSystem: true, name: { in: ["snippet", "note", "link"] } },
  select: { id: true, name: true },
});
const typeId = (name: string) => {
  const type = types.find((row) => row.name === name);
  if (!type) throw new Error(`System type ${name} is missing; run the seed first.`);
  return type.id;
};

// One minute apart, oldest first, so newest-first order is easy to check.
const start = Date.now() - 60 * 60_000;
const at = (n: number) => new Date(start + n * 60_000);

const kindFor = (n: number) => (n <= 25 ? "snippet" : n <= 35 ? "note" : "link");

const items = Array.from({ length: 40 }, (_, index) => {
  const n = index + 1;
  const kind = kindFor(n);
  return {
    userId: user.id,
    typeId: typeId(kind),
    title: `${PREFIX} ${kind} ${pad(n)}`,
    description: `Item ${n} of 40, for checking pagination.`,
    content: kind === "link" ? null : `${kind} body ${n}`,
    language: kind === "snippet" ? "typescript" : null,
    url: kind === "link" ? `https://example.com/pagination/${n}` : null,
    createdAt: at(n),
    updatedAt: at(n),
  };
});

const collections = Array.from({ length: 40 }, (_, index) => {
  const n = index + 1;
  return {
    userId: user.id,
    name: `${PREFIX} ${pad(n)}`,
    slug: `${SLUG_PREFIX}-${pad(n)}`,
    description: `Collection ${n} of 40, for checking pagination.`,
    createdAt: at(n),
    updatedAt: at(n),
  };
});

await prisma.$transaction(async (tx) => {
  await tx.item.createMany({ data: items });
  await tx.collection.createMany({ data: collections });

  const [first] = await tx.collection.findMany({
    where: { userId: user.id, slug: `${SLUG_PREFIX}-01` },
    select: { id: true },
  });
  const linked = await tx.item.findMany({
    where: { userId: user.id, title: { startsWith: PREFIX } },
    orderBy: { title: "asc" },
    take: 30,
    select: { id: true },
  });
  await tx.collectionItem.createMany({ data: linked.map((item) => ({ collectionId: first.id, itemId: item.id })) });
});

console.log(`Added 40 items and 40 collections to ${email}; ${PREFIX} 01 holds 30 items.`);
await prisma.$disconnect();
