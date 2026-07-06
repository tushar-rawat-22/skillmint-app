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

      <main className="overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),#020617] text-white">
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
