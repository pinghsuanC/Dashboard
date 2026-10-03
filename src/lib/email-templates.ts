export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The link from `/api/auth/verify-email`, sent on register and on resend. */
export const verificationEmail = (link: string): EmailTemplate => ({
  subject: "Verify your email",
  text: `Confirm your email to finish creating your account:\n\n${link}\n\nThe link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
  html: `<p>Confirm your email to finish creating your account.</p>
<p><a href="${escapeHtml(link)}">Verify email</a></p>
<p>The link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>`,
});

/** The link to `/reset-password`, sent from the forgot-password page. */
export const passwordResetEmail = (link: string): EmailTemplate => ({
  subject: "Reset your password",
  text: `Use this link to choose a new password:\n\n${link}\n\nThe link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email.`,
  html: `<p>Use the link below to choose a new password.</p>
<p><a href="${escapeHtml(link)}">Reset password</a></p>
<p>The link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email.</p>`,
});

/**
 * Sent instead of a verification link when someone registers with an email
 * that already has an account, so the register form never says it's taken.
 */
export const accountExistsEmail = (signInLink: string, resetLink: string): EmailTemplate => ({
  subject: "You already have an account",
  text: `Someone tried to create an account with this email, but you already have one.\n\nSign in: ${signInLink}\nForgot your password? ${resetLink}\n\nIf this wasn't you, you can ignore this email. Your account hasn't changed.`,
  html: `<p>Someone tried to create an account with this email, but you already have one.</p>
<p><a href="${escapeHtml(signInLink)}">Sign in</a> · <a href="${escapeHtml(resetLink)}">Reset your password</a></p>
<p>If this wasn't you, you can ignore this email. Your account hasn't changed.</p>`,
});
