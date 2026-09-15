import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import {
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { getPublicDemoConfiguration } from "@/config/publicDemo";
import { getPublicSignupConfiguration } from "@/config/publicSignup";
import { ROUTES } from "@/constants/routes";

const syntheticEvidencePreview = [
  {
    label: "Strongest support",
    description:
      "Typed interface delivery, accessibility checks, and component testing are clearly supported by the resume.",
    tone: "Supported",
  },
  {
    label: "Main evidence gap",
    description:
      "API ownership and one inspectable team-delivery example are still unclear.",
    tone: "Needs proof",
  },
  {
    label: "Best next move",
    description:
      "Rewrite one project entry around contribution, result, and the evidence someone can inspect.",
    tone: "Next action",
  },
] as const;

export default function CandidatesPage() {
  const { enabled: publicDemoEnabled } = getPublicDemoConfiguration();
  const { enabled: publicSignupEnabled } = getPublicSignupConfiguration();

  return (
    <>
      <Navbar
        publicSignupEnabled={publicSignupEnabled}
        publicDemoEnabled={publicDemoEnabled}
      />
      <main
        className="min-h-screen bg-[#f7f5ef] text-slate-950"
        data-role-composition="candidate-editorial"
      >
        <section className="border-b border-slate-200" aria-labelledby="candidate-title">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-sm font-semibold text-emerald-800">For candidates</p>
              <h1
                id="candidate-title"
                className="mt-4 max-w-2xl text-[2.15rem] leading-[1.06] font-black tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl"
              >
                What does my resume actually support?
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Turn your resume into a clear evidence map for a target role,
                find the gap that matters most, and choose a next action you can
                prove in a later analysis.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {publicSignupEnabled ? (
                  <Link href={ROUTES.SIGNUP} className={premiumPrimaryCta}>
                    Create candidate account
                  </Link>
                ) : (
                  <Link href={ROUTES.SIGNUP} className={premiumPrimaryCta}>
                    Request access
                  </Link>
                )}
                {publicDemoEnabled ? (
                  <Link href={ROUTES.DEMO} className={premiumSecondaryCta}>
                    Explore candidate demo
                  </Link>
                ) : null}
                <Link
                  href={ROUTES.LOGIN}
                  className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-slate-700 underline-offset-4 hover:text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                >
                  Existing user login
                </Link>
              </div>

              {!publicSignupEnabled ? (
                <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
                  SkillMint is live with controlled account admission. Request
                  candidate access with an email only—no resume upload or
                  automatic account creation.
                </p>
              ) : null}
            </div>

            <article
              className="relative border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]"
              aria-labelledby="candidate-preview-title"
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Synthetic example</p>
                  <h2 id="candidate-preview-title" className="mt-1 text-2xl font-black tracking-[-0.025em]">
                    See the evidence before the score.
                  </h2>
                </div>
                <p className="max-w-44 text-xs leading-5 text-slate-500 sm:text-right">
                  Example content only—not a real candidate assessment.
                </p>
              </div>

              <div>
                {syntheticEvidencePreview.map((item, index) => (
                  <section
                    key={item.label}
                    className="grid gap-3 border-b border-slate-200 px-5 py-5 sm:grid-cols-[2.5rem_8.5rem_1fr] sm:gap-4 sm:px-7"
                    aria-label={item.label}
                  >
                    <p className="font-mono text-xs font-bold text-emerald-800">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">{item.tone}</p>
                      <h3 className="mt-1 text-sm font-bold text-slate-950">{item.label}</h3>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                  </section>
                ))}
              </div>

              <div className="grid gap-4 bg-slate-950 px-5 py-5 text-white sm:grid-cols-[2.5rem_8.5rem_1fr] sm:px-7">
                <p className="font-mono text-xs font-bold text-emerald-300">04</p>
                <h3 className="text-sm font-bold">After re-analysis</h3>
                <div>
                  <p className="text-sm leading-6 text-slate-300">
                    Compare a later resume state with the earlier one to see what
                    evidence actually changed instead of chasing a score.
                  </p>
                  {publicDemoEnabled ? (
                    <Link
                      href={ROUTES.DEMO}
                      className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
                    >
                      See the full evidence loop
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[0.7fr_1.3fr] md:py-18" aria-labelledby="candidate-privacy-title">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Private by default</p>
            <h2 id="candidate-privacy-title" className="mt-2 text-3xl font-black tracking-[-0.03em]">
              Your evidence moves only when you choose.
            </h2>
          </div>
          <div className="border-l-2 border-emerald-700 pl-5 sm:pl-7">
            <p className="max-w-3xl text-base leading-7 text-slate-700">
              A Proof Brief contains a minimal evidence summary—not your raw
              resume, contact details, account ID, or unrelated personal
              information. It stays private by default. You can publish a
              candidate-controlled link and revoke it again; SkillMint does not
              place you in a recruiter search database.
            </p>
            <Link
              href={ROUTES.PRIVACY}
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
            >
              Read Data &amp; privacy
            </Link>
          </div>
        </section>
      </main>
      <Footer publicDemoEnabled={publicDemoEnabled} />
    </>
  );
}
