"use client";

import { openBillingPortal } from "@/actions/billing";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { ActionForm } from "@/components/shared/ActionForm";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Bills stay with the vendor: this sends the user to its portal, which lists
 * every invoice with its amount and receipt. Shown to anyone who has paid
 * through a vendor, whatever their plan is now; a trial alone has no bills.
 */
export const PastBillsCard = () => {
  const { billing } = useUserSession();
  if (!billing.isCustomer) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Past bills</CardTitle>
        <CardDescription>Amounts, receipts and payment methods, on our payment provider&apos;s site.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={openBillingPortal}>
          <SubmitButton pendingLabel="Opening…">
            View past bills
          </SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
};
