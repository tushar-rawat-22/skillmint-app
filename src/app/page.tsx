import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import CareerIQCard from "@/components/landing/CareerIQCard";
import Features from "@/components/landing/Features";
import ProductLoop from "@/components/landing/ProductLoop";
import DashboardPreview from "@/components/landing/DashboardPreview";
import CareerOS from "@/components/landing/CareerOS";
import TrustedBy from "@/components/landing/TrustedBy";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import { AppEntryPanel } from "@/modules/entry";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="bg-black text-white overflow-x-hidden">
        <Hero />

        <AppEntryPanel />

        <Stats />

        <CareerIQCard />

        <ProductLoop />

        <Features />

        <DashboardPreview />

        <CareerOS />

        <TrustedBy />

        <FAQ />

        <CTA />
      </main>

      <Footer />
    </>
  );
}
