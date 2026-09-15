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

const evidenceReviewRows = [
  {
    requirement: "Accessible TypeScript delivery",
    evidence:
      "A candidate-authorized project entry names the interface work, accessibility checks, and component tests.",
    state: "Supported",
    stateClassName: "text-emerald-800",
    question:
      "What did you test, and what changed after the accessibility review?",
  },
  {
    requirement: "API integration ownership",
    evidence:
      "The brief mentions API use but does not show an inspectable end-to-end ownership example.",
    state: "Unclear",
    stateClassName: "text-amber-800",
    question: "Which integration decisions and failure cases did you own?",
  },
  {
    requirement: "Team delivery impact",
    evidence:
      "A result is stated, but the candidate's individual contribution needs more context.",
    state: "Needs context",
    stateClassName: "text-slate-700",
    question:
      "What was your contribution, and how did the team verify the result?",
  },
] as const;

export default function RecruitersPage() {
  const { enabled: publicDemoEnabled } = getPublicDemoConfiguration();
  const { enabled: publicSignupEnabled } = getPublicSignupConfiguration();
  const demoIsPublicEntry = publicDemoEnabled && !publicSignupEnabled;

  return (
    <>
      <Navbar
        publicSignupEnabled={publicSignupEnabled}
        publicDemoEnabled={publicDemoEnabled}
      />
      <main
        className="min-h-screen bg-[#f7f5ef] text-slate-950"
        data-role-composition="recruiter-review"
      >
        <section className="border-b border-slate-300" aria-labelledby="recruiter-title">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:py-16 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-14">
            <div className="lg:sticky lg:top-28">
              <p className="text-sm font-semibold text-emerald-800">For recruiters and hiring teams</p>
              <h1
                id="recruiter-title"
                className="mt-4 max-w-xl text-[2.15rem] leading-[1.06] font-black tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.45rem] lg:leading-[1.02]"
              >
                What evidence supports this candidate for this role?
              </h1>
              <p className="mt-6 max-w-xl text-[0.95rem] leading-7 text-slate-600 sm:text-base">
                Start with the role requirement, review only evidence the
                candidate chose to share, mark what remains unknown, and carry
                the right question into a human conversation.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {publicSignupEnabled ? (
                  <Link href={ROUTES.SIGNUP} className={premiumPrimaryCta}>
                    Create recruiter account
                  </Link>
                ) : (
                  <Link href={ROUTES.SIGNUP} className={premiumPrimaryCta}>
                    Request recruiter access
                  </Link>
                )}
                {demoIsPublicEntry ? (
                  <Link href={ROUTES.RECRUITER_DEMO} className={premiumSecondaryCta}>
                    Explore recruiter demo
                  </Link>
                ) : null}
                <Link
                  href={ROUTES.LOGIN}
                  className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-slate-700 underline-offset-4 hover:text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                >
                  Existing recruiter login
                </Link>
              </div>

              {!publicSignupEnabled ? (
                <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600">
                  SkillMint is live with controlled recruiter admission. Request
                  access with an email only—no candidate data, resume, or
                  automatic account creation.
                </p>
              ) : null}
            </div>

            <article className="border border-slate-300 bg-white" aria-labelledby="recruiter-loop-title">
              <header className="grid gap-3 border-b border-slate-300 bg-slate-950 px-5 py-5 text-white sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Synthetic evidence review</p>
                  <h2 id="recruiter-loop-title" className="mt-1 text-xl font-black tracking-[-0.02em]">
                    Frontend product engineer · evidence sheet
                  </h2>
                </div>
                <p className="max-w-52 text-xs leading-5 text-slate-300 sm:text-right">
                  Candidate-authorized brief only. No raw resume access.
                </p>
              </header>

              <div role="table" aria-label="Synthetic evidence review by role requirement">
                <div role="row" className="hidden grid-cols-[1.05fr_1.45fr_0.65fr_1.35fr] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 md:grid">
                  <p role="columnheader">Role requirement</p>
                  <p role="columnheader">Candidate-authorized evidence</p>
                  <p role="columnheader">Support state</p>
                  <p role="columnheader">Human review question</p>
                </div>
                {evidenceReviewRows.map((row, index) => (
                  <section
                    key={row.requirement}
                    className="grid gap-3 border-b border-slate-200 px-5 py-5 last:border-b-0 md:grid-cols-[1.05fr_1.45fr_0.65fr_1.35fr] md:gap-4 md:px-6"
                    aria-label={`Review row ${index + 1}: ${row.requirement}`}
                    role="row"
                  >
                    <div role="cell">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 md:hidden">Requirement</p>
                      <h3 className="text-sm font-bold leading-6">{row.requirement}</h3>
                    </div>
                    <div role="cell">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 md:hidden">Authorized evidence</p>
                      <p className="text-sm leading-6 text-slate-600">{row.evidence}</p>
                    </div>
                    <div role="cell">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 md:hidden">Support state</p>
                      <p className={`text-sm font-bold ${row.stateClassName}`}>{row.state}</p>
                    </div>
                    <div role="cell">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 md:hidden">Human question</p>
                      <p className="text-sm font-semibold leading-6 text-slate-800">{row.question}</p>
                    </div>
                  </section>
                ))}
              </div>

              <footer className="border-t border-slate-300 bg-emerald-50 px-5 py-4 sm:px-6">
                <p className="text-sm leading-6 text-emerald-950">
                  This sheet organizes support, gaps, and questions. SkillMint
                  does not rank candidates, predict hiring outcomes, or make an
                  employer decision.
                </p>
              </footer>
            </article>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[0.8fr_1.2fr] md:py-16" aria-labelledby="recruiter-trust-title">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Review boundary</p>
            <h2 id="recruiter-trust-title" className="mt-2 text-3xl font-black tracking-[-0.03em]">
              Evidence in. Human judgment stays human.
            </h2>
          </div>
          <div className="space-y-5 border-l-2 border-slate-950 pl-5 sm:pl-7">
            <p className="max-w-3xl text-base leading-7 text-slate-700">
              SkillMint is not a searchable candidate database. Recruiter access
              is reviewed and server-authorized; an email domain does not prove
              employer identity. Candidate evidence appears only through a link
              the candidate chose to share and can revoke.
            </p>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Role evidence maps help a reviewer separate support, gaps, and
              unknowns. They do not shortlist, reject, or infer an employer
              outcome.
            </p>
            <Link
              href={ROUTES.PRIVACY}
              className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
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
