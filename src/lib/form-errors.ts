import type { z } from "zod";

import type { FormState } from "@/types/forms";

/** First message per field, in the shape `ActionForm` reads. */
export const fieldErrorsOf = (error: z.ZodError): FormState["fieldErrors"] => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[String(issue.path[0])] ??= issue.message;
  }
  return fieldErrors;
};
