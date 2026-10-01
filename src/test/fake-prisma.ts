/**
 * An in-memory stand-in for the slice of Prisma the account code uses, so
 * tests check what ends up stored rather than which calls were made. It keeps
 * the two database rules that matter here:
 * - `User` deletes cascade to the user's items, collections and custom types.
 * - `Item.typeId` is ON DELETE RESTRICT, checked immediately: deleting a user
 *   whose custom types still have items fails, as it can in Postgres.
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
  isPinned?: boolean;
  isFavorite?: boolean;
  updatedAt?: Date;
  tags?: string[];
  collectionIds?: string[];
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
}
interface PasswordResetTokenRow {
  email: string;
  token: string;
}

export const db = {
  users: [] as UserRow[],
  itemTypes: [] as ItemTypeRow[],
  items: [] as ItemRow[],
  collections: [] as CollectionRow[],
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

export const fakePrisma = {
  user: {
    findUnique: ({ where, select }: { where: { id: string }; select?: Select }) =>
      query(() => {
        const user = findUser(where.id);
        return user ? pick(user, select) : null;
      }),
    findUniqueOrThrow: ({ where, select }: { where: { id: string }; select?: Select }) =>
      query(() => {
        const user = findUser(where.id);
        if (!user) throw new Error("No User found");
        return pick(user, select);
      }),
    update: ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) =>
      query(() => {
        const user = findUser(where.id);
        if (!user) throw new Error("Record to update not found");
        Object.assign(user, data);
        return { ...user };
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
  },
  item: {
    /**
     * Returns rows in the shape the item select asks for: the type and tag
     * relations nested as Prisma nests them. Honours `where` (userId,
     * isPinned), `orderBy`, `take`, and top-level `select` keys, so a field
     * the code doesn't select never comes back.
     */
    findMany: ({
      where,
      orderBy = [],
      take,
      select,
    }: {
      where: { userId: string; isPinned?: boolean };
      orderBy?: OrderBy;
      take?: number;
      select: Select & { tags?: { orderBy?: unknown } };
    }) =>
      query(() =>
        db.items
          .filter(
            (row) =>
              row.userId === where.userId &&
              (where.isPinned === undefined || Boolean(row.isPinned) === where.isPinned),
          )
          .sort(compareBy(orderBy))
          .slice(0, take ?? Infinity)
          .map((row) => {
            const type = db.itemTypes.find((itemType) => itemType.id === row.typeId);
            const tags = [...(row.tags ?? [])];
            if (select.tags?.orderBy) tags.sort();
            return pick(
              {
                ...row,
                type: type && { id: type.id, label: type.label, icon: type.icon, color: type.color },
                tags: tags.map((name) => ({ tag: { name } })),
              },
              select as Select,
            );
          }),
      ),
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
    findMany: ({ where, select }: { where: { userId: string }; select?: Select }) =>
      query(() =>
        db.collections
          .filter((row) => row.userId === where.userId)
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
                        type: type && { id: type.id, label: type.label, icon: type.icon, color: type.color },
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
    deleteMany: ({ where }: { where: { identifier: string } }) =>
      query(() => {
        const before = db.verificationTokens.length;
        db.verificationTokens = db.verificationTokens.filter(
          (row) => row.identifier !== where.identifier,
        );
        return { count: before - db.verificationTokens.length };
      }),
  },
  passwordResetToken: {
    deleteMany: ({ where }: { where: { email: string } }) =>
      query(() => {
        const before = db.passwordResetTokens.length;
        db.passwordResetTokens = db.passwordResetTokens.filter(
          (row) => row.email !== where.email,
        );
        return { count: before - db.passwordResetTokens.length };
      }),
  },
  // The array form, in order. Unlike Prisma it doesn't roll back, so failure
  // tests use `db.down` rather than a mid-transaction error.
  $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
};
