import { changePasswordAction } from "@/actions/account";
import { ActionForm } from "@/components/shared/ActionForm";
import { FormError, FormField } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/limits";

/**
 * Server component: `ActionForm` is the only client boundary. The page only
 * renders it for users with a password.
 */
export const ChangePasswordForm = () => {
  return (
    <ActionForm action={changePasswordAction} className="grid max-w-sm gap-4">
      <FormField
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <FormField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
      />
      <FormError />
      <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
    </ActionForm>
  );
};
