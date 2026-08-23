import PublicBetaHeader from "@/components/layout/PublicBetaHeader";
import { premiumEyebrow, premiumHeroSurface } from "@/components/ui/premium";
import RecruiterWorkspaceClient from "@/modules/recruiterEvidence/components/RecruiterWorkspaceClient";

export default function RecruiterWorkspacePage() {
  return <><PublicBetaHeader /><main className="min-h-screen bg-[#f7f5ef] px-6 py-12 text-slate-950"><div className="mx-auto max-w-5xl space-y-6"><section className={premiumHeroSurface}><p className={premiumEyebrow}>Recruiter evidence workspace</p><h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Define what evidence matters before reviewing a candidate.</h1><p className="mt-4 max-w-3xl leading-7 text-slate-600">Role maps organize human questions. They do not score, rank, shortlist, reject, or predict whether someone should be hired.</p></section><RecruiterWorkspaceClient /></div></main></>;
}
