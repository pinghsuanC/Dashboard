import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signOutAction } from "@/actions/auth";
import { API_ROUTES } from "@/lib/constants/routes";

import { signOutAndClearCache } from "./sign-out-and-clear-cache";

vi.mock("@/actions/auth", () => ({ signOutAction: vi.fn() }));

const assign = vi.fn();

beforeEach(() => {
  assign.mockReset();
  vi.mocked(signOutAction).mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("window", { location: { assign } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signOutAndClearCache", () => {
  it("R10: ends the session, then loads the signed-out route as a full navigation", async () => {
    await signOutAndClearCache();

    expect(signOutAction).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(API_ROUTES.signedOut);
    expect(vi.mocked(signOutAction).mock.invocationCallOrder[0]).toBeLessThan(assign.mock.invocationCallOrder[0]);
  });

  it("R10: still leaves the app when the action can't be reached", async () => {
    vi.mocked(signOutAction).mockRejectedValue(new Error("offline"));

    await signOutAndClearCache();

    expect(assign).toHaveBeenCalledWith(API_ROUTES.signedOut);
  });
});
