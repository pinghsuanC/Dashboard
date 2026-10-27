import { subscriptionState } from "@/lib/billing/plan-rules";
import { SUBSCRIPTIONS_PER_PAGE } from "@/lib/constants/limits";
import { loadPage } from "@/lib/helpers/pagination";
import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { BillingCustomer, PastSubscription } from "@/types/billing";
import type { Paginated } from "@/types/pagination";

/**
 * Every vendor customer the signed-in user has paid through, newest first,
 * each once: for the billing portal (the newest) and account deletion (all of
 * them). Scoped to the session user, so another user's customer is never
 * returned. Only paid rows have a customer (settling writes it); granted
 * periods have none and are left out.
 */
export const getBillingCustomers = async (): Promise<BillingCustomer[]> => {
  const userId = await requireCurrentUserId();
  const rows = await prisma.subscriptionPeriod.findMany({
    where: { userId, vendor: { not: null }, vendorCustomerId: { not: null } },
    distinct: ["vendor", "vendorCustomerId"],
    orderBy: [{ createdAt: "desc" }],
    select: { vendor: true, vendorCustomerId: true },
  });
  // The filter makes both non-null; the generated types can't know that.
  return rows.flatMap(({ vendor, vendorCustomerId }) =>
    vendor && vendorCustomerId ? [{ vendor, customerId: vendorCustomerId }] : [],
  );
};

/**
 * One page of the signed-in user's subscriptions for `/billings`, newest
 * first: every `PAID` period, granted ones included, never a pending or
 * abandoned checkout, and no vendor ids.
 */
export const getSubscriptionsPage = async (page: number = 1): Promise<Paginated<PastSubscription>> => {
  const userId = await requireCurrentUserId();
  const where = { userId, status: "PAID" } as const;
  return loadPage(
    page,
    SUBSCRIPTIONS_PER_PAGE,
    () => prisma.subscriptionPeriod.count({ where }),
    async (skip) =>
      (
        await prisma.subscriptionPeriod.findMany({
          where,
          // Every PAID write sets periodStart; id keeps equal starts in one order.
          orderBy: [{ periodStart: "desc" }, { id: "desc" }],
          skip,
          take: SUBSCRIPTIONS_PER_PAGE,
          select: { id: true, vendor: true, interval: true, periodStart: true, periodEnd: true },
        })
      ).map(({ id, vendor, interval, periodStart, periodEnd }) => ({
        id,
        interval,
        source: vendor ? "paid" : "granted",
        periodStart,
        periodEnd,
        state: subscriptionState({ periodEnd }),
      })),
  );
};
