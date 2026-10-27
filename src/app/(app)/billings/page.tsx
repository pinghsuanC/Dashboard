import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PastBillsCard } from "@/components/billing/PastBillsCard";
import { PlanCard } from "@/components/billing/PlanCard";
import { SubscriptionList } from "@/components/billing/SubscriptionList";
import { FlagToast } from "@/components/shared/FlagToast";
import { SubscriptionListSkeleton } from "@/components/skeleton/SubscriptionListSkeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasFlag } from "@/lib/auth/auth-redirect";
import { BILLING_CANCELED_TOAST, BILLING_SUCCESS_TOAST } from "@/lib/constants/messages/billing";
import { FLAGS, PAGE_PARAM, ROUTES } from "@/lib/constants/routes";
import { getSubscriptionsPage } from "@/lib/db/billing";
import { isPastLastPage, parsePageParam } from "@/lib/helpers/pagination";

export const metadata: Metadata = { title: "Billing" };

/** The slow part, streamed behind the skeleton: one page of past subscriptions. */
const Subscriptions = async ({ page }: { page: number }) => {
  const subscriptions = await getSubscriptionsPage(page);
  // A stale page link; page 1 always exists, so this never loops.
  if (isPastLastPage(subscriptions)) redirect(ROUTES.billings);

  return <SubscriptionList {...subscriptions} />;
};

/**
 * The plan and past bills come from the user session the `(app)` layout
 * loaded; only the past subscriptions are queried, one page per visit.
 * Checkout and the portal return here, and a full load after Checkout is
 * what settles the payment (`getUserSession()`), so the plan card is current.
 */
const BillingsPage = async ({ searchParams }: PageProps<"/billings">) => {
  const params = await searchParams;
  const page = parsePageParam(params[PAGE_PARAM]);
  const paid = hasFlag(params, FLAGS.billingSuccess);
  const canceled = hasFlag(params, FLAGS.billingCanceled);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {paid ? <FlagToast {...BILLING_SUCCESS_TOAST} href={ROUTES.billings} /> : null}
      {canceled ? <FlagToast {...BILLING_CANCELED_TOAST} href={ROUTES.billings} /> : null}

      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">Your plan, subscriptions and bills</p>
      </header>

      <PlanCard />

      <Card>
        <CardHeader>
          <CardTitle>Past subscriptions</CardTitle>
          <CardDescription>Every period of Pro, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Keyed by page so a page turn shows the skeleton again. */}
          <Suspense key={page} fallback={<SubscriptionListSkeleton />}>
            <Subscriptions page={page} />
          </Suspense>
        </CardContent>
      </Card>

      <PastBillsCard />
    </div>
  );
};

export default BillingsPage;
