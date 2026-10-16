import { Sparkles } from "lucide-react";

import { CheckItem } from "@/components/homepage/CheckItem";
import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";

const AI_FEATURES = [
  "Auto-tagging from the content you save",
  "One-line descriptions written for you",
  "Plain-English explanations of any snippet",
  "A prompt optimizer that tightens your prompts",
] as const;

const DEMO_TAGS = ["react", "hooks", "debounce", "typescript", "performance"] as const;

/**
 * The Pro AI features: a badge, headline and checklist beside a code editor
 * mockup whose tags were "written by AI". Side by side from `lg`, stacked below.
 */
export const AISection = () => {
  return (
    <section className="bg-card border-y py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <ScrollFadeIn className="min-w-0">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-500">
            <Sparkles className="size-3.5" />
            Pro Feature
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Let AI do the filing</h2>
          <p className="text-muted-foreground mt-4">
            Save something and Stashboard reads it for you, so it is easy to find again later.
          </p>
          <ul className="mt-7 grid gap-3">
            {AI_FEATURES.map((feature) => (
              <CheckItem key={feature}>{feature}</CheckItem>
            ))}
          </ul>
        </ScrollFadeIn>

        <ScrollFadeIn className="min-w-0">
          <div
            className="overflow-hidden rounded-xl border bg-[#1e1e1e] shadow-2xl"
            aria-label="Example: AI generated tags for a saved snippet"
            role="img"
          >
            <div className="text-muted-foreground flex h-10 items-center gap-3 border-b border-[#2d2d2d] bg-[#252526] px-3.5 text-xs">
              <span className="flex gap-1.5" aria-hidden>
                <i className="size-[11px] rounded-full bg-[#ff5f57]" />
                <i className="size-[11px] rounded-full bg-[#febc2e]" />
                <i className="size-[11px] rounded-full bg-[#28c840]" />
              </span>
              <span className="font-mono">useDebounce.ts</span>
              <span className="ml-auto">typescript</span>
            </div>
            <pre className="overflow-x-auto p-4.5 font-mono text-[13px] leading-relaxed text-[#d4d4d4]">
              <code>
                <span className="text-[#569cd6]">export const</span> <span className="text-[#dcdcaa]">useDebounce</span>{" "}
                = &lt;<span className="text-[#4ec9b0]">T</span>&gt;(value: <span className="text-[#4ec9b0]">T</span>, delay ={" "}
                <span className="text-[#b5cea8]">300</span>) =&gt; {"{"}
                {"\n  "}
                <span className="text-[#569cd6]">const</span> [debounced, setDebounced] ={" "}
                <span className="text-[#dcdcaa]">useState</span>(value);
                {"\n\n  "}
                <span className="text-[#dcdcaa]">useEffect</span>(() =&gt; {"{"}
                {"\n    "}
                <span className="text-[#569cd6]">const</span> id = <span className="text-[#dcdcaa]">setTimeout</span>(() =&gt;{" "}
                <span className="text-[#dcdcaa]">setDebounced</span>(value), delay);
                {"\n    "}
                <span className="text-[#569cd6]">return</span> () =&gt; <span className="text-[#dcdcaa]">clearTimeout</span>(id);
                {"\n  }, [value, delay]);\n\n  "}
                <span className="text-[#569cd6]">return</span> debounced;
                {"\n};"}
              </code>
            </pre>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#2d2d2d] bg-[#252526] px-4.5 py-3.5">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                <Sparkles className="size-3.5" />
                AI Generated Tags
              </span>
              {DEMO_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-blue-500/40 bg-blue-500/15 px-2.5 py-0.5 font-mono text-xs text-blue-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
};
