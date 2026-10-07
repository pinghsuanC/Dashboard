"use client";

import { type ReactNode, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { updateItem } from "@/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { editableFieldsFor } from "@/lib/constants/item-types";
import {
  ITEM_CONTENT_MAX_LENGTH,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_TITLE_MAX_LENGTH,
} from "@/lib/constants/limits";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { ITEM_SAVED } from "@/lib/constants/messages/items";
import { ITEM_SAVE_TOAST_ID } from "@/lib/constants/ui";
import type { FieldErrors } from "@/types/forms";
import type { ItemDetail } from "@/types/items";

interface ItemEditFormProps {
  item: ItemDetail;
  onCancel: () => void;
  /** The saved item, as the server returned it. */
  onSaved: (item: ItemDetail) => void;
  /** The item no longer exists (or isn't the user's): stop showing it. */
  onGone: () => void;
  /** Read-only details shown under the fields (collections, dates). */
  children?: ReactNode;
}

interface EditFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

/** Label, control and error, wired together for screen readers. */
const EditField = ({ id, label, error, hint, children }: EditFieldProps) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(describedBy)}
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

const toDraft = (item: ItemDetail) => ({
  title: item.title,
  description: item.description ?? "",
  content: item.content ?? "",
  language: item.language ?? "",
  url: item.url ?? "",
  tags: item.tags.join(", "),
});

type Draft = ReturnType<typeof toDraft>;

/**
 * The item drawer in edit mode: controlled inputs for the fields this item's
 * type edits (`editableFieldsFor`), with Save and Cancel in place of the
 * action bar. The server action validates and trims; this only sends.
 */
export const ItemEditForm = ({ item, onCancel, onSaved, onGone, children }: ItemEditFormProps) => {
  const fields = editableFieldsFor(item.type.name);
  const [draft, setDraft] = useState(() => toDraft(item));
  const initialTags = toDraft(item).tags;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, startSaving] = useTransition();

  const bind = (key: keyof Draft) => ({
    id: `item-edit-${key}`,
    value: draft[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((current) => ({ ...current, [key]: event.target.value })),
  });
  const invalid = (key: keyof Draft) => (fieldErrors[key] ? true : undefined);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startSaving(async () => {
      try {
        const result = await updateItem(item.id, {
          title: draft.title,
          description: draft.description,
          // Left out when untouched, so a save doesn't relink the same tags.
          ...(draft.tags !== initialTags && { tags: draft.tags.split(",") }),
          ...(fields.includes("content") && { content: draft.content }),
          ...(fields.includes("language") && { language: draft.language }),
          ...(fields.includes("url") && { url: draft.url }),
        });
        if (result.success) {
          toast.success(ITEM_SAVED, { id: ITEM_SAVE_TOAST_ID });
          onSaved(result.data);
          return;
        }
        toast.error(result.error.message, { id: ITEM_SAVE_TOAST_ID });
        if (result.error.code === "not-found") onGone();
        else setFieldErrors(result.error.fieldErrors ?? {});
      } catch {
        toast.error(SOMETHING_WENT_WRONG, { id: ITEM_SAVE_TOAST_ID });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex items-center justify-end gap-1 border-b px-6 pb-4">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving || !draft.title.trim()}>
          <Check />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <EditField id="item-edit-title" label="Title" error={fieldErrors.title}>
          {(describedBy) => (
            <Input
              {...bind("title")}
              required
              maxLength={ITEM_TITLE_MAX_LENGTH}
              aria-invalid={invalid("title")}
              aria-describedby={describedBy}
            />
          )}
        </EditField>

        <EditField id="item-edit-description" label="Description" error={fieldErrors.description}>
          {(describedBy) => (
            <Textarea
              {...bind("description")}
              rows={2}
              maxLength={ITEM_DESCRIPTION_MAX_LENGTH}
              aria-invalid={invalid("description")}
              aria-describedby={describedBy}
            />
          )}
        </EditField>

        {fields.includes("content") && (
          <EditField id="item-edit-content" label="Content" error={fieldErrors.content}>
            {(describedBy) => (
              <Textarea
                {...bind("content")}
                rows={10}
                maxLength={ITEM_CONTENT_MAX_LENGTH}
                spellCheck={false}
                className="font-mono text-xs leading-relaxed md:text-xs"
                aria-invalid={invalid("content")}
                aria-describedby={describedBy}
              />
            )}
          </EditField>
        )}

        {fields.includes("language") && (
          <EditField id="item-edit-language" label="Language" error={fieldErrors.language}>
            {(describedBy) => (
              <Input
                {...bind("language")}
                placeholder="typescript"
                aria-invalid={invalid("language")}
                aria-describedby={describedBy}
              />
            )}
          </EditField>
        )}

        {fields.includes("url") && (
          <EditField id="item-edit-url" label="URL" error={fieldErrors.url}>
            {(describedBy) => (
              <Input
                {...bind("url")}
                type="url"
                required
                placeholder="https://"
                aria-invalid={invalid("url")}
                aria-describedby={describedBy}
              />
            )}
          </EditField>
        )}

        <EditField
          id="item-edit-tags"
          label="Tags"
          error={fieldErrors.tags}
          hint="Separate tags with commas"
        >
          {(describedBy) => (
            <Input
              {...bind("tags")}
              placeholder="react, hooks"
              aria-invalid={invalid("tags")}
              aria-describedby={describedBy}
            />
          )}
        </EditField>

        {children}
      </div>
    </form>
  );
};
