import { compare, hash } from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signIn, signOut } from "@/auth";
import { signInHref } from "@/lib/auth/auth-redirect";
import { requireCurrentUser, requireCurrentUserId } from "@/services/auth/session";
import { db, resetDb } from "@/test/fake-prisma";

import { changePasswordAction, deleteAccountAction } from "./account";

// Next's redirect() works by throwing; the tests read the target off the error.
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
// Both redirect on success, as Auth.js does from a server action.
vi.mock("@/auth", () => ({
  signIn: vi.fn(async (_provider: string, { redirectTo }: { redirectTo: string }) => {
    throw new RedirectError(redirectTo);
  }),
  signOut: vi.fn(async ({ redirectTo }: { redirectTo?: string }) => {
    if (redirectTo) throw new RedirectError(redirectTo);
  }),
}));
vi.mock("@/services/auth/session", () => ({
  requireCurrentUser: vi.fn(),
  requireCurrentUserId: vi.fn(),
}));
vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
// Real bcrypt at the lowest cost.
vi.mock("@/lib/constants/security", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants/security")>()),
  BCRYPT_ROUNDS: 4,
}));
vi.spyOn(console, "error").mockImplementation(() => {});

const OLD_PASSWORD = "old-password-1";
const NEW_PASSWORD = "new-password-2";

const signedInAs = (userId: string) => {
  vi.mocked(requireCurrentUserId).mockResolvedValue(userId);
  const user = db.users.find((row) => row.id === userId)!;
  vi.mocked(requireCurrentUser).mockResolvedValue({
    ...user,
    image: null,
    plan: "FREE",
    isPro: false,
    preferredTheme: "dark",
    preferredFontSize: 14,
    hasPassword: user.passwordHash !== null,
  });
};

const signedOut = () => {
  const toSignIn = async (): Promise<never> => {
    throw new RedirectError("/sign-in");
  };
  vi.mocked(requireCurrentUserId).mockImplementation(toSignIn);
  vi.mocked(requireCurrentUser).mockImplementation(toSignIn);
};

const addUser = async (id: string, password: string | null) => {
  const user = {
    id,
    name: id,
    email: `${id}@example.test`,
    passwordHash: password ? await hash(password, 4) : null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
  db.users.push(user);
  return user;
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const passwordForm = (overrides: Record<string, string> = {}) =>
  form({
    currentPassword: OLD_PASSWORD,
    password: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
    ...overrides,
  });

/** Runs an action that should redirect and returns where it went. */
const redirectOf = async (run: () => Promise<unknown>) => {
  const error = await run().then(
    () => null,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(RedirectError);
  return (error as RedirectError).url;
};

const storedHash = (id: string) => db.users.find((user) => user.id === id)?.passwordHash;
const storedVersion = (id: string) => db.users.find((user) => user.id === id)?.sessionVersion ?? 0;

beforeEach(() => {
  resetDb();
  vi.mocked(requireCurrentUserId).mockReset();
  vi.mocked(requireCurrentUser).mockReset();
  vi.mocked(signIn).mockClear();
  vi.mocked(signOut).mockClear();
});

describe("change password", () => {
  beforeEach(async () => {
    await addUser("ada", OLD_PASSWORD);
    signedInAs("ada");
  });

  it("R4: stores the new password, retires the old one, and returns to the profile with the toast flag", async () => {
    const url = await redirectOf(() => changePasswordAction({}, passwordForm()));

    expect(url).toBe("/profile?password=changed");
    const hashAfter = storedHash("ada")!;
    expect(await compare(NEW_PASSWORD, hashAfter)).toBe(true);
    expect(await compare(OLD_PASSWORD, hashAfter)).toBe(false);
  });

  it("R3: rejects a wrong current password on that field and leaves the password unchanged", async () => {
    const before = storedHash("ada");

    const state = await changePasswordAction({}, passwordForm({ currentPassword: "not-it-123" }));

    expect(state.fieldErrors?.currentPassword).toBeTruthy();
    expect(storedHash("ada")).toBe(before);
  });

  it("R1: reports invalid input per field without touching the stored password", async () => {
    const before = storedHash("ada");

    const state = await changePasswordAction(
      {},
      passwordForm({ password: "short", confirmPassword: "short" }),
    );

    expect(state.fieldErrors?.password).toBeTruthy();
    expect(storedHash("ada")).toBe(before);
  });

  it("R2: refuses a GitHub-only account, which has no password to change", async () => {
    await addUser("octo", null);
    signedInAs("octo");

    const state = await changePasswordAction({}, passwordForm());

    // The reason, not a generic failure: "something went wrong" would also
    // appear if the missing hash merely crashed the comparison.
    expect(state.error).toMatch(/github/i);
    expect(storedHash("octo")).toBeNull();
  });

  it("R5: sends a signed-out caller to sign-in and changes nothing", async () => {
    signedOut();
    const before = storedHash("ada");

    const url = await redirectOf(() => changePasswordAction({}, passwordForm()));

    expect(url).toBe("/sign-in");
    expect(storedHash("ada")).toBe(before);
  });

  it("R6: answers a database failure with a message instead of throwing", async () => {
    db.down = true;

    const state = await changePasswordAction({}, passwordForm());

    expect(state.error).toMatch(/something went wrong/i);
  });

  it("R8: signs out every existing session by bumping the stored session version", async () => {
    await redirectOf(() => changePasswordAction({}, passwordForm()));

    expect(storedVersion("ada")).toBe(1);
  });

  it("R8: a wrong current password signs nobody out", async () => {
    await changePasswordAction({}, passwordForm({ currentPassword: "not-it-123" }));

    expect(storedVersion("ada")).toBe(0);
  });

  it("R8: keeps this device signed in by signing in again with the new password", async () => {
    await redirectOf(() => changePasswordAction({}, passwordForm()));

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "ada@example.test",
      password: NEW_PASSWORD,
      redirectTo: "/profile?password=changed",
    });
  });

  it("R8: when signing back in is refused, sends the user to sign in and back to the profile", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new CredentialsSignin());

    const url = await redirectOf(() => changePasswordAction({}, passwordForm()));

    expect(url).toBe(signInHref("/profile?password=changed"));
    expect(await compare(NEW_PASSWORD, storedHash("ada")!)).toBe(true);
  });

  it("R9: cancels the user's outstanding reset links, and no one else's", async () => {
    await addUser("bob", OLD_PASSWORD);
    db.passwordResetTokens.push(
      { email: "ada@example.test", token: "r-ada" },
      { email: "bob@example.test", token: "r-bob" },
    );

    await redirectOf(() => changePasswordAction({}, passwordForm()));

    expect(db.passwordResetTokens.map((token) => token.token)).toEqual(["r-bob"]);
  });
});

describe("delete account", () => {
  beforeEach(async () => {
    const ada = await addUser("ada", OLD_PASSWORD);
    const bob = await addUser("bob", OLD_PASSWORD);
    db.itemTypes.push({ id: "snippet", userId: null });
    db.items.push(
      { id: "ada-1", userId: "ada", typeId: "snippet" },
      { id: "bob-1", userId: "bob", typeId: "snippet" },
    );
    db.collections.push({ id: "ada-c", userId: "ada" }, { id: "bob-c", userId: "bob" });
    db.verificationTokens.push(
      { identifier: ada.email, token: "v-ada" },
      { identifier: bob.email, token: "v-bob" },
    );
    db.passwordResetTokens.push(
      { email: ada.email, token: "r-ada" },
      { email: bob.email, token: "r-bob" },
    );
    signedInAs("ada");
  });

  it("R7: removes the user with their data and email-keyed tokens", async () => {
    await deleteAccountAction();

    expect(db.users.map((user) => user.id)).toEqual(["bob"]);
    expect(db.items.map((item) => item.id)).toEqual(["bob-1"]);
    expect(db.collections.map((collection) => collection.id)).toEqual(["bob-c"]);
    expect(db.verificationTokens.map((token) => token.token)).toEqual(["v-bob"]);
    expect(db.passwordResetTokens.map((token) => token.token)).toEqual(["r-bob"]);
  });

  it("R7: deletes a Pro user whose custom types still have items", async () => {
    db.itemTypes.push({ id: "ada-recipe", userId: "ada" });
    db.items.push({ id: "ada-2", userId: "ada", typeId: "ada-recipe" });

    await deleteAccountAction();

    expect(db.users.some((user) => user.id === "ada")).toBe(false);
    expect(db.itemTypes.map((type) => type.id)).toEqual(["snippet"]);
  });

  it("R7: deletes only the signed-in user, whatever the request carries", async () => {
    // useActionState calls it with (state, formData); a tampered form names bob.
    const submit = deleteAccountAction as (...args: unknown[]) => Promise<unknown>;
    await submit({}, form({ userId: "bob", id: "bob", email: "bob@example.test" }));

    expect(db.users.map((user) => user.id)).toEqual(["bob"]);
  });

  // A redirect from the action is followed on the server, so the browser would
  // never see the signed-out route's Clear-Site-Data; the dialog navigates.
  it("R11: ends the session without redirecting, and hands the dialog the signed-out route with the deleted flag", async () => {
    const state = await deleteAccountAction();

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(state).toEqual({ leaveTo: "/api/auth/signed-out?deleted=1" });
  });

  it("R11: signs out only after the delete, never before", async () => {
    vi.mocked(signOut).mockImplementationOnce(async () => {
      expect(db.users.some((user) => user.id === "ada")).toBe(false);
    });

    await deleteAccountAction();

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("R6/R7: on a database failure, keeps the user signed in and returns a message", async () => {
    db.down = true;

    const state = await deleteAccountAction();

    expect(state.error).toMatch(/something went wrong/i);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("R5: sends a signed-out caller to sign-in and deletes nothing", async () => {
    signedOut();

    const url = await redirectOf(() => deleteAccountAction());

    expect(url).toBe("/sign-in");
    expect(db.users).toHaveLength(2);
    expect(signOut).not.toHaveBeenCalled();
  });
});
