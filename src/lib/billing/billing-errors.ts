// Why a billing step failed. Thrown by the billing services and `lib/db`, and
// turned into a message by the actions and the webhook route; none of them
// carries user-facing wording.

/**
 * Thrown by a billing adapter when one of its settings (`STRIPE_*`, or
 * `BILLING_VENDOR` naming no vendor) is missing, before the vendor is asked
 * anything. Callers answer it with `BILLING_UNAVAILABLE`; the missing names
 * are only logged. Named like `StorageNotConfiguredError`.
 */
export class BillingNotConfiguredError extends Error {
  constructor(public readonly missing: readonly string[]) {
    super(`Billing is not configured: ${missing.join(", ")} missing`);
    this.name = "BillingNotConfiguredError";
  }
}

/**
 * A Free user reached a Free limit (`PRICING.free`) or asked for a Pro-only
 * type. Thrown inside the write's transaction, before anything is written;
 * the actions answer it with the matching limit message.
 */
export class PlanLimitError extends Error {
  constructor(public readonly limit: "items" | "collections" | "proType") {
    super(`Free plan limit reached: ${limit}`);
    this.name = "PlanLimitError";
  }
}

/**
 * A webhook body whose signature is missing or doesn't verify against the
 * vendor's signing secret. The route answers 400 and writes nothing.
 */
export class WebhookSignatureError extends Error {
  constructor(cause?: unknown) {
    super("Webhook signature is missing or invalid", { cause });
    this.name = "WebhookSignatureError";
  }
}
