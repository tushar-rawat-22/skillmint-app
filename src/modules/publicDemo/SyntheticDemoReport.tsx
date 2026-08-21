import Link from "next/link";

import {
  premiumEyebrow,
  premiumHeroSurface,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import { SYNTHETIC_DEMO } from "@/modules/publicDemo/syntheticDemo";

export default function SyntheticDemoReport() {
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
            Private pilot · synthetic demo
          </span>
        </div>

        <section className={`${premiumHeroSurface} overflow-hidden p-0`}>
          <div className="border-b border-violet-200 bg-violet-50 px-6 py-4 md:px-8">
            <p className="font-bold text-violet-950">
              All candidate, resume, evidence, and job-description information
              on this page is synthetic demo data.
            </p>
            <p className="mt-1 text-sm leading-6 text-violet-800">
              Nothing here belongs to a real person, and SkillMint has not
              externally verified any source or claim.
            </p>
          </div>

          <div className="p-6 md:p-8">
            <p className={premiumEyebrow}>Evidence Summary</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              {SYNTHETIC_DEMO.candidateLabel}
            </p>

            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">
              What this resume currently supports
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-7 text-slate-700">
              {SYNTHETIC_DEMO.supportedDirection}
            </p>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              <SummaryBlock
                title="Strongest support"
                body={SYNTHETIC_DEMO.strongestSupport}
                tone="success"
              />
              <SummaryBlock
                title="Main evidence gap"
                body={SYNTHETIC_DEMO.mainEvidenceGap}
                tone="warning"
              />
              <SummaryBlock
                title="Best next move"
                body={SYNTHETIC_DEMO.bestNextMove}
                tone="action"
              />
            </div>
          </div>
        </section>

        <section className={premiumSurface} aria-labelledby="demo-evidence-title">
          <p className={premiumEyebrow}>Synthetic evidence only</p>
          <h2 id="demo-evidence-title" className="mt-2 text-2xl font-black">
            Selected synthetic evidence sources
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            These are invented resume-internal evidence candidates. They are
            not repository scans, identity checks, or third-party verification.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {SYNTHETIC_DEMO.evidenceSources.map((source) => (
              <article
                key={source.label}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {source.support}
                </p>
                <h3 className="mt-3 font-bold text-slate-950">
                  {source.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {source.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className={premiumSurface} aria-labelledby="demo-jd-title">
            <p className={premiumEyebrow}>Synthetic JD relevance</p>
            <h2 id="demo-jd-title" className="mt-2 text-2xl font-black">
              {SYNTHETIC_DEMO.jobDescription.label}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This compares two fixed synthetic text fixtures. It is not an
              employer assessment or a prediction of selection.
            </p>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-900">
                Deterministic relevance result
              </p>
              <p className="mt-2 text-4xl font-black tabular-nums text-slate-950">
                {SYNTHETIC_DEMO.jobDescription.relevanceScore}%
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <EvidenceList
                title="Matched synthetic signals"
                items={SYNTHETIC_DEMO.jobDescription.matched}
              />
              <EvidenceList
                title="Remaining synthetic gaps"
                items={SYNTHETIC_DEMO.jobDescription.gaps}
              />
            </div>
          </section>

          <section className={premiumSurface} aria-labelledby="proof-brief-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={premiumEyebrow}>Read-only preview</p>
                <h2 id="proof-brief-title" className="mt-2 text-2xl font-black">
                  Proof Brief
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Synthetic · not editable
              </span>
            </div>

            <dl className="mt-5 space-y-4">
              <BriefItem label="Direction" value={SYNTHETIC_DEMO.proofBrief.direction} />
              <BriefItem label="Current support" value={SYNTHETIC_DEMO.proofBrief.evidence} />
              <BriefItem label="Limit" value={SYNTHETIC_DEMO.proofBrief.limitation} />
              <BriefItem label="Next proof action" value={SYNTHETIC_DEMO.proofBrief.action} />
            </dl>
          </section>
        </div>

        <details className={premiumSurface}>
          <summary className="cursor-pointer text-xl font-black text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
            How this analysis was calculated
          </summary>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
            These fixed values demonstrate the existing deterministic product
            hierarchy. They do not come from a live upload, external source,
            model call, or verified candidate record.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Calculation label="Career IQ" value={SYNTHETIC_DEMO.calculations.careerIQ} detail="Weighted resume evidence categories" />
            <Calculation label="Proof Confidence" value={SYNTHETIC_DEMO.calculations.proofConfidence} detail="Resume-internal support candidates" />
            <Calculation label="ATS readiness" value={SYNTHETIC_DEMO.calculations.atsReadiness} detail="Deterministic structure signal" />
            <Calculation label="JD relevance" value={SYNTHETIC_DEMO.calculations.jdRelevance} detail="One synthetic job description" />
          </div>
        </details>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            Real-resume analysis is available only to authenticated existing
            users during the private pilot. Public signup remains closed.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={ROUTES.LOGIN}
              prefetch={false}
              className={premiumSecondaryCta}
            >
              Existing user login
            </Link>
            <Link
              href={ROUTES.HOME}
              prefetch={false}
              className={premiumSecondaryCta}
            >
              Return home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryBlock({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "success" | "warning" | "action";
}) {
  const toneClassName = tone === "success"
    ? "border-emerald-200 bg-emerald-50"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-sky-200 bg-sky-50";

  return (
    <article className={`rounded-2xl border p-5 ${toneClassName}`}>
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-700">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-800">{body}</p>
    </article>
  );
}

function EvidenceList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  );
}

function Calculation({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tabular-nums text-slate-950">
        {value}%
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
    </article>
  );
}
