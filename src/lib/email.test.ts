import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { accountExistsEmail, passwordResetEmail, verificationEmail } from "@/lib/constants/emails";
import { DEFAULT_EMAIL_FROM } from "@/lib/constants/env";

const send = vi.fn();
const Resend = vi.fn(function (this: { emails: { send: typeof send } }) {
  this.emails = { send };
});

vi.mock("resend", () => ({ Resend }));

// `email.ts` keeps the client in a module variable, so each test gets a fresh copy.
const load = () => import("./email");

beforeEach(() => {
  vi.resetModules();
  Resend.mockClear();
  send.mockReset().mockResolvedValue({ data: { id: "e1" }, error: null });
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe("sending email through Resend", () => {
  it("sends each template to the recipient", async () => {
    const email = await load();

    await email.sendVerificationEmail("ada@example.test", "https://app.test/v");
    await email.sendPasswordResetEmail("ada@example.test", "https://app.test/r");
    await email.sendAccountExistsEmail("ada@example.test", "https://app.test/s", "https://app.test/r");

    expect(send.mock.calls.map(([message]) => message)).toEqual([
      { from: DEFAULT_EMAIL_FROM, to: "ada@example.test", ...verificationEmail("https://app.test/v") },
      { from: DEFAULT_EMAIL_FROM, to: "ada@example.test", ...passwordResetEmail("https://app.test/r") },
      {
        from: DEFAULT_EMAIL_FROM,
        to: "ada@example.test",
        ...accountExistsEmail("https://app.test/s", "https://app.test/r"),
      },
    ]);
  });

  it("sends from EMAIL_FROM when it is set", async () => {
    vi.stubEnv("EMAIL_FROM", "Stashboard <hi@stash.test>");
    const email = await load();

    await email.sendVerificationEmail("ada@example.test", "https://app.test/v");

    expect(send.mock.lastCall![0].from).toBe("Stashboard <hi@stash.test>");
  });

  it("throws when Resend rejects the message", async () => {
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const email = await load();

    await expect(email.sendPasswordResetEmail("ada@example.test", "https://app.test/r")).rejects.toThrow(
      "domain not verified",
    );
  });

  it("imports without a key, and fails the send instead", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);
    const email = await load();

    await expect(email.sendVerificationEmail("ada@example.test", "https://app.test/v")).rejects.toThrow(
      "RESEND_API_KEY",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("builds the client once and reuses it", async () => {
    const email = await load();

    await email.sendVerificationEmail("ada@example.test", "https://app.test/v");
    await email.sendVerificationEmail("bob@example.test", "https://app.test/v");

    expect(Resend).toHaveBeenCalledOnce();
    expect(Resend).toHaveBeenCalledWith("re_test");
  });
});
