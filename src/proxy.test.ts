// The docs call it unstable_doesProxyMatch; this Next build still exports the
// middleware name only.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { UNAUTHORIZED } from "@/lib/constants/messages/common";

import { config, proxy } from "./proxy";

// Auth.js's wrapper reads the JWT cookie and sets `req.auth`; here the test
// sets it, so only the proxy's own decision is checked.
vi.mock("next-auth", () => ({ default: () => ({ auth: (handler: unknown) => handler }) }));
vi.mock("@/auth.config", () => ({ default: {} }));

type Handler = (req: NextRequest & { auth: unknown }) => Response | Promise<Response>;

const run = (path: string, auth: unknown) =>
  (proxy as unknown as Handler)(Object.assign(new NextRequest(`https://app.test${path}`), { auth }));

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy: which paths it guards (P1)", () => {
  it("guards the app's pages", () => {
    expect(matches("/dashboard")).toBe(true);
    expect(matches("/profile")).toBe(true);
    expect(matches("/settings")).toBe(true);
    expect(matches("/collections/work")).toBe(true);
    expect(matches("/items/snippets")).toBe(true);
    expect(matches("/favorites")).toBe(true);
  });

  it("guards the app's API routes", () => {
    expect(matches("/api/items/abc")).toBe(true);
    expect(matches("/api/items/abc/file")).toBe(true);
  });

  it("leaves Auth.js and the signed-out auth routes public", () => {
    expect(matches("/api/auth/callback/github")).toBe(false);
    expect(matches("/api/auth/session")).toBe(false);
    expect(matches("/api/auth/register")).toBe(false);
    expect(matches("/api/auth/verify-email")).toBe(false);
    expect(matches("/sign-in")).toBe(false);
  });
});

describe("proxy: signed out (P2)", () => {
  it("answers an API request with a JSON 401, not a redirect a fetch would follow", async () => {
    const response = await run("/api/items/abc/file", null);

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({ error: UNAUTHORIZED });
  });

  it("still sends a page to sign-in, with the page as callbackUrl", async () => {
    const response = await run("/dashboard?tab=1", null);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.test/sign-in?callbackUrl=%2Fdashboard%3Ftab%3D1",
    );
  });
});

describe("proxy: signed in (P3)", () => {
  it("lets API requests and pages through", async () => {
    const session = { user: { id: "ada" } };

    for (const path of ["/api/items/abc", "/dashboard"]) {
      const response = await run(path, session);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  });
});
