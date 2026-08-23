import { notFound } from "next/navigation";

import { premiumEyebrow, premiumHeroSurface } from "@/components/ui/premium";
import { getSharedProofBrief } from "@/modules/proofBrief/proofBriefServer";
import RecruiterReviewClient from "@/modules/recruiterEvidence/components/RecruiterReviewClient";

export const dynamic = "force-dynamic";

export default async function RecruiterReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSharedProofBrief(token);
  if (result.status === "not_found") notFound();
  if (result.status !== "available") return <main className="min-h-screen bg-[#f7f5ef] px-6 py-16"><section className={`${premiumHeroSurface} mx-auto max-w-3xl text-center`}><h1 className="text-3xl font-black">Evidence review is unavailable.</h1><p className="mt-4 text-slate-600">No candidate information was displayed.</p></section></main>;
  const { payload } = result.brief;
  return <main className="min-h-screen bg-[#f7f5ef] px-6 py-10 text-slate-950"><div className="mx-auto max-w-5xl space-y-6"><section className={premiumHeroSurface}><p className={premiumEyebrow}>Candidate-authorized evidence review</p><h1 className="mt-3 text-4xl font-black tracking-tight">What evidence supports this candidate for this role?</h1><p className="mt-4 max-w-3xl leading-7 text-slate-600">{payload.currentSupport}</p><div className="mt-6 grid gap-3 md:grid-cols-3">{payload.evidenceSignals.map((signal) => <article key={`${signal.state}:${signal.label}`} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-emerald-800">{signal.state === "UNCLEAR" ? "Unclear / missing support" : `${signal.state.toLowerCase()} support`}</p><h2 className="mt-2 font-black">{signal.label}</h2><p className="mt-2 text-sm text-slate-600">{signal.detail}</p></article>)}</div><p className="mt-5 border-l-4 border-amber-300 pl-4 text-sm text-slate-700">These are resume-internal evidence signals, not external verification. Human judgment remains authoritative; no ranking or hiring recommendation is produced.</p></section><RecruiterReviewClient shareToken={token} brief={payload} /></div></main>;
}
