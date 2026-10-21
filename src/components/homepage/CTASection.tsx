import Link from "next/link";

import { ScrollFadeIn } from "@/components/homepage/ScrollFadeIn";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

/** The closing call to action. */
export const CTASection = () => {
  return (
    <section className="px-4 py-24 sm:px-6">
      <ScrollFadeIn className="bg-card mx-auto max-w-3xl rounded-2xl border bg-[radial-gradient(400px_200px_at_50%_0%,rgb(59_130_246/0.25),transparent_70%)] px-5 py-12 text-center sm:px-8 sm:py-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to Organize Your Knowledge?</h2>
        <p className="text-muted-foreground mt-4">Bring everything you know into one place in under a minute.</p>
        <Button asChild size="lg" className="mt-7 h-11 px-6">
          <Link href={ROUTES.register}>Start with Free Tier</Link>
        </Button>
      </ScrollFadeIn>
    </section>
  );
};
