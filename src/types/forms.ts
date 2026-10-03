/** What a form server action returns to `ActionForm` after a failed submit. */
export interface FormState {
  /** A message for the whole form, e.g. wrong credentials. */
  error?: string;
  /** One message per field name. */
  fieldErrors?: Record<string, string | undefined>;
  /** Shown as an error toast instead of inline, e.g. a rate-limit wait. */
  toast?: string;
}

export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;
