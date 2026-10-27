"use client";

import { Sparkles } from "lucide-react";

import { useUpgradePrompt } from "@/components/billing/UpgradePromptProvider";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate } from "@/lib/helpers/format";

/**
 * The plan from the user session: no query. Pro shows when the current
 * period ends, never "renews": a cancel in the portal isn't recorded yet.
 * A granted period (a trial) is Pro like a paid one, so it gets no Upgrade.
 */
export const PlanCard = () => {
  const { billing } = useUserSession();
  const { showUpgrade } = useUpgradePrompt();

  if (billing.plan === "FREE") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Free plan</CardTitle>
          <CardDescription>Upgrade to enjoy more</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => showUpgrade()}>
            <Sparkles aria-hidden />
            Upgrade
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" aria-hidden />
          Pro plan
        </CardTitle>
        <CardDescription>
          {billing.interval === "YEAR" ? "Yearly" : "Monthly"}
          {billing.periodEnd ? ` · Current period ends ${formatLongDate(billing.periodEnd)}` : null}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};
