// Read-only smoke test for the Neon database.
// Run: npm run db:test
import "dotenv/config";

// Checked before the client is imported: src/services/prisma.ts reads
// DATABASE_URL at module load, and a missing URL there fails far less clearly.
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env (see CLAUDE.md).");
  process.exit(1);
}

const { prisma } = await import("../src/services/prisma");
const { liveSince } = await import("../src/lib/billing/plan-rules");

const UUID = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

const check = async (label: string, run: () => Promise<unknown>) => {
  const start = performance.now();
  try {
    const result = await run();
    const ms = Math.round(performance.now() - start);
    console.log(`✔ ${label} (${ms}ms)`, result ?? "");
    return true;
  } catch (error) {
    console.error(`✘ ${label}`, error instanceof Error ? error.message : error);
    return false;
  }
};

const results = [
  await check("connect", async () => {
    const [row] = await prisma.$queryRaw<{ db: string; version: string }[]>`
      select current_database()::text as db, version()::text as version`;
    return { db: row.db, postgres: row.version.split(" ")[1] };
  }),

  await check("row counts", async () => ({
    users: await prisma.user.count(),
    itemTypes: await prisma.itemType.count(),
    collections: await prisma.collection.count(),
    items: await prisma.item.count(),
    tags: await prisma.tag.count(),
  })),

  await check("all ids are UUIDs", async () => {
    // Postgres regex; `!~*` is case-insensitive "does not match".
    const rows = await prisma.$queryRaw<{ table: string; bad: number }[]>`
      select 'User' as table, count(*)::int as bad from "User" where id !~* ${UUID}
      union all select 'ItemType', count(*)::int from "ItemType" where id !~* ${UUID}
      union all select 'Collection', count(*)::int from "Collection" where id !~* ${UUID}
      union all select 'Tag', count(*)::int from "Tag" where id !~* ${UUID}
      union all select 'Item', count(*)::int from "Item" where id !~* ${UUID}`;
    const bad = rows.filter((row) => row.bad > 0);
    if (bad.length) {
      throw new Error(
        `non-UUID ids: ${bad.map((row) => `${row.table} ${row.bad}`).join(", ")}`,
      );
    }
    return "5 tables checked";
  }),

  await check("system item types", async () => {
    const types = await prisma.itemType.findMany({
      where: { isSystem: true, userId: null },
      select: { name: true, color: true },
      orderBy: { name: "asc" },
    });
    return types.map((type) => `${type.name} ${type.color}`).join(", ");
  }),

  await check("user with relations", async () => {
    const user = await prisma.user.findFirst({
      select: {
        email: true,
        // The plan's source: a live PAID period, as getCurrentUser() reads it.
        subscriptionPeriods: {
          where: { status: "PAID", periodEnd: { gte: liveSince() } },
          orderBy: [{ periodEnd: "desc" }],
          take: 1,
          select: { vendor: true, interval: true, periodEnd: true },
        },
        _count: { select: { items: true, collections: true, tags: true } },
      },
    });
    return user ?? "no users — run `npx prisma db seed`";
  }),

  await check("pinned items (join through type + tags)", async () => {
    const items = await prisma.item.findMany({
      where: { isPinned: true },
      select: {
        title: true,
        type: { select: { name: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    return items.map(
      (item) =>
        `${item.title} [${item.type.name}] #${item.tags.map(({ tag }) => tag.name).join(" #")}`,
    );
  }),
];

await prisma.$disconnect();

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failed ? 1 : 0;
