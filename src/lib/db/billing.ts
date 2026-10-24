import { requireCurrentUserId } from "@/services/auth/session";
import { prisma } from "@/services/prisma";
import type { BillingCustomer } from "@/types/billing";

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
