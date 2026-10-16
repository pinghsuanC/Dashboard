"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Pencil, Star } from "lucide-react";
import { toast } from "sonner";

import { createCollection, updateCollection } from "@/actions/collections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLLECTION_DESCRIPTION_MAX_LENGTH, COLLECTION_NAME_MAX_LENGTH } from "@/lib/constants/limits";
import { COLLECTION_CREATED, COLLECTION_UPDATED } from "@/lib/constants/messages/collections";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { collectionHref, ROUTES } from "@/lib/constants/routes";
import { COLLECTION_CREATE_TOAST_ID, COLLECTION_SAVE_TOAST_ID } from "@/lib/constants/ui";
import type { CollectionDraft, CollectionHeader } from "@/types/collections";
import type { FieldErrors } from "@/types/forms";

const EMPTY_DRAFT: CollectionDraft = { name: "", description: "", isFavorite: false };

const draftOf = (collection: CollectionHeader): CollectionDraft => ({
  name: collection.name,
  description: collection.description ?? "",
  isFavorite: collection.isFavorite,
});

interface CollectionDialogProps {
  /** The collection to edit; left out, the dialog creates one. */
  collection?: CollectionHeader;
}

/**
 * One dialog for both New Collection (the top bar's button) and Edit (the
 * collection page's button): name, description and favourite. The server
 * actions validate, trim and slug; this only sends. On success the action
 * refreshes the session, so the sidebar, dashboard cards and stats follow.
 *
 * Creating, as in `ItemCreateDialog`, the draft outlives a dismiss and is
 * cleared once the collection is created. Editing starts from the saved
 * collection on every open, and a rename moves the page to the new slug's
 * URL. Either way the dialog can't be closed while saving.
 */
export const CollectionDialog = ({ collection }: CollectionDialogProps) => {
  const editing = collection !== undefined;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, startSaving] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const toastId = editing ? COLLECTION_SAVE_TOAST_ID : COLLECTION_CREATE_TOAST_ID;
  const fieldId = (field: string) => `collection-${editing ? "edit" : "create"}-${field}`;

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    if (next && collection) setDraft(draftOf(collection));
    setOpen(next);
    if (!next) setFieldErrors({});
  };

  // Editing a field drops its error, so a stale "name taken" doesn't linger.
  const setField = <K extends keyof CollectionDraft>(key: K, value: CollectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const close = () => {
    setOpen(false);
    setFieldErrors({});
  };

  const create = async () => {
    const result = await createCollection(draft);
    if (result.success) {
      toast.success(COLLECTION_CREATED, { id: toastId });
      close();
      setDraft(EMPTY_DRAFT);
      return;
    }
    toast.error(result.error.message, { id: toastId });
    setFieldErrors(result.error.fieldErrors ?? {});
  };

  const update = async ({ id, slug }: CollectionHeader) => {
    const result = await updateCollection(id, draft);
    if (result.success) {
      toast.success(COLLECTION_UPDATED, { id: toastId });
      close();
      // A rename changes the slug, and the old URL no longer finds it.
      if (result.data.slug !== slug) router.replace(collectionHref(result.data.slug));
      return;
    }
    toast.error(result.error.message, { id: toastId });
    if (result.error.code === "not-found") {
      close();
      router.replace(ROUTES.collections);
      return;
    }
    setFieldErrors(result.error.fieldErrors ?? {});
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startSaving(async () => {
      try {
        await (collection ? update(collection) : create());
      } catch {
        toast.error(SOMETHING_WENT_WRONG, { id: toastId });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" size="icon" aria-label="Edit collection">
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline">
            <FolderPlus />
            {/* Icon only on phones, where the top bar is tight; still named for screen readers.
                `max-sm:sr-only`, not `sm:not-sr-only`: the latter also sets `white-space: normal`,
                which lets the top bar's grid size this column as if the label could wrap,
                so the actions overflow onto the search box. */}
            <span className="max-sm:sr-only">New Collection</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        showCloseButton={!saving}
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{editing ? "Edit collection" : "New collection"}</DialogTitle>
          <DialogDescription>
            {editing ? "Change its name, description or favourite." : "Group related items under one name."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
          <div className="grid gap-2">
            <Label htmlFor={fieldId("name")}>Name</Label>
            <Input
              id={fieldId("name")}
              ref={nameRef}
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
              required
              maxLength={COLLECTION_NAME_MAX_LENGTH}
              disabled={saving}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? fieldId("name-error") : undefined}
            />
            {fieldErrors.name && (
              <p id={fieldId("name-error")} className="text-destructive text-sm">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={fieldId("description")}>Description</Label>
            <Textarea
              id={fieldId("description")}
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={3}
              maxLength={COLLECTION_DESCRIPTION_MAX_LENGTH}
              disabled={saving}
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? fieldId("description-error") : undefined}
            />
            {fieldErrors.description && (
              <p id={fieldId("description-error")} className="text-destructive text-sm">
                {fieldErrors.description}
              </p>
            )}
          </div>

          <label className="hover:bg-muted/40 has-focus-visible:ring-ring/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-50">
            <input
              type="checkbox"
              checked={draft.isFavorite}
              onChange={(event) => setField("isFavorite", event.target.checked)}
              disabled={saving}
              // Hidden: the star is the visible toggle; the input keeps it a
              // real checkbox for keyboards and screen readers.
              className="peer sr-only"
            />
            <Star
              aria-hidden
              className="text-muted-foreground peer-checked:fill-amber-400 peer-checked:text-amber-400 size-4 transition-colors"
            />
            {editing ? "Favourite" : "Add to favourites"}
          </label>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !draft.name.trim()}>
              {editing ? (saving ? "Saving…" : "Save") : saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
