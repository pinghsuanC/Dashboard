"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCollection } from "@/actions/collections";
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
import { COLLECTION_DELETED } from "@/lib/constants/messages/collections";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { ROUTES } from "@/lib/constants/routes";
import { COLLECTION_DELETE_TOAST_ID } from "@/lib/constants/ui";

interface CollectionDeleteDialogProps {
  collectionId: string;
  name: string;
}

/**
 * The collection page's Delete: a Trash button that asks first, then sends
 * the user to the collections list. Only the collection goes; its items stay.
 *
 * As in `ItemDeleteDialog`, Delete is a plain button, not
 * `AlertDialogAction` (which closes on click), and Cancel and Escape are
 * blocked while the delete runs. Found already gone counts as deleted; any
 * other failure leaves the dialog open to try again.
 */
export const CollectionDeleteDialog = ({ collectionId, name }: CollectionDeleteDialogProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, startDeleting] = useTransition();

  const handleDelete = () => {
    startDeleting(async () => {
      try {
        const result = await deleteCollection(collectionId);
        if (result.success) {
          toast.success(COLLECTION_DELETED, { id: COLLECTION_DELETE_TOAST_ID });
        } else {
          toast.error(result.error.message, { id: COLLECTION_DELETE_TOAST_ID });
          if (result.error.code !== "not-found") return;
        }
        setOpen(false);
        router.replace(ROUTES.collections);
      } catch {
        toast.error(SOMETHING_WENT_WRONG, { id: COLLECTION_DELETE_TOAST_ID });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Delete collection" className="text-destructive">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground font-medium break-words">{name}</span> will be permanently
            deleted. Its items are kept; only the collection is removed. This cannot be undone.
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
