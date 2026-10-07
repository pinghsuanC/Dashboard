import type { ReactNode, Ref } from "react";

import { CodeEditor } from "@/components/items/CodeEditor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isCodeItemType } from "@/lib/constants/item-types";
import {
  ITEM_CONTENT_MAX_LENGTH,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_TITLE_MAX_LENGTH,
} from "@/lib/constants/limits";
import type { FieldErrors } from "@/types/forms";
import type { EditableItemField, ItemDraft } from "@/types/items";

interface ItemFormFieldsProps {
  /** Prefixes the input ids, so the drawer and the dialog never share one. */
  idPrefix: string;
  /** The item type's name: snippet and command content opens in the code editor. */
  typeName: string;
  /** Body fields the item's type uses (`editableFieldsFor`). */
  fields: readonly EditableItemField[];
  draft: ItemDraft;
  onChange: (key: keyof ItemDraft, value: string) => void;
  fieldErrors: FieldErrors;
  /** Lines in the content box or code editor: tall in the drawer, shorter in the dialog. */
  contentRows?: number;
  /** For a parent that focuses the title, e.g. when the dialog opens. */
  titleRef?: Ref<HTMLInputElement>;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

/** Label, control and error, wired together for screen readers. */
const Field = ({ id, label, error, hint, children }: FieldProps) => {
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

/**
 * The item form's inputs, shared by the drawer's edit mode and the New Item
 * dialog: title, description and tags for every type, and the body fields
 * the type uses. Controlled; the parent owns the draft and the submit.
 */
export const ItemFormFields = ({
  idPrefix,
  typeName,
  fields,
  draft,
  onChange,
  fieldErrors,
  contentRows = 10,
  titleRef,
}: ItemFormFieldsProps) => {
  const bind = (key: keyof ItemDraft) => ({
    id: `${idPrefix}-${key}`,
    value: draft[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(key, event.target.value),
    "aria-invalid": fieldErrors[key] ? true : undefined,
  });

  return (
    <>
      <Field id={`${idPrefix}-title`} label="Title" error={fieldErrors.title}>
        {(describedBy) => (
          <Input
            {...bind("title")}
            ref={titleRef}
            required
            maxLength={ITEM_TITLE_MAX_LENGTH}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <Field id={`${idPrefix}-description`} label="Description" error={fieldErrors.description}>
        {(describedBy) => (
          <Textarea
            {...bind("description")}
            rows={2}
            maxLength={ITEM_DESCRIPTION_MAX_LENGTH}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      {fields.includes("content") && (
        <Field id={`${idPrefix}-content`} label="Content" error={fieldErrors.content}>
          {(describedBy) =>
            isCodeItemType(typeName) ? (
              <CodeEditor
                id={`${idPrefix}-content`}
                value={draft.content}
                onChange={(value) => onChange("content", value)}
                language={draft.language}
                minLines={contentRows}
                ariaLabel="Content"
                ariaDescribedBy={describedBy}
                ariaInvalid={Boolean(fieldErrors.content)}
              />
            ) : (
              <Textarea
                {...bind("content")}
                rows={contentRows}
                maxLength={ITEM_CONTENT_MAX_LENGTH}
                spellCheck={false}
                className="font-mono text-xs leading-relaxed md:text-xs"
                aria-describedby={describedBy}
              />
            )
          }
        </Field>
      )}

      {fields.includes("language") && (
        <Field id={`${idPrefix}-language`} label="Language" error={fieldErrors.language}>
          {(describedBy) => (
            <Input {...bind("language")} placeholder="typescript" aria-describedby={describedBy} />
          )}
        </Field>
      )}

      {fields.includes("url") && (
        <Field id={`${idPrefix}-url`} label="URL" error={fieldErrors.url}>
          {(describedBy) => (
            <Input
              {...bind("url")}
              type="url"
              required
              placeholder="https://"
              aria-describedby={describedBy}
            />
          )}
        </Field>
      )}

      <Field
        id={`${idPrefix}-tags`}
        label="Tags"
        error={fieldErrors.tags}
        hint="Separate tags with commas"
      >
        {(describedBy) => (
          <Input {...bind("tags")} placeholder="react, hooks" aria-describedby={describedBy} />
        )}
      </Field>
    </>
  );
};
