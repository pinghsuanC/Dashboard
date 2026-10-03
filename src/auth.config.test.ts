import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";

import authConfig from "./auth.config";

// The callbacks run with more arguments than these tests pass; they read only these.
type JwtArgs = { token: JWT; user?: { sessionVersion?: number }; trigger?: string; session?: unknown };
const jwt = (args: JwtArgs) =>
  (authConfig.callbacks.jwt as unknown as (args: JwtArgs) => JWT)(args);

describe("session version in the JWT", () => {
  it("R1: sign-in stamps the user's current version into the token", () => {
    expect(jwt({ token: { sub: "ada" }, user: { sessionVersion: 3 } }).sessionVersion).toBe(3);
  });

  it("R1: a user with no version yet starts at 0", () => {
    expect(jwt({ token: { sub: "ada" }, user: {} }).sessionVersion).toBe(0);
  });

  it("R2: an update() from the client can't move the version, so a revoked cookie stays revoked", () => {
    const token = jwt({
      token: { sub: "ada", sessionVersion: 1 },
      trigger: "update",
      session: { sessionVersion: 5 },
    });

    expect(token.sessionVersion).toBe(1);
  });

  it("R3: the session carries the token's version, and 0 for tokens issued before versions", () => {
    const session = (token: JWT) =>
      (authConfig.callbacks.session as unknown as (args: object) => { sessionVersion?: number })({
        session: { user: {}, expires: "" },
        token,
      });

    expect(session({ sub: "ada", sessionVersion: 4 }).sessionVersion).toBe(4);
    expect(session({ sub: "ada" }).sessionVersion).toBe(0);
  });
});
