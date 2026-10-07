"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteItem } from "@/actions/items";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { ITEM_DELETED } from "@/lib/constants/messages/items";
import { ITEM_DELETE_TOAST_ID } from "@/lib/constants/ui";

interface ItemDeleteDialogProps {
  itemId: string;
  title: string;
  /** Deleted, or found already gone: the drawer closes either way. */
  onGone: () => void;
}

/**
 * The drawer's Delete: a Trash button that asks before deleting. Needs only
 * the id, so it works before the body has loaded.
 *
 * As in `DeleteAccountDialog`, Delete is a plain button, not
 * `AlertDialogAction` (which closes on click), and Cancel and Escape are
 * blocked while the delete runs: closing wouldn't stop it, only hide it.
 * Any other failure leaves the dialog open to try again.
 */
export const ItemDeleteDialog = ({ itemId, title, onGone }: ItemDeleteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [deleting, startDeleting] = useTransition();

  const handleDelete = () => {
    startDeleting(async () => {
      try {
        const result = await deleteItem(itemId);
        if (result.success) {
          toast.success(ITEM_DELETED, { id: ITEM_DELETE_TOAST_ID });
        } else {
          toast.error(result.error.message, { id: ITEM_DELETE_TOAST_ID });
          if (result.error.code !== "not-found") return;
        }
        setOpen(false);
        onGone();
      } catch {
        toast.error(SOMETHING_WENT_WRONG, { id: ITEM_DELETE_TOAST_ID });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-destructive">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-medium break-words">{title}</span> will be
            permanently deleted and removed from its collections. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
