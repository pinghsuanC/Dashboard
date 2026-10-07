import type { z } from "zod";

import type { FieldErrors } from "@/types/forms";

/** First message per field, in the shape both `FormState` and `ActionResult` carry. */
export const fieldErrorsOf = (error: z.ZodError): FieldErrors => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] ??= issue.message;
  }
  return fieldErrors;
};
