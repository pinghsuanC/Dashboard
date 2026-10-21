"use client";

import { useActionForm } from "@/components/shared/ActionForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.ComponentProps<typeof Input> {
  name: string;
  label: string;
  /** Shown at the end of the label row, e.g. a "Forgot password?" link. */
  labelAction?: React.ReactNode;
}

/**
 * Label, input and its error, wired together for screen readers. A client
 * leaf only so it can read its error from the surrounding `ActionForm`.
 */
export const FormField = ({ name, label, labelAction, ...inputProps }: FormFieldProps) => {
  const error = useActionForm().state.fieldErrors?.[name];
  const errorId = `${name}-error`;

  return (
    <div className="grid gap-2">
      {labelAction ? (
        <div className="flex items-center justify-between">
          <Label htmlFor={name}>{label}</Label>
          {labelAction}
        </div>
      ) : (
        <Label htmlFor={name}>{label}</Label>
      )}
      <Input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
        className={cn("max-md:h-11", inputProps.className)}
      />
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
};

/** The form-level message from the surrounding `ActionForm`, if any. */
export const FormError = () => {
  const { error } = useActionForm().state;
  if (!error) return null;

  return (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  );
};
