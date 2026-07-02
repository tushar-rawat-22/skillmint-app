import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import CareerIQCard from "@/components/landing/CareerIQCard";
import Features from "@/components/landing/Features";
import DashboardPreview from "@/components/landing/DashboardPreview";
import CareerOS from "@/components/landing/CareerOS";
import TrustedBy from "@/components/landing/TrustedBy";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="bg-black text-white overflow-x-hidden">
        <Hero />

        <Stats />

        <CareerIQCard />

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