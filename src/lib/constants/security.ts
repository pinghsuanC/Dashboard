/** bcrypt cost for every writer of `passwordHash` (register, reset, change). */
export const BCRYPT_ROUNDS = 12;

/**
 * A bcrypt hash at `BCRYPT_ROUNDS` that no password matches. Sign-in compares
 * against it when there's no password to check, so an unknown email takes as
 * long as a wrong password. Regenerate it whenever `BCRYPT_ROUNDS` changes:
 * `node -e "require('bcryptjs').hash('x', <rounds>).then(console.log)"`
 * (`authorize-credentials.test.ts` fails if the costs differ).
 */
export const DUMMY_HASH = "$2b$12$01sbLIzR8yh5gvtJNJk6HOPIs9YrKtU6F334NaCFfwkYbVt.2d2r.";

/**
 * bcrypt only reads the first 72 bytes; anything past that would be ignored
 * silently, so longer passwords are rejected instead. Bytes, not characters:
 * accented letters and emoji take 2–4 bytes each in UTF-8.
 */
export const MAX_PASSWORD_BYTES = 72;

/**
 * hostname[:port] only, so a forged `host` header can't smuggle a path or
 * markup into an emailed link. No `g` flag: `.test()` keeps no state, so the
 * one regex is safe to share across requests.
 */
export const HOST_PATTERN = /^[a-z0-9.-]+(:\d+)?$/i;

/**
 * Base for resolving callback URLs in `safeCallbackUrl`. Any origin works as
 * long as it's ours; only whether a URL changes it matters. `.invalid` is
 * reserved (RFC 2606), so it never resolves to a real site.
 */
export const PROBE_ORIGIN = "http://callback.invalid";

/** Random bytes per emailed token (verification, reset): 256 bits, base64url in the link. */
export const TOKEN_BYTES = 32;

/** Hosts that get `http://` links instead of `https://`: local development only. */
export const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1)(:\d+)?$/;
