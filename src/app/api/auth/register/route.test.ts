import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerPasswordUser } from "@/lib/auth/register-user";
import { AUTH_MESSAGES } from "@/lib/constants/messages/auth";
import { INVALID_REQUEST_BODY } from "@/lib/constants/messages/common";
import { checkRateLimit } from "@/services/rate-limit";

import { POST } from "./route";

vi.mock("@/lib/auth/register-user", () => ({ registerPasswordUser: vi.fn() }));
vi.mock("@/services/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));

const VALID = {
  name: "Ada",
  email: "ada@example.test",
  password: "long-enough-1",
  confirmPassword: "long-enough-1",
};

const post = (body: string) =>
  POST(new Request("https://app.test/api/auth/register", { method: "POST", body }));

beforeEach(() => {
  vi.mocked(registerPasswordUser).mockReset().mockResolvedValue({ success: true });
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue({ success: true, remaining: 4, reset: 0 });
});

describe("POST /api/auth/register", () => {
  it("answers 202 and creates the account for a valid body", async () => {
    const response = await post(JSON.stringify(VALID));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ success: true });
    expect(registerPasswordUser).toHaveBeenCalledWith(VALID);
  });

  it("returns no user id, so the answer can't reveal whether the email was taken", async () => {
    const body = await (await post(JSON.stringify(VALID))).json();

    expect(Object.keys(body)).toEqual(["success"]);
  });

  it.each([
    ["not JSON", "{oops"],
    ["null", "null"],
    ["an array", JSON.stringify([VALID])],
    ["a string", JSON.stringify("hi")],
  ])("answers 400 for a body that is %s", async (_, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: INVALID_REQUEST_BODY });
    expect(registerPasswordUser).not.toHaveBeenCalled();
  });

  it("answers 400 with the first validation message, without counting it against the limit", async () => {
    const response = await post(JSON.stringify({ ...VALID, name: "  " }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: AUTH_MESSAGES.nameRequired });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(registerPasswordUser).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After once over the limit, and registers nothing", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 90_000 });

    const response = await post(JSON.stringify(VALID));

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThanOrEqual(89);
    expect(Number(response.headers.get("Retry-After"))).toBeLessThanOrEqual(90);
    expect((await response.json()).success).toBe(false);
    expect(registerPasswordUser).not.toHaveBeenCalled();
  });

  it("counts the attempt under the register policy, keyed by the request", async () => {
    await post(JSON.stringify(VALID));

    expect(checkRateLimit).toHaveBeenCalledWith("register", expect.any(Headers));
  });

  it("passes a registration failure through with its status", async () => {
    vi.mocked(registerPasswordUser).mockResolvedValue({ success: false, error: "Something broke", status: 500 });

    const response = await post(JSON.stringify(VALID));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: "Something broke" });
  });
});
