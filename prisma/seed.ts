import "dotenv/config";
import { prisma } from "../src/services/prisma";
import { slugify } from "../src/lib/helpers/slugify";
import {
  MOCK_COLLECTIONS,
  MOCK_GRANTED_PERIOD,
  MOCK_ITEM_TYPES,
  MOCK_ITEMS,
  MOCK_USER,
} from "./seed-data";

// Seeds the 7 system item types plus a demo user from ./seed-data.ts. Ids
// are UUIDs from the schema default; the data file's ids
// (type_snippet, col_react_patterns, ...) are only used to wire mock rows to
// each other and never reach the database.
//
// Safe to re-run: rows are matched on natural keys (email, type name, slug,
// item title) and updated in place instead of duplicated.

const MIME_TYPES: Record<string, string> = {
  md: "text/markdown",
  png: "image/png",
};

const mimeTypeOf = (fileName: string) =>
  MIME_TYPES[fileName.split(".").pop() ?? ""] ?? "application/octet-stream";

// Mock data stores a full URL; the schema stores the R2 object key.
const fileKeyOf = (fileUrl: string) => new URL(fileUrl).pathname.slice(1);

// Returns mock type id -> database id.
//
// System types have userId = null, and Prisma can't upsert on a compound
// unique containing null (see the note on ItemType in schema.prisma), so
// this is find-then-write.
const seedItemTypes = async () => {
  const ids = new Map<string, string>();
  for (const { id: mockId, name, label, icon, color } of MOCK_ITEM_TYPES) {
    const data = { name, label, icon, color, isSystem: true };
    const existing = await prisma.itemType.findFirst({
      where: { name, userId: null },
      select: { id: true },
    });
    const type = existing
      ? await prisma.itemType.update({ where: { id: existing.id }, data })
      : await prisma.itemType.create({ data });
    ids.set(mockId, type.id);
  }
  return ids;
};

const seedUser = () => {
  const { name, email, image } = MOCK_USER;
  const data = { name, image, emailVerified: new Date() };
  return prisma.user.upsert({
    where: { email },
    update: data,
    create: { email, ...data },
  });
};

// The demo user is Pro through a granted period (no vendor), so Pro comes
// from the same rule as a paid one. Periods have no natural key, so this is
// find-then-write on the user's granted row.
const seedGrantedPeriod = async (userId: string) => {
  const { interval, periodStart, periodEnd } = MOCK_GRANTED_PERIOD;
  const data = { interval, periodStart: new Date(periodStart), periodEnd: new Date(periodEnd) };
  const existing = await prisma.subscriptionPeriod.findFirst({
    where: { userId, vendor: null, status: 'PAID' },
    select: { id: true },
  });
  return existing
    ? prisma.subscriptionPeriod.update({ where: { id: existing.id }, data })
    : prisma.subscriptionPeriod.create({ data: { userId, status: 'PAID', ...data } });
};

// Returns mock collection id -> database id.
const seedCollections = async (userId: string) => {
  const collections = await Promise.all(
    MOCK_COLLECTIONS.map(({ name, slug, description, isFavorite }) => {
      const data = { name, description, isFavorite };
      return prisma.collection.upsert({
        where: { userId_slug: { userId, slug } },
        update: data,
        create: { slug, userId, ...data },
      });
    }),
  );
  return new Map(MOCK_COLLECTIONS.map((mock, i) => [mock.id, collections[i].id]));
};

// Tags only exist as strings on mock items; derive one row per distinct tag.
// Returns tag name -> database id.
const seedTags = async (userId: string) => {
  const names = [...new Set(MOCK_ITEMS.flatMap((item) => item.tags))];
  const tags = await Promise.all(
    names.map((name) => {
      const slug = slugify(name);
      return prisma.tag.upsert({
        where: { userId_slug: { userId, slug } },
        update: { name },
        create: { name, slug, userId },
      });
    }),
  );
  return new Map(tags.map((tag) => [tag.name, tag.id]));
};

// Items have no unique column, so they're matched on (userId, title), the
// closest thing mock data has to a natural key. Renaming a mock item
// therefore creates a new row on the next run instead of updating the old one.
const seedItems = (
  userId: string,
  typeIds: Map<string, string>,
  collectionIds: Map<string, string>,
  tagIds: Map<string, string>,
) =>
  Promise.all(
    MOCK_ITEMS.map(async (item) => {
      const data = {
        title: item.title,
        description: item.description,
        content: item.content,
        language: item.language,
        url: item.url,
        fileKey: item.fileUrl ? fileKeyOf(item.fileUrl) : null,
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.fileName ? mimeTypeOf(item.fileName) : null,
        isPinned: item.isPinned,
        isFavorite: item.isFavorite,
        typeId: typeIds.get(item.itemTypeId)!,
        userId,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      };
      const tags = item.tags.map((name) => ({ tagId: tagIds.get(name)! }));
      const collections = item.collectionIds.map((mockId) => ({
        collectionId: collectionIds.get(mockId)!,
      }));

      const existing = await prisma.item.findFirst({
        where: { userId, title: item.title },
        select: { id: true },
      });

      // On update, replace the join rows so a re-run matches mock data
      // exactly, including tags or collections that were removed from it.
      return existing
        ? prisma.item.update({
            where: { id: existing.id },
            data: {
              ...data,
              tags: { deleteMany: {}, create: tags },
              collections: { deleteMany: {}, create: collections },
            },
          })
        : prisma.item.create({
            data: {
              ...data,
              tags: { create: tags },
              collections: { create: collections },
            },
          });
    }),
  );

const main = async () => {
  const typeIds = await seedItemTypes();
  const user = await seedUser();
  await seedGrantedPeriod(user.id);
  const collectionIds = await seedCollections(user.id);
  const tagIds = await seedTags(user.id);
  const items = await seedItems(user.id, typeIds, collectionIds, tagIds);

  console.log(
    `Seeded ${typeIds.size} item types, 1 Pro user, ${collectionIds.size} collections, ` +
      `${tagIds.size} tags, ${items.length} items.`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
