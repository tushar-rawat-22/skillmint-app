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

const candidateLoop = [
  ["Understand", "See what the current resume supports, where evidence is strongest, and what remains unclear."],
  ["Focus", "Choose a target role and compare one job description without changing the underlying scores."],
  ["Act", "Use one evidence-building next action, then update the work or resume truthfully."],
  ["Re-analyse", "Run the same deterministic analysis later and compare evidence changes rather than score-chasing."],
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
                continue to log in; OAuth and abuse controls are being prepared.
              </p>
            ) : null}
          </section>

          <section className={premiumSurface} aria-labelledby="candidate-loop-title">
            <p className={premiumEyebrow}>Candidate loop</p>
            <h2 id="candidate-loop-title" className="mt-3 text-3xl font-black">
              Evidence changes before the analysis changes.
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {candidateLoop.map(([title, description], index) => (
                <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="font-mono text-xs font-bold text-emerald-800">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 md:p-8" aria-labelledby="candidate-privacy-title">
            <p className={premiumEyebrow}>Private by default</p>
            <h2 id="candidate-privacy-title" className="mt-3 text-2xl font-black">
              A Proof Brief is shared only when you choose.
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-emerald-950">
              The beta sharing model is being built around a minimal derived
              evidence brief—not your raw resume, contact details, account ID,
              or unrelated personal information. Candidate-authorized,
              revocable links come before any recruiter discovery.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
