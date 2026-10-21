"use client";

import Link from "next/link";
import { useState } from "react";

import { CheckItem } from "@/components/homepage/CheckItem";
import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PRICING } from "@/lib/constants/pricing";
import { ROUTES } from "@/lib/constants/routes";
import { formatPrice, monthlyEquivalent, yearlySavingPercent } from "@/lib/pricing/pricing";
import { cn } from "@/lib/utils";

const { free, pro } = PRICING;
const SAVING = yearlySavingPercent(pro.monthlyPrice, pro.yearlyPrice);

/**
 * Free and Pro cards with a monthly / yearly toggle. Every number on the cards
 * comes from `PRICING`, so a price change can't leave stale copy behind.
 * Monthly and Yearly are buttons as well as the switch, so either works from
 * the keyboard.
 */
export const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);

  const proPrice = isYearly ? monthlyEquivalent(pro.yearlyPrice) : pro.monthlyPrice;
  const proNote = isYearly ? `Billed ${formatPrice(pro.yearlyPrice)}/yr` : "Billed monthly. Cancel any time.";

  return (
    <section id="pricing" className="scroll-mt-16 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollFadeIn className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-widest text-blue-500 uppercase">Pricing</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start free, upgrade when you outgrow it</h2>

          {/* The labels carry the 44px tap height; the switch itself is shadcn's small size. */}
          <div className="mt-7 inline-flex items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              aria-pressed={!isYearly}
              className={cn("h-11 px-3 transition-colors", isYearly ? "text-muted-foreground" : "text-foreground")}
            >
              Monthly
            </button>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} aria-label="Bill yearly" />
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              aria-pressed={isYearly}
              className={cn("h-11 px-3 transition-colors", isYearly ? "text-foreground" : "text-muted-foreground")}
            >
              Yearly
            </button>
            {SAVING > 0 && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                Save {SAVING}%
              </span>
            )}
          </div>
        </ScrollFadeIn>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <ScrollFadeIn>
            <article className="bg-card flex h-full flex-col rounded-xl border p-8">
              <h3 className="text-xl font-semibold">Free</h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{formatPrice(free.price)}</span>
                <span className="text-muted-foreground">/forever</span>
              </p>
              <p className="text-muted-foreground mt-1.5 text-sm">For getting your knowledge out of scattered tabs.</p>
              <ul className="my-8 grid flex-1 content-start gap-3">
                <CheckItem>{free.itemLimit} items</CheckItem>
                <CheckItem>{free.collectionLimit} collections</CheckItem>
                <CheckItem>Snippets, prompts, commands, notes and links</CheckItem>
                <CheckItem>Instant search</CheckItem>
              </ul>
              <Button asChild variant="outline" size="lg" className="h-11">
                <Link href={ROUTES.register}>Start with Free Tier</Link>
              </Button>
            </article>
          </ScrollFadeIn>

          <ScrollFadeIn>
            <article className="bg-card relative flex h-full flex-col rounded-xl border border-blue-500 bg-linear-to-b from-blue-500/10 to-transparent to-50% p-8 shadow-[0_30px_60px_-30px_rgb(59_130_246/0.5)]">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-r from-blue-600 to-blue-400 px-3.5 py-1 text-xs font-bold text-white">
                Most Popular
              </span>
              <h3 className="text-xl font-semibold">Pro</h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{formatPrice(proPrice)}</span>
                <span className="text-muted-foreground">/month</span>
              </p>
              <p className="text-muted-foreground mt-1.5 text-sm" aria-live="polite">
                {proNote}
              </p>
              <ul className="my-8 grid flex-1 content-start gap-3">
                <CheckItem>Unlimited items and collections</CheckItem>
                <CheckItem>File and image uploads</CheckItem>
                <CheckItem>AI tags, descriptions and explanations</CheckItem>
                <CheckItem>Prompt optimizer</CheckItem>
                <CheckItem>Everything in Free</CheckItem>
              </ul>
              <Button asChild size="lg" className="h-11">
                <Link href={ROUTES.register}>Go Pro</Link>
              </Button>
            </article>
          </ScrollFadeIn>
        </div>
      </div>
    </section>
  );
};
