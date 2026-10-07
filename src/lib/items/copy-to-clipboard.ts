import { toast } from "sonner";

import { ITEM_COPIED, ITEM_COPY_FAILED } from "@/lib/constants/messages/items";
import { ITEM_COPY_TOAST_ID } from "@/lib/constants/ui";

/**
 * Copies item text and toasts the outcome. Shared by the drawer's Copy and
 * the code editor's header, so both update the same toast. Resolves to
 * whether the copy worked, for callers that also swap an icon.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ITEM_COPIED, { id: ITEM_COPY_TOAST_ID });
    return true;
  } catch {
    toast.error(ITEM_COPY_FAILED, { id: ITEM_COPY_TOAST_ID });
    return false;
  }
};
