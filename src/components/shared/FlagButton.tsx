"use client";

import { type ComponentProps, type ReactNode, useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { FLAG_TOAST_ID } from "@/lib/constants/ui";
import type { ActionResult } from "@/types/forms";

interface FlagButtonProps extends Omit<ComponentProps<typeof Button>, "value" | "onClick" | "children" | "className"> {
  /** The saved value: from the server, or the drawer's copy of the item. */
  value: boolean;
  /** Saves the new value; the action refreshes the page and session. */
  save: (next: boolean) => Promise<ActionResult<null>>;
  /** The save succeeded: for a parent whose `value` isn't re-sent by the server. */
  onSaved?: (next: boolean) => void;
  /** The record is gone, or was never the user's. */
  onGone?: () => void;
  className?: (shown: boolean) => string | undefined;
  children: (shown: boolean) => ReactNode;
}

/**
 * A favourite or pin toggle. It shows the new value at once and sends it
 * (never "flip"), so a double click can't undo itself; it is disabled while
 * the save runs. The optimistic value lasts only for the save's transition,
 * so a failure falls back to `value` with nothing to undo by hand, and a
 * success shows the value the refresh or `onSaved` brings.
 */
export const FlagButton = ({ value, save, onSaved, onGone, className, children, ...props }: FlagButtonProps) => {
  const [shown, setShown] = useOptimistic(value);
  const [saving, startSaving] = useTransition();

  const handleClick = () => {
    const next = !shown;
    startSaving(async () => {
      setShown(next);
      try {
        const result = await save(next);
        if (result.success) {
          onSaved?.(next);
          return;
        }
        toast.error(result.error.message, { id: FLAG_TOAST_ID });
        if (result.error.code === "not-found") onGone?.();
      } catch {
        toast.error(SOMETHING_WENT_WRONG, { id: FLAG_TOAST_ID });
      }
    });
  };

  return (
    <Button {...props} aria-pressed={shown} disabled={saving} onClick={handleClick} className={className?.(shown)}>
      {children(shown)}
    </Button>
  );
};
