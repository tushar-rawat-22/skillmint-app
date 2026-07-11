import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import {
  premiumCompactSurface,
  premiumHeroSurface,
  premiumPageStack,
  premiumSurface,
} from "@/components/ui/premium";

const sections = [
  {
    title: "What SkillMint processes",
    body:
      "SkillMint processes resume text, parsed profile signals, target-role setup, pasted job descriptions, JD Match results, Active Target state, mission status, feedback, and account profile data when those features are used.",
  },
  {
    title: "Browser-local versus account-synced",
    body:
      "Browser-local data stays in this browser. Account-synced data is stored through Supabase for signed-in users when account sync is configured and available.",
  },
  {
    title: "Resume and JD processing",
    body:
      "Resume content is interpreted to generate career signals. Latest JD Match compares one resume context against one pasted job description and must be rerun when the resume context changes.",
  },
  {
    title: "Evidence candidates",
    body:
      "Links and proof signals are evidence candidates unless independently validated. Missing proof means unverified, not false.",
  },
  {
    title: "Exports and clearing",
    body:
      "Browser export and account export are separate JSON files. Clearing browser data removes registered SkillMint keys from this browser only. It does not delete account records.",
  },
  {
    title: "Saved-report and account deletion",
    body:
      "Delete saved reports removes synced resume analyses, JD matches, and career snapshots while preserving the account, profile, and feedback. Account deletion uses a server-only admin boundary and database cascades for account-owned product records.",
  },
  {
    title: "Current limitations",
    body:
      "SkillMint does not claim full GDPR or DPDP certification, instant infrastructure-wide erasure, end-to-end encryption, or that data never leaves your device. Operational privacy contact ownership is still a beta-release blocker until a verified contact channel exists.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />

      <main className="bg-[#f7f5ef] px-4 py-10 text-slate-950 md:px-8">
        <div className={premiumPageStack}>
          <section className={premiumHeroSurface}>
            <h1 className="text-4xl font-black md:text-5xl">
              SkillMint data & privacy notice
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              This notice describes current technical behavior in the beta
              product. It is not a legal-certification claim.
            </p>

            <Link
              href="/settings/data"
              className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
            >
              Manage your data
            </Link>
          </section>

          <section className={`${premiumSurface} grid gap-4 md:grid-cols-2`}>
            {sections.map((section) => (
              <article
                key={section.title}
                className={premiumCompactSurface}
              >
                <h2 className="text-xl font-black text-slate-950">
                  {section.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {section.body}
                </p>
              </article>
            ))}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
