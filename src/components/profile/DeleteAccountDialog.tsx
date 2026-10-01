"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteAccountAction } from "@/actions/account";
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

/**
 * Pending lives here, not in a `useFormStatus` leaf, because the dialog needs
 * it too: closing mid-delete wouldn't stop the action, only hide its progress,
 * so Cancel and Escape are blocked until the redirect lands.
 *
 * A plain submit, not `AlertDialogAction`, which closes the dialog on click.
 * The action takes no input; it deletes the session user. On failure it
 * returns a message and the dialog stays open to show it.
 */
export const DeleteAccountDialog = () => {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteAccountAction, {});

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 />
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account with all of its items, collections and tags. It
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.error ? (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : null}
        <form action={formAction}>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
