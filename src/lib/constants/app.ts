/** The product name users see: titles, the sidebar, emails. */
export const APP_NAME = "Stashboard";

/** Default `<meta name="description">`. */
export const APP_DESCRIPTION = "A unified hub for developer knowledge and resources.";

/** The dashboard's `<meta name="description">`. */
export const DASHBOARD_DESCRIPTION = "Your developer knowledge hub.";

/**
 * Root layout `title`: pages set only their own name ("Sign in") and Next
 * fills in the template, so every tab reads "Sign in | Stashboard".
 */
export const APP_TITLE = {
  template: `%s | ${APP_NAME}`,
  default: APP_NAME,
};
