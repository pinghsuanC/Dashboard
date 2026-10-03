/** `<html lang>`. */
export const HTML_LANG = "en";

/**
 * Locale and time zone for every rendered date. Pinned on purpose: dates are
 * rendered in server components, so a formatter that followed the machine's
 * locale would print whatever the server is set to and could disagree with
 * the browser on a re-render. Revisit when per-user locale preferences exist.
 */
export const DATE_LOCALE = "en-US";
export const DATE_TIME_ZONE = "UTC";
