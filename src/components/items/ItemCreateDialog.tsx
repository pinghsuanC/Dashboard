"use client";

import { type CSSProperties, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createItem } from "@/actions/items";
import { ItemFormFields } from "@/components/items/ItemFormFields";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { TypeIcon } from "@/components/shared/TypeIcon";
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
import { CREATABLE_ITEM_TYPE_NAMES, editableFieldsFor } from "@/lib/constants/item-types";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { ITEM_CREATED } from "@/lib/constants/messages/items";
import { ITEM_CREATE_TOAST_ID } from "@/lib/constants/ui";
import type { FieldErrors } from "@/types/forms";
import type { ItemDraft } from "@/types/items";

const EMPTY_DRAFT: ItemDraft = { title: "", description: "", content: "", language: "", url: "", tags: "" };

/**
 * The top bar's New Item button and its dialog: a type picker, then the
 * fields that type uses. The server action validates and trims; this only
 * sends.
 *
 * The draft outlives a dismiss, so a stray click outside doesn't lose it, and
 * is cleared once the item is created. As in `ItemDeleteDialog`, the dialog
 * can't be closed while the create runs: closing wouldn't stop it.
 */
export const ItemCreateDialog = () => {
  const { itemTypes } = useUserSession();
  // In the dialog's own order; a type missing from the session isn't offered.
  const types = CREATABLE_ITEM_TYPE_NAMES.flatMap((name) => itemTypes.filter((type) => type.name === name));

  const [open, setOpen] = useState(false);
  // Null until the user picks: the first type shown, so the selection always
  // matches a visible option even if the session lacks one of the types.
  const [pickedType, setPickedType] = useState<string | null>(null);
  const typeName = pickedType ?? types[0]?.name ?? "";
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [creating, startCreating] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const fields = editableFieldsFor(typeName);

  const handleOpenChange = (next: boolean) => {
    if (creating) return;
    setOpen(next);
    if (!next) setFieldErrors({});
  };

  const selectType = (name: string) => {
    setPickedType(name);
    setFieldErrors({});
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startCreating(async () => {
      try {
        const result = await createItem(typeName, {
          title: draft.title,
          description: draft.description,
          tags: draft.tags.split(","),
          ...(fields.includes("content") && { content: draft.content }),
          ...(fields.includes("language") && { language: draft.language }),
          ...(fields.includes("url") && { url: draft.url }),
        });
        if (result.success) {
          toast.success(ITEM_CREATED, { id: ITEM_CREATE_TOAST_ID });
          setOpen(false);
          setDraft(EMPTY_DRAFT);
          setFieldErrors({});
          return;
        }
        toast.error(result.error.message, { id: ITEM_CREATE_TOAST_ID });
        setFieldErrors(result.error.fieldErrors ?? {});
      } catch {
        toast.error(SOMETHING_WENT_WRONG, { id: ITEM_CREATE_TOAST_ID });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New Item
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={!creating}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        // Title, not the type picker: most items keep the type and start with a title.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
          <DialogDescription>Pick a type, then fill in its details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
          <fieldset className="grid gap-2" disabled={creating}>
            <legend className="mb-2 text-sm font-medium">Type</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {types.map((type) => (
                <label
                  key={type.id}
                  style={{ "--type-color": type.color } as CSSProperties}
                  className="hover:bg-muted/40 has-checked:border-(--type-color) has-checked:bg-(--type-color)/10 has-focus-visible:ring-ring/50 flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors has-focus-visible:ring-3"
                >
                  <input
                    type="radio"
                    name="item-create-type"
                    value={type.name}
                    checked={typeName === type.name}
                    onChange={() => selectType(type.name)}
                    className="sr-only"
                  />
                  {/* Hidden: the label text already names the type. */}
                  <span aria-hidden>
                    <TypeIcon type={type} className="size-4" />
                  </span>
                  {type.label}
                </label>
              ))}
            </div>
          </fieldset>

          <ItemFormFields
            idPrefix="item-create"
            typeName={typeName}
            fields={fields}
            draft={draft}
            onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
            fieldErrors={fieldErrors}
            contentRows={6}
            titleRef={titleRef}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={creating}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={creating || !draft.title.trim()}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
