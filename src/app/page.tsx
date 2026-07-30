import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Features from "@/components/landing/Features";
import ProductLoop from "@/components/landing/ProductLoop";
import DashboardPreview from "@/components/landing/DashboardPreview";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import { getPublicSignupConfiguration } from "@/config/publicSignup";

export default function HomePage() {
  const { enabled } = getPublicSignupConfiguration();

  return (
    <>
      <Navbar publicSignupEnabled={enabled} />

      <main className="overflow-x-hidden bg-[#f7f5ef] text-slate-950">
        <Hero publicSignupEnabled={enabled} />
        <Problem />
        <DashboardPreview />
        <ProductLoop publicSignupEnabled={enabled} />
        <Features />
        <FAQ />
        <CTA publicSignupEnabled={enabled} />
      </main>

      <Footer />
    </>
  );
}
