import { vi } from "vitest";

import { requireCurrentUser, requireCurrentUserId } from "@/services/auth/session";
import type { Plan } from "@/types/billing";
import type { CurrentUser } from "@/types/session";

/**
 * Points the mocked `requireCurrentUser` at the mocked `requireCurrentUserId`:
 * the user it returns has that id and `plan`, and when a test makes the id
 * lookup redirect (signed out), this one redirects too. Only the fields the
 * plan checks read are filled. Call it in the test file that mocks
 * `@/services/auth/session` with both functions.
 */
export const signInOnPlan = (plan: Plan) => {
  vi.mocked(requireCurrentUser).mockImplementation(
    async () => ({ id: await requireCurrentUserId(), plan, isPro: plan === "PRO" }) as CurrentUser,
  );
};
