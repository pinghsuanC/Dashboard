import { BillingNotConfiguredError, WebhookSignatureError } from "@/lib/billing/billing-errors";
import { WEBHOOK_FAILED, WEBHOOK_SIGNATURE_INVALID } from "@/lib/constants/messages/billing";
import { NOT_FOUND } from "@/lib/constants/messages/common";
import { settleCheckout } from "@/services/billing/entitlement";
import { adapterForSegment } from "@/services/billing/vendors";
import type { BillingAdapter, BillingWebhookEvent } from "@/types/billing";

const RECEIVED = () => Response.json({ received: true });
const FAILED = () => Response.json({ error: WEBHOOK_FAILED }, { status: 500 });

/**
 * A vendor's webhook, `/api/billing/<vendor>/webhook`. The proxy lets it
 * through signed out: it is the one route that writes without a session, and
 * it trusts nothing but a body whose signature verifies against the vendor's
 * signing secret. Even then it writes only to a `PENDING` period named by both
 * our id and the vendor's checkout id, with what the vendor reports when
 * asked again with the server's secret.
 *
 * 400 for a bad or missing signature (nothing written); 500 for a failure
 * after that, so the vendor retries (the writes are idempotent); 200 for
 * everything handled or ignored.
 */
export const POST = async (request: Request, { params }: RouteContext<"/api/billing/[vendor]/webhook">) => {
  const adapter = adapterForSegment((await params).vendor);
  if (!adapter) return Response.json({ error: NOT_FOUND }, { status: 404 });

  // The raw text: a signature only verifies against the bytes as sent.
  const body = await request.text();
  let event: BillingWebhookEvent;
  try {
    event = adapter.parseWebhook(body, request.headers);
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      return Response.json({ error: WEBHOOK_SIGNATURE_INVALID }, { status: 400 });
    }
    if (error instanceof BillingNotConfiguredError) {
      console.error("Webhook can't be verified; missing settings:", error.missing.join(", "));
    } else {
      console.error("Webhook parsing failed:", error);
    }
    return FAILED();
  }

  try {
    await handle(adapter, event);
    return RECEIVED();
  } catch (error) {
    console.error(`Webhook ${event.type} failed; the vendor will retry:`, error);
    return FAILED();
  }
};

const handle = async (adapter: BillingAdapter, event: BillingWebhookEvent) => {
  if (event.type === "checkout.expired") {
    await settleCheckout(event.periodId, event.checkoutId, { state: "expired" });
    return;
  }
  // An asynchronous payment still pending: a later event or session load settles it.
  if (event.type !== "checkout.completed" || !event.paid) return;

  // Asked again rather than read from the event, so the period written is
  // what Stripe reports now, with its dates.
  const checkout = await adapter.fetchCheckout(event.checkoutId);
  if (checkout.state !== "paid") return;

  const outcome = await settleCheckout(event.periodId, event.checkoutId, checkout);
  if (outcome !== "no-period") return;

  // Paid, but no pending period claims it: its ids don't match a row, or the
  // user deleted their account after starting the checkout (periods cascade).
  // Nobody would get Pro for it, so the subscription is cancelled at once.
  // A user or period is never created from an event.
  console.error(
    `Paid checkout ${event.checkoutId} matches no pending period (reference ${event.periodId ?? "none"}); ` +
      `cancelling subscription ${checkout.period.subscriptionId}`,
  );
  await adapter.cancelSubscription(checkout.period.subscriptionId);
};
