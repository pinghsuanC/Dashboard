import { signOutAction } from "@/actions/auth";
import { API_ROUTES } from "@/lib/constants/routes";

/**
 * Signs out from the browser: ends the session, then loads the signed-out
 * route as a full navigation, so the browser itself receives its
 * `Clear-Site-Data` (cached images) on the way to /sign-in. A redirect from
 * the action wouldn't do: Next follows it on the server. The full load also
 * drops the app's client state. If the action can't be reached, the route
 * still leads to sign-in, where a session that survived sends the user back.
 */
export const signOutAndClearCache = async (): Promise<void> => {
  await signOutAction().catch(() => undefined);
  window.location.assign(API_ROUTES.signedOut);
};
