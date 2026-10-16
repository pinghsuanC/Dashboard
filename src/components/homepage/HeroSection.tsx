import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChaosAnimation } from "@/components/homepage/ChaosAnimation";
import { DashboardPreview } from "@/components/homepage/DashboardPreview";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Headline, subtitle and CTAs over the "chaos to order" picture: scattered
 * tool icons, an arrow, then the dashboard. Side by side from `lg`, stacked
 * below it with the arrow turned to point down.
 *
 * A server component, unlike the spec's list: only `ChaosAnimation` needs the
 * browser, so it is the one client island here. The hero fades in with a CSS
 * animation, not ScrollFadeIn: that starts hidden until React hydrates, which
 * would blank the headline on first paint.
 */
export const HeroSection = () => {
  return (
    <section className="relative bg-[radial-gradient(600px_300px_at_20%_10%,rgb(59_130_246/0.14),transparent_70%),radial-gradient(600px_300px_at_80%_0%,rgb(96_165_250/0.1),transparent_70%)] pt-36 pb-24 sm:pt-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center motion-safe:animate-[hero-fade-in_0.7s_ease-out_both]">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            <span className="gradient-text">Stash your tech knowledge!</span>
          </h1>
          <p className="text-muted-foreground mt-5 text-base sm:text-lg">
            Snippets in GitHub, prompts in a chat log, commands in your shell history, links in forty open tabs.
            Stashboard pulls it all into one fast, searchable place.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-6">
              <Link href={ROUTES.register}>Get Started Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-6">
              <a href="#features">See Features</a>
            </Button>
          </div>
        </div>

        <div className="mx-auto grid max-w-md items-center gap-6 motion-safe:animate-[hero-fade-in_0.7s_ease-out_0.15s_both] lg:max-w-none lg:grid-cols-[1fr_auto_1fr]">
          <figure>
            <figcaption className="text-muted-foreground mb-3 text-sm font-semibold">Your knowledge today...</figcaption>
            <ChaosAnimation />
          </figure>

          <div
            aria-hidden
            className="mx-auto grid size-16 rotate-90 animate-[hero-arrow-pulse_2s_ease-in-out_infinite] place-items-center rounded-full bg-linear-to-r from-blue-600 to-blue-400 text-white motion-reduce:animate-none lg:mt-8 lg:rotate-0"
          >
            <ArrowRight className="size-7" strokeWidth={2.5} />
          </div>

          <figure>
            <figcaption className="text-muted-foreground mb-3 text-sm font-semibold lg:text-right">
              ...with Stashboard
            </figcaption>
            <DashboardPreview />
          </figure>
        </div>
      </div>
    </section>
  );
};
