import { Prisma } from "@/generated/prisma/client";

/**
 * An in-memory stand-in for the slice of Prisma the account code uses, so
 * tests check what ends up stored rather than which calls were made. It keeps
 * the two database rules that matter here:
 * - `User` deletes cascade to the user's items, collections and custom types.
 * - `Item.typeId` is ON DELETE RESTRICT, checked immediately: deleting a user
 *   whose custom types still have items fails, as it can in Postgres.
 * Items hold their tags by name; `db.tags` holds the `Tag` rows an item edit
 * connects or creates, unique on `[userId, slug]` as in the schema.
 */

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string | null;
  createdAt: Date;
  image?: string | null;
  plan?: "FREE" | "PRO";
  stripeCustomerId?: string | null;
  preferredTheme?: string;
  preferredFontSize?: number;
  emailVerified?: Date | null;
  /** Prisma's default is 0; rows that leave it out read back as 0. */
  sessionVersion?: number;
}
interface ItemTypeRow {
  id: string;
  userId: string | null;
  name?: string;
  label?: string;
  icon?: string | null;
  color?: string;
  isSystem?: boolean;
  createdAt?: Date;
}
interface ItemRow {
  id: string;
  userId: string;
  typeId: string;
  title?: string;
  description?: string | null;
  content?: string | null;
  language?: string | null;
  url?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  collectionIds?: string[];
}
interface TagRow {
  id: string;
  userId: string;
  name: string;
  slug: string;
}
interface CollectionRow {
  id: string;
  userId: string;
  name?: string;
  slug?: string;
  description?: string | null;
  isFavorite?: boolean;
  updatedAt?: Date;
}
interface VerificationTokenRow {
  identifier: string;
  token: string;
  expires?: Date;
}
interface PasswordResetTokenRow {
  email: string;
  token: string;
  expires?: Date;
}

export const db = {
  users: [] as UserRow[],
  itemTypes: [] as ItemTypeRow[],
  items: [] as ItemRow[],
  collections: [] as CollectionRow[],
  tags: [] as TagRow[],
  verificationTokens: [] as VerificationTokenRow[],
  passwordResetTokens: [] as PasswordResetTokenRow[],
  /** When set, every query rejects, like an unreachable database. */
  down: false,
};

export const resetDb = () => {
  db.users = [];
  db.itemTypes = [];
  db.items = [];
  db.collections = [];
  db.tags = [];
  db.verificationTokens = [];
  db.passwordResetTokens = [];
  db.down = false;
};

const query = async <T>(run: () => T): Promise<T> => {
  if (db.down) throw new Error("Can't reach database server");
  return run();
};

type Select = Record<string, boolean>;

// Like Prisma, a selected column the row lacks comes back as null.
const pick = <Row extends object>(row: Row, select?: Select) =>
  select
    ? Object.fromEntries(
        Object.keys(select).map((key) => [key, (row as Record<string, unknown>)[key] ?? null]),
      )
    : { ...row };

type OrderBy = Record<string, "asc" | "desc">[];

const compareBy = (orderBy: OrderBy) => (a: object, b: object) => {
  for (const order of orderBy) {
    const [key, direction] = Object.entries(order)[0];
    const left = (a as Record<string, unknown>)[key] as string | number | Date;
    const right = (b as Record<string, unknown>)[key] as string | number | Date;
    if (left < right) return direction === "asc" ? -1 : 1;
    if (left > right) return direction === "asc" ? 1 : -1;
  }
  return 0;
};

const findUser = (id: string) => db.users.find((user) => user.id === id);

// Column defaults the schema fills in, so a row read back looks like Postgres's.
const withDefaults = (user: UserRow): UserRow => ({ sessionVersion: 0, ...user });

type UserData = { [K in keyof UserRow]?: UserRow[K] | { increment: number } };

// Writes `data` into the row, applying `{ increment }` the way Prisma does.
const applyUserData = (user: UserRow, data: UserData) => {
  const row = user as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === "object" && "increment" in value) {
      const current = (withDefaults(user) as unknown as Record<string, number>)[key] ?? 0;
      row[key] = current + value.increment;
    } else {
      row[key] = value;
    }
  }
};

// The type slice items carry, as the item and collection selects nest it.
const rowType = ({ id, name, label, icon, color }: ItemTypeRow) => ({ id, name, label, icon, color });

type ItemSelect = Select & { tags?: { orderBy?: unknown }; collections?: { orderBy?: unknown } };

/**
 * One item in the shape the item select asks for: the type, tag and
 * collection relations nested as Prisma nests them. Collections come from the
 * item's `collectionIds`.
 */
const shapeItem = (row: ItemRow, select: ItemSelect) => {
  const type = db.itemTypes.find((itemType) => itemType.id === row.typeId);
  const tags = [...(row.tags ?? [])];
  if (select.tags?.orderBy) tags.sort();
  const collections = (row.collectionIds ?? [])
    .map((id) => db.collections.find((collection) => collection.id === id))
    .filter((collection) => collection !== undefined)
    .map(({ id, name }) => ({ collection: { id, name: name ?? null } }));
  if (select.collections?.orderBy) {
    collections.sort((a, b) => (a.collection.name ?? "").localeCompare(b.collection.name ?? ""));
  }
  return pick(
    {
      ...row,
      type: type && rowType(type),
      tags: tags.map((name) => ({ tag: { name } })),
      collections,
    },
    select as Select,
  );
};

// Prisma's error for a write whose `where` matched nothing.
const recordNotFound = () =>
  new Prisma.PrismaClientKnownRequestError("No record was found for an update.", {
    code: "P2025",
    clientVersion: "fake",
  });

type TagConnectOrCreate = {
  where: { userId_slug: { userId: string; slug: string } };
  create: { userId: string; name: string; slug: string };
};

/**
 * The item edit's write: scalar fields, and tags replaced through
 * `{ deleteMany: {}, create: [{ tag: { connectOrCreate } }] }`, the only
 * nested tag write the code makes.
 */
type ItemUpdateData = {
  [K in "title" | "description" | "content" | "language" | "url"]?: ItemRow[K];
} & {
  tags?: { deleteMany?: Record<string, never>; create: { tag: { connectOrCreate: TagConnectOrCreate } }[] };
};

// The user's tag with that slug, created if there is none; returns its name.
const connectOrCreateTag = ({ where, create }: TagConnectOrCreate) => {
  const { userId, slug } = where.userId_slug;
  let tag = db.tags.find((row) => row.userId === userId && row.slug === slug);
  if (!tag) {
    tag = { id: `tag-${db.tags.length + 1}`, ...create };
    db.tags.push(tag);
  }
  return tag.name;
};

// The interactive form gets the fake itself as `tx`. Unlike Prisma, neither
// form rolls back, so failure tests use `db.down` rather than a mid-transaction error.
const transaction = (
  operations: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
): Promise<unknown> =>
  typeof operations === "function" ? operations(fakePrisma) : Promise.all(operations);

export const fakePrisma = {
  user: {
    findUnique: ({ where, select }: { where: { id: string }; select?: Select }) =>
      query(() => {
        const user = findUser(where.id);
        return user ? pick(withDefaults(user), select) : null;
      }),
    // Only the case-insensitive email lookup that register and sign-in use.
    findFirst: ({
      where,
      select,
    }: {
      where: { email: { equals: string; mode: "insensitive" } };
      select?: Select;
    }) =>
      query(() => {
        const email = where.email.equals.toLowerCase();
        const user = db.users.find((row) => row.email.toLowerCase() === email);
        return user ? pick(withDefaults(user), select) : null;
      }),
    // Like the unique index on email: case-sensitive.
    create: ({ data, select }: { data: Omit<UserRow, "id" | "createdAt">; select?: Select }) =>
      query(() => {
        if (db.users.some((row) => row.email === data.email)) {
          throw new Error("Unique constraint failed on the fields: (`email`)");
        }
        const user: UserRow = {
          id: `user-${db.users.length + 1}`,
          createdAt: new Date(),
          emailVerified: null,
          ...data,
        };
        db.users.push(user);
        return pick(withDefaults(user), select);
      }),
    findUniqueOrThrow: ({ where, select }: { where: { id: string }; select?: Select }) =>
      query(() => {
        const user = findUser(where.id);
        if (!user) throw new Error("No User found");
        return pick(user, select);
      }),
    update: ({ where, data }: { where: { id: string }; data: UserData }) =>
      query(() => {
        const user = findUser(where.id);
        if (!user) throw new Error("Record to update not found");
        applyUserData(user, data);
        return withDefaults(user);
      }),
    // `where` matches on email, and on `emailVerified: null` when given.
    updateMany: ({
      where,
      data,
    }: {
      where: { email: string; emailVerified?: null };
      data: UserData;
    }) =>
      query(() => {
        const matches = db.users.filter(
          (row) =>
            row.email === where.email &&
            (where.emailVerified === undefined || (row.emailVerified ?? null) === null),
        );
        for (const user of matches) applyUserData(user, data);
        return { count: matches.length };
      }),
    delete: ({ where }: { where: { id: string } }) =>
      query(() => {
        const user = findUser(where.id);
        if (!user) throw new Error("Record to delete does not exist");
        const customTypeIds = new Set(
          db.itemTypes.filter((type) => type.userId === user.id).map((type) => type.id),
        );
        if (db.items.some((item) => customTypeIds.has(item.typeId))) {
          throw new Error('violates RESTRICT setting of foreign key constraint "Item_typeId_fkey"');
        }
        db.users = db.users.filter((row) => row.id !== user.id);
        db.items = db.items.filter((row) => row.userId !== user.id);
        db.collections = db.collections.filter((row) => row.userId !== user.id);
        db.itemTypes = db.itemTypes.filter((row) => row.userId !== user.id);
        return { ...user };
      }),
  },
  itemType: {
    findMany: ({
      where,
      orderBy = [],
      select,
    }: {
      where: Partial<Pick<ItemTypeRow, "isSystem" | "userId">>;
      orderBy?: OrderBy;
      select?: Select;
    }) =>
      query(() =>
        db.itemTypes
          .filter((row) =>
            Object.entries(where).every(([key, value]) => row[key as keyof ItemTypeRow] === value),
          )
          .sort(compareBy(orderBy))
          .map((row) => pick(row, select)),
      ),
    findFirst: ({
      where,
      select,
    }: {
      where: Partial<Pick<ItemTypeRow, "name" | "isSystem" | "userId">>;
      select?: Select;
    }) =>
      query(() => {
        const row = db.itemTypes.find((type) =>
          Object.entries(where).every(([key, value]) => type[key as keyof ItemTypeRow] === value),
        );
        return row ? pick(row, select) : null;
      }),
  },
  item: {
    /**
     * Returns rows in the shape the item select asks for: the type and tag
     * relations nested as Prisma nests them. Honours `where` (userId,
     * isPinned, typeId), `orderBy`, `take`, and top-level `select` keys, so a field
     * the code doesn't select never comes back.
     */
    findMany: ({
      where,
      orderBy = [],
      take,
      select,
    }: {
      where: { userId: string; isPinned?: boolean; typeId?: string };
      orderBy?: OrderBy;
      take?: number;
      select: ItemSelect;
    }) =>
      query(() =>
        db.items
          .filter(
            (row) =>
              row.userId === where.userId &&
              (where.isPinned === undefined || Boolean(row.isPinned) === where.isPinned) &&
              (where.typeId === undefined || row.typeId === where.typeId),
          )
          .sort(compareBy(orderBy))
          .slice(0, take ?? Infinity)
          .map((row) => shapeItem(row, select)),
      ),
    // Only the owner-scoped lookup by id the detail view uses.
    findFirst: ({ where, select }: { where: { id: string; userId: string }; select: ItemSelect }) =>
      query(() => {
        // Prisma rejects a non-string id before querying.
        if (typeof where.id !== "string") throw new Error("Argument `id`: Expected String");
        const row = db.items.find((item) => item.id === where.id && item.userId === where.userId);
        return row ? shapeItem(row, select) : null;
      }),
    // Scoped by `{ id, userId }`, as the edit writes it. Like Prisma, an
    // `undefined` field is left alone, and `@updatedAt` moves.
    update: ({
      where,
      data,
      select,
    }: {
      where: { id: string; userId: string };
      data: ItemUpdateData;
      select: ItemSelect;
    }) =>
      query(() => {
        const row = db.items.find((item) => item.id === where.id && item.userId === where.userId);
        if (!row) throw recordNotFound();
        const { tags, ...fields } = data;
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) (row as unknown as Record<string, unknown>)[key] = value;
        }
        if (tags) {
          // Without `deleteMany`, Prisma adds links alongside the old ones.
          const kept = tags.deleteMany ? [] : (row.tags ?? []);
          const added = tags.create.map(({ tag }) => connectOrCreateTag(tag.connectOrCreate));
          row.tags = [...new Set([...kept, ...added])];
        }
        row.updatedAt = new Date();
        return shapeItem(row, select);
      }),
    groupBy: ({ where }: { by: ["typeId"]; where: { userId: string } }) =>
      query(() => {
        const counts = new Map<string, number>();
        for (const item of db.items) {
          if (item.userId === where.userId) {
            counts.set(item.typeId, (counts.get(item.typeId) ?? 0) + 1);
          }
        }
        return [...counts].map(([typeId, all]) => ({ typeId, _count: { _all: all } }));
      }),
    count: ({ where }: { where: { userId: string; isFavorite?: boolean } }) =>
      query(
        () =>
          db.items.filter(
            (row) =>
              row.userId === where.userId &&
              (where.isFavorite === undefined || Boolean(row.isFavorite) === where.isFavorite),
          ).length,
      ),
    deleteMany: ({ where }: { where: { userId: string } }) =>
      query(() => {
        const before = db.items.length;
        db.items = db.items.filter((row) => row.userId !== where.userId);
        return { count: before - db.items.length };
      }),
  },
  collection: {
    /**
     * Membership comes from the fake items' `collectionIds`; `items` returns
     * one join row per member with its type, as the collection select nests it.
     */
    findMany: ({ where, select }: { where?: { userId?: string }; select?: Select }) =>
      query(() =>
        db.collections
          // An absent filter matches every row, as in Prisma.
          .filter((row) => where?.userId === undefined || row.userId === where.userId)
          .map((row) =>
            pick(
              {
                ...row,
                items: db.items
                  .filter((item) => item.collectionIds?.includes(row.id))
                  .map((item) => {
                    const type = db.itemTypes.find((itemType) => itemType.id === item.typeId);
                    return {
                      item: {
                        type: type && rowType(type),
                      },
                    };
                  }),
              },
              select,
            ),
          ),
      ),
  },
  verificationToken: {
    findUnique: ({ where }: { where: { token: string } }) =>
      query(() => {
        const row = db.verificationTokens.find((token) => token.token === where.token);
        return row ? { ...row } : null;
      }),
    // Newest by `expires` when ordered that way, as the resend cooldown asks.
    findFirst: ({
      where,
      orderBy,
      select,
    }: {
      where: { identifier: string };
      orderBy?: Record<string, "asc" | "desc">;
      select?: Select;
    }) =>
      query(() => {
        const row = db.verificationTokens
          .filter((token) => token.identifier === where.identifier)
          .sort(compareBy(orderBy ? [orderBy] : []))[0];
        return row ? pick(row, select) : null;
      }),
    // Like the unique index on token.
    create: ({ data }: { data: Required<VerificationTokenRow> }) =>
      query(() => {
        if (db.verificationTokens.some((row) => row.token === data.token)) {
          throw new Error("Unique constraint failed on the fields: (`token`)");
        }
        db.verificationTokens.push({ ...data });
        return { ...data };
      }),
    // By identifier or by token, whichever `where` names.
    deleteMany: ({ where }: { where: { identifier: string } | { token: string } }) =>
      query(() => {
        const before = db.verificationTokens.length;
        db.verificationTokens = db.verificationTokens.filter((row) =>
          "identifier" in where ? row.identifier !== where.identifier : row.token !== where.token,
        );
        return { count: before - db.verificationTokens.length };
      }),
  },
  passwordResetToken: {
    findUnique: ({ where }: { where: { token: string } }) =>
      query(() => {
        const row = db.passwordResetTokens.find((token) => token.token === where.token);
        return row ? { ...row } : null;
      }),
    // By email or by token, whichever `where` names.
    deleteMany: ({ where }: { where: { email: string } | { token: string } }) =>
      query(() => {
        const before = db.passwordResetTokens.length;
        db.passwordResetTokens = db.passwordResetTokens.filter((row) =>
          "email" in where ? row.email !== where.email : row.token !== where.token,
        );
        return { count: before - db.passwordResetTokens.length };
      }),
  },
  $transaction: transaction,
};
