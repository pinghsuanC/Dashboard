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
 * Collections are unique on `[userId, slug]` too: a clashing create throws
 * Prisma's `P2002`. Items hold their collection links as `collectionIds`,
 * written through the nested `collections` writes of item create and edit.
 * `SubscriptionPeriod` rows cascade from `User` and keep both uniques:
 * `stripeCheckoutSessionId`, and `[vendor, vendorSubscriptionId, periodEnd]`,
 * where a `NULL` never clashes, as in Postgres.
 */

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string | null;
  createdAt: Date;
  image?: string | null;
  /** Stored JSON in any shape: Postgres doesn't check it. */
  editorPreferences?: unknown;
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
  fileKey?: string | null;
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
interface SubscriptionPeriodRow {
  id: string;
  userId: string;
  /** The schema's default is PAID. */
  status?: "PENDING" | "PAID" | "EXPIRED";
  vendor?: "STRIPE" | null;
  vendorCustomerId?: string | null;
  vendorSubscriptionId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePriceId?: string | null;
  interval: "MONTH" | "YEAR";
  periodStart?: Date | null;
  periodEnd?: Date | null;
  /** Filled on create, as the schema's `now()` default does. */
  createdAt?: Date;
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
  subscriptionPeriods: [] as SubscriptionPeriodRow[],
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
  db.subscriptionPeriods = [];
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

type CollectionWhere = { userId?: string; id?: { in: string[] }; isFavorite?: boolean };

// An absent filter matches every row, as in Prisma.
const matchesCollection = (where?: CollectionWhere) => (row: CollectionRow) =>
  (where?.userId === undefined || row.userId === where.userId) &&
  (where?.id === undefined || where.id.in.includes(row.id)) &&
  (where?.isFavorite === undefined || Boolean(row.isFavorite) === where.isFavorite);

const findUser = (id: string) => db.users.find((user) => user.id === id);

// Column defaults the schema fills in, so a row read back looks like Postgres's.
const withDefaults = (user: UserRow): UserRow => ({ sessionVersion: 0, ...user });

// A column filter: a value matches equal, `{ not: null }` any non-null value.
type ColumnFilter<T> = T | { not: null };

type PeriodWhere = {
  id?: string;
  userId?: string;
  status?: SubscriptionPeriodRow["status"];
  vendor?: ColumnFilter<"STRIPE">;
  vendorCustomerId?: ColumnFilter<string>;
  vendorSubscriptionId?: string;
  stripeCheckoutSessionId?: ColumnFilter<string>;
  periodEnd?: { gte: Date } | Date;
};

const matchesColumn = <T>(filter: ColumnFilter<T> | undefined, value: T | null | undefined) => {
  if (filter === undefined) return true;
  if (filter !== null && typeof filter === "object" && "not" in filter) return value != null;
  return value === filter;
};

// A `periodEnd` filter: `{ gte }`, or an exact instant. A null `periodEnd`
// never passes either, as in SQL.
const matchesPeriodEnd = (filter: PeriodWhere["periodEnd"], value: Date | null | undefined) => {
  if (filter === undefined) return true;
  if (value == null) return false;
  return filter instanceof Date ? value.getTime() === filter.getTime() : value >= filter.gte;
};

// The period filters the code uses; one left out matches every row, as in
// Prisma. A null `id` is refused, as Prisma refuses null for a required column.
const matchesPeriod = (where: PeriodWhere = {}) => {
  if ((where.id as unknown) === null) throw new Error("Argument `id` must not be null.");
  return (row: SubscriptionPeriodRow) => matchesPeriodRow(where, row);
};

const matchesPeriodRow = (where: PeriodWhere, row: SubscriptionPeriodRow) =>
  (where.id === undefined || row.id === where.id) &&
  (where.userId === undefined || row.userId === where.userId) &&
  (where.status === undefined || (row.status ?? "PAID") === where.status) &&
  matchesColumn(where.vendor, row.vendor) &&
  matchesColumn(where.vendorCustomerId, row.vendorCustomerId) &&
  matchesColumn(where.vendorSubscriptionId, row.vendorSubscriptionId) &&
  matchesColumn(where.stripeCheckoutSessionId, row.stripeCheckoutSessionId) &&
  matchesPeriodEnd(where.periodEnd, row.periodEnd);

type PeriodQuery = {
  where?: PeriodWhere;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
  select?: Select;
  /** Keeps the first row of each combination of these columns, after ordering. */
  distinct?: (keyof SubscriptionPeriodRow)[];
};

const findPeriods = ({ where, orderBy = [], skip = 0, take, select, distinct }: PeriodQuery) => {
  const seen = new Set<string>();
  return db.subscriptionPeriods
    .filter(matchesPeriod(where))
    .sort(compareBy(orderBy))
    .filter((row) => {
      if (!distinct) return true;
      const key = JSON.stringify(distinct.map((column) => row[column] ?? null));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(skip, take === undefined ? undefined : skip + take)
    .map((row) => pick({ status: "PAID", ...row }, select));
};

/** A user select: columns, plus the filtered `subscriptionPeriods` relation. */
type UserSelect = { [column: string]: boolean | PeriodQuery | undefined; subscriptionPeriods?: PeriodQuery };

// The row in the shape `select` asks for, with the periods relation nested as
// Prisma nests it: only the user's rows, filtered, ordered and capped.
const shapeUser = (user: UserRow, select?: UserSelect) => {
  if (!select?.subscriptionPeriods) return pick(withDefaults(user), select as Select | undefined);
  const { subscriptionPeriods: relation, ...columns } = select;
  return {
    ...pick(withDefaults(user), columns as Select),
    subscriptionPeriods: findPeriods({ ...relation, where: { ...relation.where, userId: user.id } }),
  };
};

type UserData = { [K in keyof UserRow]?: UserRow[K] | { increment: number } };

// Writes `data` into the row, applying `{ increment }` the way Prisma does.
const applyUserData = (user: UserRow, data: UserData) => {
  const row = user as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === "object" && "increment" in value) {
      const current = (withDefaults(user) as unknown as Record<string, number>)[key] ?? 0;
      row[key] = current + (value as { increment: number }).increment;
    } else {
      row[key] = value;
    }
  }
};

type ItemWhere = {
  userId: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  typeId?: string;
  collections?: { some: { collectionId: string } };
};

// The item filters the loaders use; one left out matches every row, as in Prisma.
const matchesItem = (where: ItemWhere) => (row: ItemRow) =>
  row.userId === where.userId &&
  (where.isPinned === undefined || Boolean(row.isPinned) === where.isPinned) &&
  (where.isFavorite === undefined || Boolean(row.isFavorite) === where.isFavorite) &&
  (where.typeId === undefined || row.typeId === where.typeId) &&
  (where.collections === undefined || Boolean(row.collectionIds?.includes(where.collections.some.collectionId)));

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

// Prisma's error for a write that breaks a unique index.
const uniqueViolation = (target: string[]) =>
  new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on the fields: (${target.join(", ")})`, {
    code: "P2002",
    clientVersion: "fake",
    meta: { target },
  });

type TagConnectOrCreate = {
  where: { userId_slug: { userId: string; slug: string } };
  create: { userId: string; name: string; slug: string };
};

type CollectionLinks = {
  createMany: { data: { collectionId: string }[]; skipDuplicates?: boolean };
};

/**
 * The item edit's write: scalar fields, tags replaced through
 * `{ deleteMany: {}, create: [{ tag: { connectOrCreate } }] }`, and
 * collections through `{ deleteMany: { collectionId: { notIn } }, createMany }`,
 * the only nested writes the code makes.
 */
type ItemUpdateData = {
  [K in "title" | "description" | "content" | "language" | "url" | "isFavorite" | "isPinned" | "updatedAt"]?: ItemRow[K];
} & {
  tags?: { deleteMany?: Record<string, never>; create: { tag: { connectOrCreate: TagConnectOrCreate } }[] };
  collections?: CollectionLinks & { deleteMany?: { collectionId: { notIn: string[] } } };
};

// Like Prisma, a write naming a field the model doesn't have is rejected, so
// a stray key (such as `collectionIds`) can't pass here and fail for real.
const ITEM_WRITE_KEYS = new Set([
  "userId", "typeId", "title", "description", "content", "language", "url",
  "fileKey", "fileName", "fileSize", "mimeType", "isPinned", "isFavorite", "updatedAt", "tags", "collections",
]);
const checkItemWriteKeys = (data: object) => {
  const unknown = Object.keys(data).find((key) => !ITEM_WRITE_KEYS.has(key));
  if (unknown) throw new Error(`Unknown argument \`${unknown}\``);
};

// Every linked collection must exist, as the foreign key requires. Ownership
// isn't a database rule, so the code has to check it.
const linkedCollectionIds = (links: CollectionLinks | undefined, kept: string[] = []) => {
  const added = links?.createMany.data.map(({ collectionId }) => collectionId) ?? [];
  if (added.some((id) => !db.collections.some((collection) => collection.id === id))) {
    throw new Error('violates foreign key constraint "CollectionItem_collectionId_fkey"');
  }
  return [...new Set([...kept, ...added])];
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
    findUnique: ({ where, select }: { where: { id: string }; select?: UserSelect }) =>
      query(() => {
        const user = findUser(where.id);
        return user ? shapeUser(user, select) : null;
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
        db.subscriptionPeriods = db.subscriptionPeriods.filter((row) => row.userId !== user.id);
        return { ...user };
      }),
  },
  subscriptionPeriod: {
    findMany: (args: PeriodQuery = {}) => query(() => findPeriods(args)),
    findFirst: (args: PeriodQuery = {}) => query(() => findPeriods({ ...args, take: 1 }).at(0) ?? null),
    count: ({ where }: { where?: PeriodWhere } = {}) =>
      query(() => db.subscriptionPeriods.filter(matchesPeriod(where)).length),
    // Defaults as the schema fills them. `userId` must name a user, as the
    // foreign key requires, and both uniques hold; a `NULL` in any part of
    // the composite one never clashes, as in Postgres.
    create: ({ data, select }: { data: Omit<SubscriptionPeriodRow, "id">; select?: Select }) =>
      query(() => {
        if (!findUser(data.userId)) {
          throw new Error('violates foreign key constraint "SubscriptionPeriod_userId_fkey"');
        }
        const { stripeCheckoutSessionId, vendor, vendorSubscriptionId, periodEnd } = data;
        if (stripeCheckoutSessionId && db.subscriptionPeriods.some((row) => row.stripeCheckoutSessionId === stripeCheckoutSessionId)) {
          throw uniqueViolation(["stripeCheckoutSessionId"]);
        }
        if (
          vendor &&
          vendorSubscriptionId &&
          periodEnd &&
          db.subscriptionPeriods.some(
            (row) =>
              row.vendor === vendor &&
              row.vendorSubscriptionId === vendorSubscriptionId &&
              row.periodEnd?.getTime() === periodEnd.getTime(),
          )
        ) {
          throw uniqueViolation(["vendor", "vendorSubscriptionId", "periodEnd"]);
        }
        const row: SubscriptionPeriodRow = {
          id: `period-${db.subscriptionPeriods.length + 1}`,
          status: "PAID",
          vendor: null,
          createdAt: new Date(),
          ...data,
        };
        db.subscriptionPeriods.push(row);
        return pick(row, select);
      }),
    // A conditional write such as `{ id, status: "PENDING" }`: a row already
    // moved on doesn't match, so two racing writes change it once.
    updateMany: ({ where, data }: { where: PeriodWhere; data: Partial<Omit<SubscriptionPeriodRow, "id" | "userId">> }) =>
      query(() => {
        const rows = db.subscriptionPeriods.filter(matchesPeriod(where));
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      }),
    // By id; a missing row throws Prisma's P2025, like `update` does.
    update: ({ where, data, select }: { where: { id: string }; data: Partial<Omit<SubscriptionPeriodRow, "id" | "userId">>; select?: Select }) =>
      query(() => {
        const row = db.subscriptionPeriods.find((period) => period.id === where.id);
        if (!row) throw recordNotFound();
        const { stripeCheckoutSessionId } = data;
        if (stripeCheckoutSessionId && db.subscriptionPeriods.some((other) => other !== row && other.stripeCheckoutSessionId === stripeCheckoutSessionId)) {
          throw uniqueViolation(["stripeCheckoutSessionId"]);
        }
        Object.assign(row, data);
        return pick(row, select);
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
     * isPinned, typeId, and `collections: { some: { collectionId } }`, read
     * from the item's `collectionIds`), `orderBy`, `skip`, `take`, and
     * top-level `select` keys, so a field the code doesn't select never comes back.
     */
    findMany: ({
      where,
      orderBy = [],
      skip = 0,
      take,
      select,
    }: {
      where: ItemWhere;
      orderBy?: OrderBy;
      skip?: number;
      take?: number;
      select: ItemSelect;
    }) =>
      query(() =>
        db.items
          .filter(matchesItem(where))
          .sort(compareBy(orderBy))
          .slice(skip, take === undefined ? undefined : skip + take)
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
    // `undefined` field is left alone, and `@updatedAt` moves unless the
    // write sets `updatedAt` itself.
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
        checkItemWriteKeys(data);
        const { tags, collections, ...fields } = data;
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) (row as unknown as Record<string, unknown>)[key] = value;
        }
        if (tags) {
          // Without `deleteMany`, Prisma adds links alongside the old ones.
          const kept = tags.deleteMany ? [] : (row.tags ?? []);
          const added = tags.create.map(({ tag }) => connectOrCreateTag(tag.connectOrCreate));
          row.tags = [...new Set([...kept, ...added])];
        }
        if (collections) {
          // Without `deleteMany`, Prisma adds links alongside the old ones.
          const notIn = collections.deleteMany?.collectionId.notIn;
          const kept = (row.collectionIds ?? []).filter((id) => !collections.deleteMany || notIn?.includes(id));
          row.collectionIds = linkedCollectionIds(collections, kept);
        }
        if (fields.updatedAt === undefined) row.updatedAt = new Date();
        return shapeItem(row, select);
      }),
    // The item create's write: scalar fields plus tags as
    // `{ create: [{ tag: { connectOrCreate } }] }`. Defaults and timestamps
    // are filled in as the schema does, and `typeId` must name an existing
    // type, as the foreign key requires.
    create: ({
      data,
      select,
    }: {
      data: Omit<ItemUpdateData, "tags"> & {
        userId: string;
        typeId: string;
        title: string;
        tags?: { create: { tag: { connectOrCreate: TagConnectOrCreate } }[] };
        collections?: CollectionLinks;
      };
      select: ItemSelect;
    }) =>
      query(() => {
        if (!db.itemTypes.some((type) => type.id === data.typeId)) {
          throw new Error('violates foreign key constraint "Item_typeId_fkey"');
        }
        checkItemWriteKeys(data);
        const { tags, collections, ...fields } = data;
        const now = new Date();
        const row: ItemRow = {
          id: `item-${db.items.length + 1}`,
          description: null,
          content: null,
          language: null,
          url: null,
          isPinned: false,
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
          ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
          userId: data.userId,
          typeId: data.typeId,
          tags: [...new Set(tags?.create.map(({ tag }) => connectOrCreateTag(tag.connectOrCreate)) ?? [])],
          collectionIds: linkedCollectionIds(collections),
        };
        db.items.push(row);
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
    // The same filters as `findMany`, plus isFavorite.
    count: ({ where }: { where: ItemWhere }) => query(() => db.items.filter(matchesItem(where)).length),
    // All of a user's items (account delete), or one by `{ id, userId }`
    // (item delete). Tag and collection links live on the row, so they go
    // with it, as the cascade drops them; the tags and collections stay.
    // Like Prisma, a filter left out matches every row, so a delete that
    // drops its user scope deletes other users' items here too.
    deleteMany: ({ where }: { where: { userId?: string; id?: string } }) =>
      query(() => {
        // Prisma rejects a non-string id before querying.
        if ("id" in where && typeof where.id !== "string") {
          throw new Error("Argument `id`: Expected String");
        }
        const before = db.items.length;
        db.items = db.items.filter(
          (row) =>
            !(
              (where.userId === undefined || row.userId === where.userId) &&
              (where.id === undefined || row.id === where.id)
            ),
        );
        return { count: before - db.items.length };
      }),
  },
  tag: {
    // The cleanup's `{ userId, items: { none: {} } }` deletes the tags no item
    // links. Links live on the item rows by tag name, so a tag is in use when
    // one of its user's items names it. Like Prisma, a filter left out matches
    // every row: without `userId` every user's tags go, without `items` used
    // tags go too.
    deleteMany: ({ where }: { where: { userId?: string; items?: { none: Record<string, never> } } }) =>
      query(() => {
        const inUse = (tag: TagRow) =>
          db.items.some((item) => item.userId === tag.userId && item.tags?.includes(tag.name));
        const matches = (tag: TagRow) =>
          (where.userId === undefined || tag.userId === where.userId) && (where.items === undefined || !inUse(tag));
        const before = db.tags.length;
        db.tags = db.tags.filter((tag) => !matches(tag));
        return { count: before - db.tags.length };
      }),
  },
  collection: {
    /**
     * Membership comes from the fake items' `collectionIds`; `items` returns
     * one join row per member with its type, as the collection select nests it.
     */
    findMany: ({
      where,
      orderBy = [],
      skip = 0,
      take,
      select,
    }: {
      where?: CollectionWhere;
      orderBy?: OrderBy;
      skip?: number;
      take?: number;
      select?: Select;
    }) =>
      query(() =>
        db.collections
          .filter(matchesCollection(where))
          .sort(compareBy(orderBy))
          .slice(skip, take === undefined ? undefined : skip + take)
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
    count: ({ where }: { where?: CollectionWhere }) => query(() => db.collections.filter(matchesCollection(where)).length),
    // Only the lookup on the `[userId, slug]` unique the collection page uses.
    findUnique: ({
      where,
      select,
    }: {
      where: { userId_slug: { userId: string; slug: string } };
      select?: Select;
    }) =>
      query(() => {
        const { userId, slug } = where.userId_slug;
        const row = db.collections.find((collection) => collection.userId === userId && collection.slug === slug);
        return row ? pick(row, select) : null;
      }),
    // Like the unique index on [userId, slug]; another user's slug never clashes.
    create: ({ data, select }: { data: Omit<CollectionRow, "id" | "updatedAt">; select?: Select }) =>
      query(() => {
        if (db.collections.some((row) => row.userId === data.userId && row.slug === data.slug)) {
          throw uniqueViolation(["userId", "slug"]);
        }
        const collection: CollectionRow = {
          id: `collection-${db.collections.length + 1}`,
          description: null,
          isFavorite: false,
          ...data,
          updatedAt: new Date(),
        };
        db.collections.push(collection);
        return pick(collection, select);
      }),
    // By `{ id, userId }` (collection edit): no match throws P2025, and a slug
    // another of the user's collections has throws P2002, as the unique does.
    // Like Prisma, a filter left out matches every row.
    update: ({
      where,
      data,
      select,
    }: {
      where: { id: string; userId?: string };
      data: Pick<CollectionRow, "name" | "slug" | "description" | "isFavorite">;
      select?: Select;
    }) =>
      query(() => {
        const row = db.collections.find(
          (collection) => collection.id === where.id && (where.userId === undefined || collection.userId === where.userId),
        );
        if (!row) throw recordNotFound();
        if (db.collections.some((other) => other !== row && other.userId === row.userId && other.slug === data.slug)) {
          throw uniqueViolation(["userId", "slug"]);
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return pick(row, select);
      }),
    // By `{ id, userId }` (favourite toggle): no match is a count of 0. Like
    // Prisma, `@updatedAt` moves on every matched row.
    updateMany: ({ where, data }: { where: { id: string; userId: string }; data: Pick<CollectionRow, "isFavorite"> }) =>
      query(() => {
        if (typeof where.id !== "string") throw new Error("Argument `id`: Expected String");
        const rows = db.collections.filter((collection) => collection.id === where.id && collection.userId === where.userId);
        for (const row of rows) Object.assign(row, data, { updatedAt: new Date() });
        return { count: rows.length };
      }),
    // One by `{ id, userId }` (collection delete). The links on the items go
    // with it, as the cascade drops `CollectionItem` rows; the items stay.
    // Like Prisma, a filter left out matches every row.
    deleteMany: ({ where }: { where: { id?: string; userId?: string } }) =>
      query(() => {
        if ("id" in where && typeof where.id !== "string") {
          throw new Error("Argument `id`: Expected String");
        }
        const matches = (row: CollectionRow) =>
          (where.userId === undefined || row.userId === where.userId) && (where.id === undefined || row.id === where.id);
        const deleted = new Set(db.collections.filter(matches).map((row) => row.id));
        db.collections = db.collections.filter((row) => !deleted.has(row.id));
        for (const item of db.items) {
          if (item.collectionIds) item.collectionIds = item.collectionIds.filter((id) => !deleted.has(id));
        }
        return { count: deleted.size };
      }),
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
