import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Features from "@/components/landing/Features";
import ProductLoop from "@/components/landing/ProductLoop";
import DashboardPreview from "@/components/landing/DashboardPreview";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import AudiencePaths from "@/components/landing/AudiencePaths";
import { getPublicDemoConfiguration } from "@/config/publicDemo";
import { getPublicSignupConfiguration } from "@/config/publicSignup";

export default function HomePage() {
  const { enabled: publicSignupEnabled } = getPublicSignupConfiguration();
  const { enabled: publicDemoEnabled } = getPublicDemoConfiguration();

  return (
    <>
      <Navbar
        publicSignupEnabled={publicSignupEnabled}
        publicDemoEnabled={publicDemoEnabled}
      />

      <main className="overflow-x-hidden bg-[#f7f5ef] text-slate-950">
        <Hero
          publicSignupEnabled={publicSignupEnabled}
          publicDemoEnabled={publicDemoEnabled}
        />
        <AudiencePaths publicDemoEnabled={publicDemoEnabled} />
        <Problem />
        <DashboardPreview />
        <ProductLoop
          publicSignupEnabled={publicSignupEnabled}
          publicDemoEnabled={publicDemoEnabled}
        />
        <Features />
        <FAQ />
        <CTA
          publicSignupEnabled={publicSignupEnabled}
          publicDemoEnabled={publicDemoEnabled}
        />
      </main>

      <Footer publicDemoEnabled={publicDemoEnabled} />
    </>
  );
}
