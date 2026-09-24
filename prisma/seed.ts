import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  MOCK_COLLECTIONS,
  MOCK_ITEM_TYPES,
  MOCK_ITEMS,
  MOCK_USER,
} from "../src/lib/mock-data";

// Seeds the 7 system item types plus a demo user whose content mirrors
// src/lib/mock-data.ts. Safe to re-run: every write is an upsert keyed on a
// stable id, so a second run updates rows in place instead of duplicating.
//
// Mock ids (type_snippet, item_use_auth_hook, ...) are reused as primary
// keys so the dashboard can switch from mock data to queries without the
// ids changing. When mock-data.ts is retired, move this data in here.

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const MIME_TYPES: Record<string, string> = {
  md: "text/markdown",
  png: "image/png",
};

const mimeTypeOf = (fileName: string) =>
  MIME_TYPES[fileName.split(".").pop() ?? ""] ?? "application/octet-stream";

// Mock data stores a full URL; the schema stores the R2 object key.
const fileKeyOf = (fileUrl: string) => new URL(fileUrl).pathname.slice(1);

// Upserting by id rather than by @@unique([userId, name]) also sidesteps the
// NULL-userId uniqueness gap documented on ItemType in schema.prisma.
const seedItemTypes = () =>
  Promise.all(
    MOCK_ITEM_TYPES.map(({ id, name, label, icon, color }) => {
      const data = { name, label, icon, color, isSystem: true, userId: null };
      return prisma.itemType.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }),
  );

const seedUser = () => {
  const { id, name, email, image, plan } = MOCK_USER;
  const data = { name, email, image, plan, emailVerified: new Date() };
  return prisma.user.upsert({
    where: { id },
    update: data,
    create: { id, ...data },
  });
};

const seedCollections = (userId: string) =>
  Promise.all(
    MOCK_COLLECTIONS.map(({ id, name, slug, description, isFavorite }) => {
      const data = { name, slug, description, isFavorite, userId };
      return prisma.collection.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }),
  );

// Tags only exist as strings on mock items; derive one row per distinct tag.
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

const seedItems = (userId: string, tagIds: Map<string, string>) =>
  Promise.all(
    MOCK_ITEMS.map((item) => {
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
        typeId: item.itemTypeId,
        userId,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      };
      const tags = item.tags.map((name) => ({ tagId: tagIds.get(name)! }));
      const collections = item.collectionIds.map((collectionId) => ({
        collectionId,
      }));

      // On update, replace the join rows so a re-run matches mock data
      // exactly, including tags or collections that were removed from it.
      return prisma.item.upsert({
        where: { id: item.id },
        update: {
          ...data,
          tags: { deleteMany: {}, create: tags },
          collections: { deleteMany: {}, create: collections },
        },
        create: {
          id: item.id,
          ...data,
          tags: { create: tags },
          collections: { create: collections },
        },
      });
    }),
  );

const main = async () => {
  const types = await seedItemTypes();
  const user = await seedUser();
  const collections = await seedCollections(user.id);
  const tagIds = await seedTags(user.id);
  const items = await seedItems(user.id, tagIds);

  console.log(
    `Seeded ${types.length} item types, 1 user, ${collections.length} collections, ` +
      `${tagIds.size} tags, ${items.length} items.`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
