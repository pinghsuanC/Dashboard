/** One message per field name. Shared by both result shapes below. */
export type FieldErrors = Record<string, string | undefined>;

/** What a form server action returns to `ActionForm` after a failed submit. */
export interface FormState {
  /** A message for the whole form, e.g. wrong credentials. */
  error?: string;
  fieldErrors?: FieldErrors;
  /** Shown as an error toast instead of inline, e.g. a rate-limit wait. */
  toast?: string;
}

export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * What a server action called directly from client code returns, for
 * controlled-input forms that need the saved record back (item edit, create
 * and delete). `success` narrows it: `data` only exists on success.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        /** For the whole form, shown as a toast. */
        message: string;
        fieldErrors?: FieldErrors;
        /** Set when the record is gone (or never was the user's), so the client can stop showing it. */
        code?: "not-found";
      };
    };
