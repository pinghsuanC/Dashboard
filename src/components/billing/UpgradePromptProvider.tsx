"use client";

import { Sparkles } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { startCheckout } from "@/actions/billing";
import { ActionForm } from "@/components/shared/ActionForm";
import { SubmitButton } from "@/components/shared/SubmitButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_NAME } from "@/lib/constants/app";
import { UPGRADE_PITCH } from "@/lib/constants/messages/billing";
import { PRICING } from "@/lib/constants/pricing";
import { formatPrice, yearlySavingPercent } from "@/lib/pricing/pricing";

interface UpgradePromptContextValue {
  /** Opens the upgrade dialog, with why the action was refused when one was. */
  showUpgrade: (reason?: string) => void;
}

const UpgradePromptContext = createContext<UpgradePromptContextValue | null>(null);

export const useUpgradePrompt = () => {
  const context = useContext(UpgradePromptContext);
  if (!context) throw new Error("useUpgradePrompt must be used inside UpgradePromptProvider");
  return context;
};

const { monthlyPrice, yearlyPrice } = PRICING.pro;

/**
 * The one upgrade dialog, in the `(app)` layout. A create the Free plan
 * refuses (`code: "plan-limit"`) opens it with the server's reason; the
 * billing page's Upgrade opens it with none, and `UPGRADE_PITCH` stands in.
 * Its buttons start a checkout through `startCheckout`, which redirects to
 * the vendor or answers with a toast. The server stays the judge: this only
 * words a refusal it already made, or a pick it will make.
 */
export const UpgradePromptProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  // Kept after closing, so the text doesn't blank while the dialog fades out.
  const [reason, setReason] = useState("");

  const showUpgrade = useCallback((next: string = UPGRADE_PITCH) => {
    setReason(next);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ showUpgrade }), [showUpgrade]);

  return (
    <UpgradePromptContext value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" aria-hidden />
              Want to enjoy more of {APP_NAME}?
            </DialogTitle>
            <DialogDescription>{reason}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-stretch">
            <ActionForm action={startCheckout} className="flex-1 [&_button]:w-full">
              <input type="hidden" name="interval" value="MONTH" />
              <SubmitButton pendingLabel="Opening checkout…">{formatPrice(monthlyPrice)} / month</SubmitButton>
            </ActionForm>
            <ActionForm action={startCheckout} className="flex-1 [&_button]:w-full">
              <input type="hidden" name="interval" value="YEAR" />
              <SubmitButton pendingLabel="Opening checkout…">
                {formatPrice(yearlyPrice)} / year (save {yearlySavingPercent(monthlyPrice, yearlyPrice)}%)
              </SubmitButton>
            </ActionForm>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpgradePromptContext>
  );
};
