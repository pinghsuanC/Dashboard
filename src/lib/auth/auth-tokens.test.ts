import { headers } from "next/headers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appOrigin, newToken } from "./auth-tokens";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

const requestFrom = (host: string) =>
  vi.mocked(headers).mockResolvedValue(new Headers({ host }) as Awaited<ReturnType<typeof headers>>);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("emailed link origin", () => {
  it("R1: links built on a local dev host use http, with the port", async () => {
    vi.stubEnv("AUTH_URL", "");
    requestFrom("localhost:3000");
    expect(await appOrigin()).toBe("http://localhost:3000");

    requestFrom("127.0.0.1:3000");
    expect(await appOrigin()).toBe("http://127.0.0.1:3000");
  });

  it("R2: links built on any other host use https, even one that merely starts like localhost", async () => {
    vi.stubEnv("AUTH_URL", "");
    requestFrom("stashboard.example.com");
    expect(await appOrigin()).toBe("https://stashboard.example.com");

    requestFrom("localhost.evil.test");
    expect(await appOrigin()).toBe("https://localhost.evil.test");
  });

  it("R3: a host with a path or markup in it is refused", async () => {
    vi.stubEnv("AUTH_URL", "");
    requestFrom("evil.test/phish");
    await expect(appOrigin()).rejects.toThrow(/Refusing/);
  });

  it("R4: AUTH_URL wins over the request's host", async () => {
    vi.stubEnv("AUTH_URL", "https://app.stashboard.test/some/path");
    requestFrom("localhost:3000");
    expect(await appOrigin()).toBe("https://app.stashboard.test");
  });
});

describe("emailed tokens", () => {
  it("R5: a token is 32 random bytes, URL-safe, and differs every time", () => {
    const token = newToken();

    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(newToken()).not.toBe(token);
  });
});
