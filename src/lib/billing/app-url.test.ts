import { beforeEach, describe, expect, it, vi } from "vitest";

import { BillingNotConfiguredError } from "@/lib/billing/billing-errors";

import { appUrl } from "./app-url";

// The request's headers, as `headers()` would give them.
let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

beforeEach(() => {
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  requestHeaders = new Headers({ host: "localhost:3000" });
});

describe("appUrl: the address vendor pages send the browser back to", () => {
  it("on Vercel, uses the project's production domain over https, whatever the request says", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "devstash.vercel.app");
    requestHeaders = new Headers({ host: "evil.example", "x-forwarded-proto": "http" });

    expect(await appUrl("/settings?billing=success")).toBe("https://devstash.vercel.app/settings?billing=success");
  });

  it("elsewhere, builds it from the request's forwarded host and protocol", async () => {
    requestHeaders = new Headers({ host: "internal:8080", "x-forwarded-host": "app.example.com", "x-forwarded-proto": "https" });

    expect(await appUrl("/settings")).toBe("https://app.example.com/settings");
  });

  it("without forwarding headers, uses the Host header", async () => {
    requestHeaders = new Headers({ host: "app.example.com", "x-forwarded-proto": "https" });

    expect(await appUrl("/settings")).toBe("https://app.example.com/settings");
  });

  it("the proxy's protocol wins over the local-host default (an https tunnel to localhost)", async () => {
    requestHeaders = new Headers({ host: "localhost:3000", "x-forwarded-proto": "https" });

    expect(await appUrl("/settings")).toBe("https://localhost:3000/settings");
  });

  it("takes the first value when proxies chain the forwarding headers", async () => {
    requestHeaders = new Headers({ "x-forwarded-host": "app.example.com, proxy.internal", "x-forwarded-proto": "https, http" });

    expect(await appUrl("/settings")).toBe("https://app.example.com/settings");
  });

  it("with no protocol given, local development is http and anything else https", async () => {
    requestHeaders = new Headers({ host: "localhost:3000" });
    expect(await appUrl("/settings")).toBe("http://localhost:3000/settings");

    requestHeaders = new Headers({ host: "127.0.0.1:3000" });
    expect(await appUrl("/settings")).toBe("http://127.0.0.1:3000/settings");

    requestHeaders = new Headers({ host: "app.example.com" });
    expect(await appUrl("/settings")).toBe("https://app.example.com/settings");
  });

  it("with neither the Vercel domain nor a request host, billing is not configured", async () => {
    requestHeaders = new Headers();

    await expect(appUrl("/settings")).rejects.toBeInstanceOf(BillingNotConfiguredError);
  });
});
