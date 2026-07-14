import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import {
  premiumCompactSurface,
  premiumHeroSurface,
  premiumPageStack,
  premiumSurface,
} from "@/components/ui/premium";
import { getPrivacyContact } from "@/config/privacyContact";

const sections = [
  {
    title: "What SkillMint processes",
    body:
      "SkillMint processes resume text, parsed profile signals, target-role setup, pasted job descriptions, JD Match results, Active Target state, mission status, feedback, and account profile data when those features are used.",
  },
  {
    title: "Browser-local versus account-synced",
    body:
      "Browser-local resume, JD, target, mission, setup, feedback, and preference state stays in this browser. Account-synced profile, saved-report, and feedback records use Supabase only for signed-in users when configured and available.",
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
      "Browser export includes only registered values visible to the current browser owner; account export is a separate authenticated JSON collection. Neither is an atomic point-in-time snapshot or complete provider-history guarantee. A successful action means the browser download was requested, not that a file was saved. Clearing browser data removes registered SkillMint keys from this browser only and does not delete account records.",
  },
  {
    title: "Saved-report and account deletion",
    body:
      "Delete saved reports removes synced resume analyses, JD matches, and career snapshots while preserving the account, profile, and feedback. Account deletion uses a server-only admin boundary; its cascade behavior, including feedback deletion, requires the documented migration and operational verification.",
  },
  {
    title: "Current limitations",
    body:
      "SkillMint does not claim GDPR or DPDP certification, instant infrastructure-wide erasure, end-to-end encryption, production readiness, or that data never leaves your device. Provider backup/log deletion and live account-deletion behavior are not yet operationally verified. A verified privacy/support contact is still a release blocker.",
  },
];

export default function PrivacyPage() {
  const privacyContact = getPrivacyContact();

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

          <section className={premiumSurface}>
            <h2 className="text-2xl font-black text-slate-950">
              Questions and contact
            </h2>

            {privacyContact.status === "configured" ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Contact us at{" "}
                <a
                  href={privacyContact.href ?? undefined}
                  className="font-bold text-emerald-800 underline underline-offset-4"
                >
                  {privacyContact.email}
                </a>
                . Code can validate this configuration format, but cannot prove
                external ownership or monitoring of the address.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-amber-900">
                A verified privacy/support contact is not currently published.
                This remains a release blocker; no operational address has been
                invented for the beta.
              </p>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
