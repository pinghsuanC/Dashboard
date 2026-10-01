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
}
interface ItemTypeRow {
  id: string;
  userId: string | null;
}
interface ItemRow {
  id: string;
  userId: string;
  typeId: string;
}
interface CollectionRow {
  id: string;
  userId: string;
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

const pick = (row: UserRow, select?: Select) =>
  select
    ? Object.fromEntries(Object.keys(select).map((key) => [key, row[key as keyof UserRow]]))
    : { ...row };

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
  item: {
    deleteMany: ({ where }: { where: { userId: string } }) =>
      query(() => {
        const before = db.items.length;
        db.items = db.items.filter((row) => row.userId !== where.userId);
        return { count: before - db.items.length };
      }),
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
