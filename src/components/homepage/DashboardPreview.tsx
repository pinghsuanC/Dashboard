import { Search } from "lucide-react";

import { SYSTEM_TYPE_COLORS } from "@/lib/constants/item-types";

const NAV = [
  { label: "Snippets", type: "snippet" },
  { label: "Prompts", type: "prompt" },
  { label: "Commands", type: "command" },
  { label: "Notes", type: "note" },
  { label: "Files", type: "file" },
  { label: "Images", type: "image" },
  { label: "Links", type: "link" },
] as const;

const CARDS = [
  { title: "useDebounce hook", type: "snippet" },
  { title: "Code review prompt", type: "prompt" },
  { title: "git undo last", type: "command" },
  { title: "Deploy checklist", type: "note" },
  { title: "Architecture.png", type: "image" },
  { title: "Tailwind docs", type: "link" },
] as const;

/**
 * "...with Stashboard": a small, static picture of the dashboard, with a
 * sidebar of types and item cards topped in each type's colour. The picture is
 * hidden from screen readers, which get a one-line summary instead. A server
 * component: the spec lists it as client only to sit beside the hero, which
 * this page doesn't need.
 */
export const DashboardPreview = () => {
  return (
    <>
      <p className="sr-only">
        One searchable dashboard with {NAV.map(({ label }) => label.toLowerCase()).join(", ")} side by side.
      </p>
      <div
        aria-hidden
        className="bg-card grid h-72 grid-cols-[88px_1fr] overflow-hidden rounded-xl border shadow-[0_30px_60px_-30px_rgb(59_130_246/0.35)] sm:h-[340px] sm:grid-cols-[112px_1fr]"
      >
        <div className="bg-background flex flex-col gap-1 border-r px-2.5 py-3.5">
          <div className="mb-3 ml-1.5 h-2.5 w-3/5 rounded bg-linear-to-r from-blue-600 to-blue-400" />
          {NAV.map(({ label, type }, i) => (
            <span
              key={type}
              className={`text-muted-foreground flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px] ${i === 0 ? "bg-muted text-foreground" : ""}`}
            >
              <span className="size-[7px] shrink-0 rounded-[2px]" style={{ backgroundColor: SYSTEM_TYPE_COLORS[type] }} />
              {label}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-3 p-3.5">
          <div className="text-muted-foreground flex h-7 items-center justify-between rounded-md border px-2.5 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Search className="size-3" />
              Search…
            </span>
            <kbd className="font-mono text-[10px]">⌘K</kbd>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {CARDS.map(({ title, type }) => (
              <div
                key={title}
                className="bg-background flex min-w-0 flex-col gap-1.5 rounded-md border border-t-[3px] p-2.5"
                style={{ borderTopColor: SYSTEM_TYPE_COLORS[type] }}
              >
                <b className="truncate text-[11px] font-semibold">{title}</b>
                <i className="bg-muted h-1.5 rounded-full" />
                <i className="bg-muted h-1.5 w-3/5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
