import { HOUR_MS, MINUTE_MS } from "@/lib/constants/time";

// ─── Form input ───

export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 100;

// ─── Emailed links ───
// Emails and pages state these lifetimes through `formatDuration`, so the
// text can't drift from the real expiry.

/** Verification link lifetime. */
export const VERIFICATION_TOKEN_TTL_MS = 24 * HOUR_MS;
/** A new verification link is only mailed once the last one is this old, so repeated sign-ins don't flood the inbox. */
export const VERIFICATION_RESEND_COOLDOWN_MS = 2 * MINUTE_MS;

/** Reset link lifetime. Short: a reset link grants the account, unlike a verification link. */
export const RESET_TOKEN_TTL_MS = 1 * HOUR_MS;
/** A new reset link is only mailed once the last one is this old, so repeated submits don't flood the inbox. */
export const RESET_RESEND_COOLDOWN_MS = 2 * MINUTE_MS;

// ─── Lists ───

/** Recent items on the dashboard. */
export const RECENT_ITEM_LIMIT = 10;
/** Collection cards on the dashboard. */
export const RECENT_COLLECTION_LIMIT = 6;
/** Placeholder cards an item grid shows while its items load. */
export const ITEM_SKELETON_COUNT = 6;
/** Non-favourite collections in the sidebar. */
export const SIDEBAR_RECENT_COLLECTION_LIMIT = 5;

// ─── Items ───

export const ITEM_TITLE_MAX_LENGTH = 200;
export const ITEM_DESCRIPTION_MAX_LENGTH = 500;
/** Snippet, prompt, command and note bodies. Far above real use; stops runaway pastes. */
export const ITEM_CONTENT_MAX_LENGTH = 50_000;
/** Collections one item can be in. Far above real use; bounds the ownership check. */
export const ITEM_COLLECTION_LIMIT = 50;

// ─── Collections ───

export const COLLECTION_NAME_MAX_LENGTH = 100;
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 500;
