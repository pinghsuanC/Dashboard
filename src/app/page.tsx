import { AISection } from "@/components/homepage/AISection";
import { CTASection } from "@/components/homepage/CTASection";
import { FeaturesSection } from "@/components/homepage/FeaturesSection";
import { Footer } from "@/components/homepage/Footer";
import { HeroSection } from "@/components/homepage/HeroSection";
import { Navbar } from "@/components/homepage/Navbar";
import { PricingSection } from "@/components/homepage/PricingSection";

/**
 * The public marketing homepage. It reads no session, so it is prerendered
 * once and served static; signed-in visitors see the same page.
 */
const Home = () => {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <AISection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
};

export default Home;
