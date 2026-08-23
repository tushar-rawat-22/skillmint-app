import Link from "next/link";

import {
  premiumEyebrow,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import { SYNTHETIC_RECRUITER_DEMO } from "@/modules/recruiterDemo/recruiterDemoFixture";

export default function SyntheticRecruiterDemo() {
  const demo = SYNTHETIC_RECRUITER_DEMO;

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-6 py-8 text-slate-950 md:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={ROUTES.HOME}
            prefetch={false}
            className="text-2xl font-black tracking-tight text-slate-950"
          >
            SkillMint
          </Link>
          <span className="rounded-full border border-violet-300 bg-violet-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-900">
            Public beta · recruiter synthetic demo
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="border-b border-violet-200 bg-violet-50 px-6 py-4 md:px-8">
            <p className="font-bold text-violet-950">
              Every role, candidate, evidence item, question, and feedback item on this page is synthetic demo data.
            </p>
            <p className="mt-1 text-sm leading-6 text-violet-800">
              Nothing belongs to a real person or organization, and no source or claim has been externally verified.
            </p>
          </div>
          <div className="p-6 md:p-8">
            <p className={premiumEyebrow}>Synthetic role evidence map</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">
              What evidence supports this candidate for this role?
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700">
              {demo.role.title}: {demo.role.purpose}
            </p>
            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-black">Evidence requirements</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
                {demo.role.evidenceRequirements.map((requirement) => (
                  <li key={requirement} className="border-l-4 border-emerald-300 pl-3">{requirement}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={premiumSurface} aria-labelledby="synthetic-brief-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={premiumEyebrow}>Candidate-authorized Proof Brief · synthetic</p>
              <h2 id="synthetic-brief-title" className="mt-2 text-3xl font-black">
                {demo.candidate.label}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">{demo.candidate.direction}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Read-only · synthetic
            </span>
          </div>
          <p className="mt-5 max-w-4xl border-l-4 border-violet-300 pl-4 text-sm leading-6 text-slate-600">
            {demo.candidate.scopeNotice}
          </p>

          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {demo.candidate.supportGroups.map((group) => (
              <article key={group.status} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">{group.status}</p>
                <h3 className="mt-3 font-bold">{group.summary}</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {group.evidence.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={premiumSurface} aria-labelledby="evidence-questions-title">
            <p className={premiumEyebrow}>Human review</p>
            <h2 id="evidence-questions-title" className="mt-2 text-2xl font-black">Evidence questions</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              These questions clarify evidence. They do not decide whether to interview, shortlist, hire, or reject anyone.
            </p>
            <ol className="mt-5 space-y-3">
              {demo.questions.map((question, index) => (
                <li key={question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                  <span className="mr-2 font-mono text-xs font-bold text-emerald-800">{String(index + 1).padStart(2, "0")}</span>
                  {question}
                </li>
              ))}
            </ol>
          </section>

          <section className={premiumSurface} aria-labelledby="synthetic-feedback-title">
            <p className={premiumEyebrow}>Structured feedback preview</p>
            <h2 id="synthetic-feedback-title" className="mt-2 text-2xl font-black">Feedback to the candidate</h2>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Selected category</p>
              <p className="mt-2 font-bold text-amber-950">{demo.feedback.selectedCategory}</p>
              <p className="mt-3 text-sm leading-6 text-amber-900">{demo.feedback.note}</p>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <p className="mx-auto max-w-3xl text-sm leading-6 text-slate-600">
            This page uses fixed synthetic data and saves nothing. Navigation
            away from the demo happens only after you choose a link.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href={ROUTES.RECRUITERS} prefetch={false} className={premiumSecondaryCta}>
              Recruiter overview
            </Link>
            <Link href={ROUTES.DEMO} prefetch={false} className={premiumSecondaryCta}>
              Candidate demo
            </Link>
            <Link href={ROUTES.HOME} prefetch={false} className={premiumSecondaryCta}>
              Return home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
