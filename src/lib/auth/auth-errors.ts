import { CredentialsSignin } from "next-auth";

/**
 * Thrown by `authorize` when the password matched but the email is not
 * verified yet. `signIn()` in a server action re-throws this same instance,
 * which is how the action tells it apart from a wrong password. `email` is
 * the address as stored, which is what the verification token is keyed on.
 * It stays server-side: only `code` ever reaches a URL.
 */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";

  constructor(readonly email: string) {
    super();
  }
}

/**
 * Thrown by `authorize` when the caller is over the sign-in limit. Like
 * `EmailNotVerifiedError`, the server action gets this instance back and turns
 * `reset` into a "try again in X minutes" message; a direct POST to the
 * callback lands on the sign-in page with `code=rate_limited`.
 */
export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";

  constructor(readonly reset: number) {
    super();
  }
}
