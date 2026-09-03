import Link from "next/link";

import PublicBetaHeader from "@/components/layout/PublicBetaHeader";
import {
  premiumEyebrow,
  premiumHeroSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import { getPublicDemoConfiguration } from "@/config/publicDemo";
import { getPublicSignupConfiguration } from "@/config/publicSignup";
import { ROUTES } from "@/constants/routes";

const syntheticEvidencePreview = [
  [
    "Strongest support",
    "Typed interface delivery, accessibility checks, and component testing are clearly supported by the resume.",
  ],
  [
    "Main evidence gap",
    "API ownership and one inspectable team-delivery example are still unclear.",
  ],
  [
    "Best next move",
    "Rewrite one project entry around contribution, result, and the evidence someone can inspect.",
  ],
] as const;

export default function CandidatesPage() {
  const { enabled: publicDemoEnabled } = getPublicDemoConfiguration();
  const { enabled: publicSignupEnabled } = getPublicSignupConfiguration();

  return (
    <>
      <PublicBetaHeader />
      <main className="min-h-screen bg-[#f7f5ef] px-6 py-12 text-slate-950 md:py-16">
        <div className="mx-auto max-w-6xl space-y-7">
          <section className={premiumHeroSurface}>
            <p className={premiumEyebrow}>For candidates</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] md:text-6xl">
              What does my resume actually support?
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Turn a resume into an evidence map, find the most useful gap for a
              target role, and choose a next action that can create stronger
              evidence for a later analysis.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {publicDemoEnabled ? (
                <Link href={ROUTES.DEMO} className={premiumPrimaryCta}>
                  Explore candidate demo
                </Link>
              ) : null}
              <Link href={ROUTES.LOGIN} className={premiumSecondaryCta}>
                Existing user login
              </Link>
              {publicSignupEnabled ? (
                <Link href={ROUTES.SIGNUP} className={premiumSecondaryCta}>
                  Create candidate account
                </Link>
              ) : null}
            </div>
            {!publicSignupEnabled ? (
              <p className="mt-5 text-sm leading-6 text-slate-500">
                Public account creation is not active yet. Existing users can
                continue to log in. Public signup stays closed until the
                remaining controlled-beta release gates are complete.
              </p>
            ) : null}
          </section>

          <section className={premiumSurface} aria-labelledby="candidate-preview-title">
            <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              <div>
                <p className={premiumEyebrow}>Synthetic example</p>
                <h2 id="candidate-preview-title" className="mt-3 text-3xl font-black">
                  See the evidence before the score.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                  A useful analysis should tell you what the resume supports,
                  where the evidence is weak, and what to improve next. The
                  example on this page is synthetic and is not a real candidate
                  assessment.
                </p>
                {publicDemoEnabled ? (
                  <Link
                    href={ROUTES.DEMO}
                    className="mt-6 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                  >
                    See the full evidence loop
                  </Link>
                ) : null}
              </div>

              <div className="border-y border-slate-200">
                {syntheticEvidencePreview.map(([title, description], index) => (
                  <article
                    key={title}
                    className="grid gap-2 border-b border-slate-200 py-5 last:border-b-0 sm:grid-cols-[2.5rem_10rem_1fr] sm:items-start sm:gap-4"
                  >
                    <p className="font-mono text-xs font-bold text-emerald-800">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="text-sm font-bold text-slate-950">{title}</h3>
                    <p className="text-sm leading-6 text-slate-600">{description}</p>
                  </article>
                ))}
                <article className="grid gap-2 py-5 sm:grid-cols-[2.5rem_10rem_1fr] sm:items-start sm:gap-4">
                  <p className="font-mono text-xs font-bold text-emerald-800">04</p>
                  <h3 className="text-sm font-bold text-slate-950">After re-analysis</h3>
                  <p className="text-sm leading-6 text-slate-600">
                    Compare a later resume state with the earlier one to see what
                    evidence actually changed instead of chasing a score.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 md:p-8" aria-labelledby="candidate-privacy-title">
            <p className={premiumEyebrow}>Private by default</p>
            <h2 id="candidate-privacy-title" className="mt-3 text-2xl font-black">
              A Proof Brief is shared only when you choose.
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-emerald-950">
              A Proof Brief contains a minimal derived evidence summary—not your
              raw resume, contact details, account ID, or unrelated personal
              information. It stays private by default; you can publish a
              candidate-controlled link and revoke it again. Recruiter discovery
              is not automatic.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}