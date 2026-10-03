/** Messages for the profile page's account actions. */
export const ACCOUNT_MESSAGES = {
  // Validation (auth-schemas.ts, change password)
  enterCurrentPassword: "Enter your current password",
  newPasswordMustDiffer: "New password must be different",
  // Actions
  currentPasswordIncorrect: "Current password is incorrect",
  githubOnlyAccount: "This account signs in with GitHub.",
} as const;

/** Toast on `/profile?password=changed`. */
export const PASSWORD_CHANGED_TOAST = { id: "password-changed", title: "Password updated" } as const;
