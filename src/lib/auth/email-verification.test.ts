import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOUR_MS, MINUTE_MS } from "@/lib/constants/time";
import { sendVerificationEmail } from "@/services/email";
import { db, resetDb } from "@/test/fake-prisma";

import { hashToken } from "./auth-tokens";
import {
  isEmailVerificationEnabled,
  resendVerificationLink,
  sendVerificationLink,
  verifyEmailToken,
} from "./email-verification";

vi.mock("@/services/prisma", async () => ({ prisma: (await import("@/test/fake-prisma")).fakePrisma }));
vi.mock("@/services/email", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("@/lib/auth/auth-tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-tokens")>()),
  appOrigin: async () => "https://app.test",
}));

const EMAIL = "ada@example.test";
const NOW = new Date("2026-06-15T12:00:00Z");
const TTL = 24 * HOUR_MS;

/** The raw token in the link the last email carried. */
const mailedToken = () => {
  const [, link] = vi.mocked(sendVerificationEmail).mock.lastCall!;
  return new URL(link).searchParams.get("token")!;
};

/** A stored link for `email` that went out `ageMs` ago. */
const issuedAgo = (ageMs: number, token = "raw", email = EMAIL) =>
  db.verificationTokens.push({
    identifier: email,
    token: hashToken(token),
    expires: new Date(NOW.getTime() - ageMs + TTL),
  });

beforeEach(() => {
  resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(sendVerificationEmail).mockReset().mockResolvedValue();
  db.users.push({ id: "ada", name: "Ada", email: EMAIL, passwordHash: "x", createdAt: NOW, emailVerified: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("verification toggle (EMAIL_VERIFICATION)", () => {
  it("is on when the variable is unset, so a deploy that forgets it stays closed", () => {
    vi.stubEnv("EMAIL_VERIFICATION", undefined);
    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it.each(["off", "OFF", "  Off  "])("is off for %j", (value) => {
    vi.stubEnv("EMAIL_VERIFICATION", value);
    expect(isEmailVerificationEnabled()).toBe(false);
  });

  it.each(["", "false", "0", "no", "disabled"])("stays on for anything else, like %j", (value) => {
    vi.stubEnv("EMAIL_VERIFICATION", value);
    expect(isEmailVerificationEnabled()).toBe(true);
  });
});

describe("sending a verification link", () => {
  it("mails a link to the verify route whose token is stored only as a hash", async () => {
    await sendVerificationLink(EMAIL);

    const [to, link] = vi.mocked(sendVerificationEmail).mock.lastCall!;
    expect(to).toBe(EMAIL);
    expect(link.startsWith("https://app.test/api/auth/verify-email?token=")).toBe(true);

    const token = mailedToken();
    expect(db.verificationTokens).toHaveLength(1);
    expect(db.verificationTokens[0].token).toBe(hashToken(token));
    expect(db.verificationTokens[0].token).not.toBe(token);
  });

  it("expires the link 24 hours after it is sent", async () => {
    await sendVerificationLink(EMAIL);

    expect(db.verificationTokens[0].expires).toEqual(new Date(NOW.getTime() + TTL));
  });

  it("replaces the email's earlier links but leaves other emails' alone", async () => {
    issuedAgo(HOUR_MS, "old");
    issuedAgo(HOUR_MS, "bobs", "bob@example.test");

    await sendVerificationLink(EMAIL);

    expect(db.verificationTokens.map((row) => row.identifier).sort()).toEqual(["ada@example.test", "bob@example.test"]);
    expect(db.verificationTokens.some((row) => row.token === hashToken("old"))).toBe(false);
  });

  it("issues a different token each time", async () => {
    await sendVerificationLink(EMAIL);
    const first = mailedToken();
    await sendVerificationLink(EMAIL);

    expect(mailedToken()).not.toBe(first);
  });
});

describe("resending a verification link (cooldown)", () => {
  it("sends one when the email has no link yet", async () => {
    await resendVerificationLink(EMAIL);

    expect(sendVerificationEmail).toHaveBeenCalledOnce();
  });

  it("sends nothing while the last link is under 2 minutes old", async () => {
    issuedAgo(1 * MINUTE_MS);

    await resendVerificationLink(EMAIL);

    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(db.verificationTokens[0].token).toBe(hashToken("raw"));
  });

  it("goes by the newest link when several are stored", async () => {
    issuedAgo(10 * MINUTE_MS, "older");
    issuedAgo(30 * 1000, "newer");

    await resendVerificationLink(EMAIL);

    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends a new link once the last one is past the cooldown", async () => {
    issuedAgo(3 * MINUTE_MS);

    await resendVerificationLink(EMAIL);

    expect(sendVerificationEmail).toHaveBeenCalledOnce();
    expect(db.verificationTokens[0].token).toBe(hashToken(mailedToken()));
  });

  it("never throws when the database is down", async () => {
    db.down = true;
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(resendVerificationLink(EMAIL)).resolves.toBeUndefined();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("never throws when the email provider rejects the send", async () => {
    vi.mocked(sendVerificationEmail).mockRejectedValue(new Error("Resend: down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(resendVerificationLink(EMAIL)).resolves.toBeUndefined();
  });
});

describe("verifying an emailed token", () => {
  it("verifies the email and uses the link up", async () => {
    issuedAgo(MINUTE_MS, "link");

    expect(await verifyEmailToken("link")).toBe("success");
    expect(db.users[0].emailVerified).toEqual(NOW);
    expect(db.verificationTokens).toEqual([]);
  });

  it("works only once", async () => {
    issuedAgo(MINUTE_MS, "link");
    await verifyEmailToken("link");

    expect(await verifyEmailToken("link")).toBe("invalid");
  });

  it("rejects a token it never issued", async () => {
    issuedAgo(MINUTE_MS, "link");

    expect(await verifyEmailToken("guess")).toBe("invalid");
    expect(db.users[0].emailVerified).toBeNull();
  });

  it("rejects the stored hash itself, so a leaked row can't be replayed", async () => {
    issuedAgo(MINUTE_MS, "link");

    expect(await verifyEmailToken(hashToken("link"))).toBe("invalid");
  });

  it("reports an expired link, deletes it and leaves the email unverified", async () => {
    issuedAgo(TTL + MINUTE_MS, "link");

    expect(await verifyEmailToken("link")).toBe("expired");
    expect(db.users[0].emailVerified).toBeNull();
    expect(db.verificationTokens).toEqual([]);
  });

  it("verifies only the account the link was sent to", async () => {
    db.users.push({ id: "bob", name: "Bob", email: "bob@example.test", passwordHash: "x", createdAt: NOW, emailVerified: null });
    issuedAgo(MINUTE_MS, "link");

    await verifyEmailToken("link");

    expect(db.users.find((user) => user.id === "bob")!.emailVerified).toBeNull();
  });

  it("keeps the original verification date of an already verified email", async () => {
    const first = new Date("2026-01-01T00:00:00Z");
    db.users[0].emailVerified = first;
    issuedAgo(MINUTE_MS, "link");

    expect(await verifyEmailToken("link")).toBe("success");
    expect(db.users[0].emailVerified).toEqual(first);
  });
});
