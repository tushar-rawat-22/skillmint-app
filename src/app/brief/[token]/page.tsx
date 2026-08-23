import Link from "next/link";
import { notFound } from "next/navigation";

import {
  premiumEyebrow,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import { getSharedProofBrief } from "@/modules/proofBrief/proofBriefServer";

export const dynamic = "force-dynamic";

export default async function SharedProofBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedProofBrief(token);
  if (result.status === "not_found") notFound();

  if (result.status !== "available") {
    return (
      <main className="min-h-screen bg-[#f7f5ef] px-6 py-16 text-slate-950">
        <section className={`${premiumSurface} mx-auto max-w-2xl text-center`}>
          <p className={premiumEyebrow}>Proof Brief unavailable</p>
          <h1 className="mt-3 text-3xl font-black">This brief cannot be opened right now.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The sharing service may not be configured in this environment. No
            candidate data was displayed.
          </p>
          <Link
            href={ROUTES.HOME}
            prefetch={false}
            className={`${premiumSecondaryCta} mt-6`}
          >
            Return home
          </Link>
        </section>
      </main>
    );
  }

  const { payload, sharedAt } = result.brief;
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-6 py-8 text-slate-950 md:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={ROUTES.HOME}
            prefetch={false}
            className="text-2xl font-black tracking-tight"
          >
            SkillMint
          </Link>
          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-900">
            Candidate-authorized · link only
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-4 md:px-8">
            <p className="font-bold text-emerald-950">What is shared</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              A minimal derived evidence summary, selected skill support states,
              and entry counts chosen for recruiter review.
            </p>
            <p className="mt-3 font-bold text-emerald-950">What is not shared</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              No raw resume, email, phone, address, account identifier, browser
              data, employer, institution identifier, or source URL is shown.
            </p>
          </div>
          <div className="p-6 md:p-8">
            <p className={premiumEyebrow}>Proof Brief</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              What this resume currently supports
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-7 text-slate-700">
              {payload.currentSupport}
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Profile-fit direction: {payload.direction}
            </p>
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              <Summary title="Strongest support" body={payload.strongestSupport} tone="strong" />
              <Summary title="Main evidence gap" body={payload.mainEvidenceGap} tone="gap" />
              <Summary title="Best next move" body={payload.bestNextMove} tone="move" />
            </div>
          </div>
        </section>

        <section className={premiumSurface} aria-labelledby="brief-signals-title">
          <p className={premiumEyebrow}>Selected derived evidence</p>
          <h2 id="brief-signals-title" className="mt-2 text-2xl font-black">
            Support states for human review
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {payload.evidenceSignals.length ? payload.evidenceSignals.map((signal) => (
              <article key={`${signal.state}:${signal.label}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                  {supportLabel(signal.state)}
                </p>
                <h3 className="mt-2 font-bold">{signal.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{signal.detail}</p>
              </article>
            )) : (
              <p className="text-sm leading-6 text-slate-600">
                No selected skill support signals were available in this brief.
              </p>
            )}
          </div>
        </section>

        <section className={premiumSurface} aria-labelledby="brief-source-title">
          <p className={premiumEyebrow}>Source boundary</p>
          <h2 id="brief-source-title" className="mt-2 text-2xl font-black">Resume-internal evidence candidates only</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Count label="Project entries" value={payload.sourceSummary.projectEntries} />
            <Count label="Experience entries" value={payload.sourceSummary.experienceEntries} />
            <Count label="Link categories detected" value={payload.sourceSummary.evidenceCandidateLinks} />
          </dl>
          <p className="mt-5 border-l-4 border-amber-300 pl-4 text-sm leading-6 text-slate-700">
            SkillMint has not independently verified repositories, links,
            employment, education, identity, or candidate truthfulness. This
            brief helps a human decide what to ask; it does not recommend a
            shortlist, interview, hire, or rejection.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Shared {new Date(sharedAt).toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}. The candidate can revoke this link.
          </p>
        </section>
      </div>
    </main>
  );
}

function Summary({ title, body, tone }: { title: string; body: string; tone: "strong" | "gap" | "move" }) {
  const className = tone === "strong" ? "border-emerald-200 bg-emerald-50" : tone === "gap" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50";
  return <article className={`rounded-2xl border p-5 ${className}`}><h2 className="text-sm font-bold uppercase tracking-[0.14em]">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-800">{body}</p></article>;
}

function Count({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</dt><dd className="mt-2 text-3xl font-black tabular-nums">{value}</dd></div>;
}

function supportLabel(state: "STRONG" | "WEAK" | "UNCLEAR"): string {
  return state === "STRONG" ? "Strong support" : state === "WEAK" ? "Weak support" : "Unclear / missing support";
}
