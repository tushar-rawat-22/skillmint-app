import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Features from "@/components/landing/Features";
import ProductLoop from "@/components/landing/ProductLoop";
import DashboardPreview from "@/components/landing/DashboardPreview";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="overflow-x-hidden bg-[#f7f5ef] text-slate-950">
        <Hero />
        <Problem />
        <DashboardPreview />
        <ProductLoop />
        <Features />
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </>
  );
}
