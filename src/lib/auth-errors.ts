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
