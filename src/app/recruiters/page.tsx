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

const recruiterSteps = [
  ["Role evidence map", "Translate one role or job description into evidence categories a human can inspect."],
  ["Authorized brief", "Open only the minimum candidate evidence the candidate chose to share."],
  ["Support state", "Separate strong support, weak support, and unclear or missing support without ranking people."],
  ["Better questions", "Ask for an applied example or missing context and send structured feedback to the candidate."],
] as const;

export default function RecruitersPage() {
  const { enabled: publicDemoEnabled } = getPublicDemoConfiguration();
  const { enabled: publicSignupEnabled } = getPublicSignupConfiguration();
  const demoIsPublicEntry = publicDemoEnabled && !publicSignupEnabled;

  return (
    <>
      <PublicBetaHeader />
      <main className="min-h-screen bg-[#f7f5ef] px-6 py-12 text-slate-950 md:py-16">
        <div className="mx-auto max-w-6xl space-y-7">
          <section className={premiumHeroSurface}>
            <p className={premiumEyebrow}>For recruiters and hiring teams</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.04em] md:text-6xl">
              What evidence supports this candidate for this role?
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Use an evidence map and candidate-authorized Proof Brief to see
              what is supported, what is weak, and which questions still need a
              human conversation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {demoIsPublicEntry ? (
                <Link href={ROUTES.RECRUITER_DEMO} className={premiumPrimaryCta}>
                  Explore recruiter demo
                </Link>
              ) : (
                <Link href={ROUTES.RECRUITER_WORKSPACE} className={premiumPrimaryCta}>
                  Open recruiter workspace
                </Link>
              )}
              {publicDemoEnabled && !demoIsPublicEntry ? (
                <Link href={ROUTES.RECRUITER_DEMO} className={premiumSecondaryCta}>
                  Explore recruiter demo
                </Link>
              ) : null}
              <Link href={ROUTES.LOGIN} className={premiumSecondaryCta}>
                Existing user login
              </Link>
              {publicSignupEnabled ? (
                <Link href={ROUTES.SIGNUP} className={premiumSecondaryCta}>
                  Create recruiter account
                </Link>
              ) : null}
            </div>
            {!publicSignupEnabled ? (
              <p className="mt-5 text-sm leading-6 text-slate-500">
                Recruiter account creation is not active yet. OAuth, server-owned
                persona state, and abuse controls must pass review first.
              </p>
            ) : null}
          </section>

          <section className={premiumSurface} aria-labelledby="recruiter-loop-title">
            <p className={premiumEyebrow}>Recruiter loop</p>
            <h2 id="recruiter-loop-title" className="mt-3 text-3xl font-black">
              Use evidence to ask better questions—not to automate judgment.
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {recruiterSteps.map(([title, description], index) => (
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

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 md:p-8" aria-labelledby="recruiter-trust-title">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Trust boundary</p>
            <h2 id="recruiter-trust-title" className="mt-3 text-2xl font-black">
              Candidate-authorized links come first.
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-amber-950">
              The first beta will not offer a searchable candidate database or
              pretend that an email domain proves employer identity. Recruiter
              access and any future trust state must be server-authorized and
              reviewed for fraud and spam risk.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
