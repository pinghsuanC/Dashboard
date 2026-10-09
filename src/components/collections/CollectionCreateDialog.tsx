"use client";

import { useRef, useState, useTransition } from "react";
import { FolderPlus, Star } from "lucide-react";
import { toast } from "sonner";

import { createCollection } from "@/actions/collections";
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
import { COLLECTION_CREATED } from "@/lib/constants/messages/collections";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { COLLECTION_CREATE_TOAST_ID } from "@/lib/constants/ui";
import type { CollectionDraft } from "@/types/collections";
import type { FieldErrors } from "@/types/forms";

const EMPTY_DRAFT: CollectionDraft = { name: "", description: "", isFavorite: false };

/**
 * The top bar's New Collection button and its dialog: name, description and
 * favourite. The server action validates, trims and slugs; this only sends.
 * On success the action refreshes the session, so the sidebar, dashboard
 * cards and stats pick the new collection up.
 *
 * As in `ItemCreateDialog`, the draft outlives a dismiss and is cleared once
 * the collection is created, and the dialog can't be closed while saving.
 */
export const CollectionCreateDialog = () => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [creating, startCreating] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (creating) return;
    setOpen(next);
    if (!next) setFieldErrors({});
  };

  // Editing a field drops its error, so a stale "name taken" doesn't linger.
  const setField = <K extends keyof CollectionDraft>(key: K, value: CollectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startCreating(async () => {
      try {
        const result = await createCollection(draft);
        if (result.success) {
          toast.success(COLLECTION_CREATED, { id: COLLECTION_CREATE_TOAST_ID });
          setOpen(false);
          setDraft(EMPTY_DRAFT);
          setFieldErrors({});
          return;
        }
        toast.error(result.error.message, { id: COLLECTION_CREATE_TOAST_ID });
        setFieldErrors(result.error.fieldErrors ?? {});
      } catch {
        toast.error(SOMETHING_WENT_WRONG, { id: COLLECTION_CREATE_TOAST_ID });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus />
          {/* Icon only on phones, where the top bar is tight; still named for screen readers. */}
          <span className="sr-only sm:not-sr-only">New Collection</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={!creating}
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>Group related items under one name.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="collection-create-name">Name</Label>
            <Input
              id="collection-create-name"
              ref={nameRef}
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
              required
              maxLength={COLLECTION_NAME_MAX_LENGTH}
              disabled={creating}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? "collection-create-name-error" : undefined}
            />
            {fieldErrors.name && (
              <p id="collection-create-name-error" className="text-destructive text-sm">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="collection-create-description">Description</Label>
            <Textarea
              id="collection-create-description"
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
              rows={3}
              maxLength={COLLECTION_DESCRIPTION_MAX_LENGTH}
              disabled={creating}
              aria-invalid={fieldErrors.description ? true : undefined}
              aria-describedby={fieldErrors.description ? "collection-create-description-error" : undefined}
            />
            {fieldErrors.description && (
              <p id="collection-create-description-error" className="text-destructive text-sm">
                {fieldErrors.description}
              </p>
            )}
          </div>

          <label className="hover:bg-muted/40 has-focus-visible:ring-ring/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-50">
            <input
              type="checkbox"
              checked={draft.isFavorite}
              onChange={(event) => setField("isFavorite", event.target.checked)}
              disabled={creating}
              // Hidden: the star is the visible toggle; the input keeps it a
              // real checkbox for keyboards and screen readers.
              className="peer sr-only"
            />
            <Star
              aria-hidden
              className="text-muted-foreground peer-checked:fill-amber-400 peer-checked:text-amber-400 size-4 transition-colors"
            />
            Add to favourites
          </label>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={creating}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={creating || !draft.name.trim()}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
