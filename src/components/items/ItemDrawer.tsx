"use client";

import type { CSSProperties, ReactNode } from "react";
import { Calendar, Copy, Folder, Pencil, Pin, Star, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { TypeIcon } from "@/components/shared/TypeIcon";
import { ItemContentSkeleton, ItemMetaSkeleton } from "@/components/skeleton/ItemDrawerSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ITEM_COPIED, ITEM_COPY_FAILED, ITEM_LOAD_FAILED } from "@/lib/constants/messages/items";
import { ITEM_COPY_TOAST_ID } from "@/lib/constants/ui";
import type { ItemSummary } from "@/lib/db/items";
import type { ItemDetailResult } from "@/lib/fetch-item-detail";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The fetched half of the drawer: still loading, or the fetch's loaded or
 * failed result. Not-found and signed-out never reach it; they navigate away.
 */
export type ItemDrawerLoad =
  | { status: "loading" }
  | Extract<ItemDetailResult, { status: "ok" | "error" }>;

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** From the clicked card, so the drawer has something to show at once. */
  summary: ItemSummary;
  load: ItemDrawerLoad;
}

interface SectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

const Section = ({ title, icon, children }: SectionProps) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

/** Only web links become anchors; anything else stays text. */
const isWebUrl = (url: string) => /^https?:\/\//i.test(url);

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ITEM_COPIED, { id: ITEM_COPY_TOAST_ID });
  } catch {
    toast.error(ITEM_COPY_FAILED, { id: ITEM_COPY_TOAST_ID });
  }
};

/**
 * The item detail view: a right-hand sheet. The card's summary fills the
 * header, actions, description and tags immediately; content, collections and
 * dates wait for `load`. Favorite, Pin, Edit and Delete show the item's state
 * but stay disabled until the CRUD feature wires them.
 */
export const ItemDrawer = ({ open, onOpenChange, summary, load }: ItemDrawerProps) => {
  const detail = load.status === "ok" ? load.item : null;
  // The fetched copy once it arrives: fresher than the card's.
  const item: ItemSummary = detail ?? summary;
  const { type } = item;
  // `||`, not `??`: empty content shows no Content section, so it isn't
  // copyable either, and a link's URL is the fallback.
  const copyText = detail?.content || detail?.url || null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader
          className="flex-row items-start gap-3 p-6 pr-12"
          style={{ "--type-color": type.color } as CSSProperties}
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-(--type-color)/10">
            <TypeIcon type={type} className="size-5" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <SheetTitle className="text-lg font-semibold break-words">{item.title}</SheetTitle>
            <SheetDescription className="sr-only">Item details</SheetDescription>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{type.label}</Badge>
              {detail?.language && <Badge variant="outline">{detail.language}</Badge>}
            </div>
          </div>
        </SheetHeader>

        <div className="flex items-center gap-1 border-b px-6 pb-4">
          <Button
            variant="ghost"
            size="sm"
            disabled
            aria-pressed={item.isFavorite}
            className={cn(item.isFavorite && "text-amber-400")}
          >
            <Star className={cn(item.isFavorite && "fill-amber-400")} />
            Favorite
          </Button>
          <Button variant="ghost" size="sm" disabled aria-pressed={item.isPinned}>
            <Pin className={cn(item.isPinned && "fill-current")} />
            Pin
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={copyText === null}
            onClick={() => copyText !== null && copyToClipboard(copyText)}
          >
            <Copy />
            Copy
          </Button>
          <Button variant="ghost" size="sm" disabled className="ml-auto">
            <Pencil />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Delete"
            className="text-destructive"
          >
            <Trash2 />
          </Button>
        </div>

        <div
          className="flex flex-1 flex-col gap-6 overflow-y-auto p-6"
          aria-busy={load.status === "loading"}
        >
          {item.description && (
            <Section title="Description">
              <p className="text-sm">{item.description}</p>
            </Section>
          )}

          {load.status === "error" && (
            <p role="alert" className="text-destructive text-sm">
              {ITEM_LOAD_FAILED}
            </p>
          )}

          {load.status === "loading" && <ItemContentSkeleton />}

          {detail?.content && (
            <Section title="Content">
              <pre className="bg-muted overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
                <code>{detail.content}</code>
              </pre>
            </Section>
          )}

          {detail?.url && (
            <Section title="URL">
              {isWebUrl(detail.url) ? (
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm break-all underline-offset-4 hover:underline"
                >
                  {detail.url}
                </a>
              ) : (
                <p className="text-sm break-all">{detail.url}</p>
              )}
            </Section>
          )}

          {detail?.fileName && (
            <Section title="File">
              <p className="text-sm break-all">{detail.fileName}</p>
            </Section>
          )}

          {item.tags.length > 0 && (
            <Section title="Tags" icon={<Tag className="size-3.5" />}>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {load.status === "loading" && <ItemMetaSkeleton />}

          {detail && detail.collections.length > 0 && (
            <Section title="Collections" icon={<Folder className="size-3.5" />}>
              <div className="flex flex-wrap gap-1.5">
                {detail.collections.map((collection) => (
                  <Badge key={collection.id} variant="outline">
                    {collection.name}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {detail && (
            <Section title="Details" icon={<Calendar className="size-3.5" />}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-right">
                  <time dateTime={detail.createdAt.toISOString()}>
                    {formatLongDate(detail.createdAt)}
                  </time>
                </dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="text-right">
                  <time dateTime={detail.updatedAt.toISOString()}>
                    {formatLongDate(detail.updatedAt)}
                  </time>
                </dd>
              </dl>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
