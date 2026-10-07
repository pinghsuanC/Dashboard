import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyEmailToken } from "@/lib/auth/email-verification";

import { GET } from "./route";

vi.mock("@/lib/auth/email-verification", () => ({ verifyEmailToken: vi.fn() }));

const visit = async (query: string) => {
  const response = await GET(new NextRequest(`https://app.test/api/auth/verify-email${query}`));
  return { response, location: new URL(response.headers.get("location")!) };
};

beforeEach(() => {
  vi.mocked(verifyEmailToken).mockReset();
});

describe("GET /api/auth/verify-email (the emailed link)", () => {
  it.each(["success", "expired", "invalid"] as const)(
    "redirects to sign-in on this origin with verify=%s",
    async (result) => {
      vi.mocked(verifyEmailToken).mockResolvedValue(result);

      const { response, location } = await visit("?token=abc");

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      expect(location.origin).toBe("https://app.test");
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("verify")).toBe(result);
      expect(verifyEmailToken).toHaveBeenCalledWith("abc");
    },
  );

  it("treats a link without a token as invalid, without looking anything up", async () => {
    const { location } = await visit("");

    expect(location.searchParams.get("verify")).toBe("invalid");
    expect(verifyEmailToken).not.toHaveBeenCalled();
  });

  it("never puts the token in the redirect", async () => {
    vi.mocked(verifyEmailToken).mockResolvedValue("success");

    const { location } = await visit("?token=secret-token");

    expect(location.toString()).not.toContain("secret-token");
  });
});
