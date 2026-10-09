import { describe, expect, it } from "vitest";

import { ROUTES } from "@/lib/constants/routes";

import { GET } from "./route";

const request = (query = "") => GET(new Request(`https://app.test/api/auth/signed-out${query}`));

/** Where the redirect points, as path plus query. */
const target = (response: Response) => {
  const url = new URL(response.headers.get("location") ?? "");
  return `${url.pathname}${url.search}`;
};

describe("GET /api/auth/signed-out", () => {
  it("R10: tells the browser to drop everything it cached for the site", async () => {
    expect((await request()).headers.get("clear-site-data")).toBe('"cache"');
  });

  it("R10: then sends the browser on to sign-in", async () => {
    const response = await request();

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(target(response)).toBe(ROUTES.signIn);
  });

  it("R13: after account deletion, carries the deleted flag on to sign-in and still clears the cache", async () => {
    const response = await request("?deleted=1");

    expect(target(response)).toBe("/sign-in?deleted=1");
    expect(response.headers.get("clear-site-data")).toBe('"cache"');
  });

  it("R14: forwards nothing else: other values, other flags and redirect targets are dropped", async () => {
    for (const query of ["?deleted=2", "?registered=1", "?callbackUrl=https%3A%2F%2Fevil.test", "?deleted=1&next=//evil.test"]) {
      const expected = query.startsWith("?deleted=1") ? "/sign-in?deleted=1" : ROUTES.signIn;
      expect(target(await request(query))).toBe(expected);
    }
  });
});
