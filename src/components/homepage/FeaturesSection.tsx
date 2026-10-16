import { Code, FileText, FolderOpen, Search, Sparkles, SquareTerminal, type LucideIcon } from "lucide-react";

import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { SYSTEM_TYPE_COLORS } from "@/lib/constants/item-types";

type Feature = { title: string; body: string; Icon: LucideIcon; type: keyof typeof SYSTEM_TYPE_COLORS };

// Search and Collections aren't item types; they borrow link and note's colours.
const FEATURES: readonly Feature[] = [
  {
    title: "Code Snippets",
    body: "Save reusable code with syntax highlighting, language tags and a one-click copy.",
    Icon: Code,
    type: "snippet",
  },
  {
    title: "AI Prompts",
    body: "Keep the prompts that work, write them in Markdown, and stop retyping them from memory.",
    Icon: Sparkles,
    type: "prompt",
  },
  {
    title: "Instant Search",
    body: "Press ⌘K and find anything by title, tag, type or file name as you type.",
    Icon: Search,
    type: "link",
  },
  {
    title: "Commands",
    body: "The shell one-liners you look up every month, saved once and ready to paste.",
    Icon: SquareTerminal,
    type: "command",
  },
  {
    title: "Files & Docs",
    body: "Upload files and images next to the notes about them, stored privately and served only to you.",
    Icon: FileText,
    type: "file",
  },
  {
    title: "Collections",
    body: "Group items by project or topic, star your favourites and pin what you use daily.",
    Icon: FolderOpen,
    type: "note",
  },
];

/** Six feature cards, each topped in its item type's colour; 3, 2, then 1 column. */
export const FeaturesSection = () => {
  return (
    <section id="features" className="scroll-mt-16 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollFadeIn className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-widest text-blue-500 uppercase">Features</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you reach for, in one place</h2>
          <p className="text-muted-foreground mt-4">
            Each kind of knowledge gets a home that fits it, and all of it is one search away.
          </p>
        </ScrollFadeIn>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, body, Icon, type }) => (
            <ScrollFadeIn key={title}>
              <article
                className="bg-card relative h-full overflow-hidden rounded-xl border border-t-[3px] p-7 transition hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                style={{ "--accent": SYSTEM_TYPE_COLORS[type], borderTopColor: "var(--accent)" } as React.CSSProperties}
              >
                <div className="mb-5 grid size-11 place-items-center rounded-lg bg-(--accent)/15 text-(--accent)">
                  <Icon className="size-[22px]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground text-[15px]">{body}</p>
              </article>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};
