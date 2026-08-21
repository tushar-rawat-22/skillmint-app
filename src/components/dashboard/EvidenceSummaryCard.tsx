import Link from "next/link";

import {
  premiumEyebrow,
  premiumHeroSurface,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import type { ProofScoreResult } from "@/intelligence/proof";
import type { UserProfile } from "@/intelligence/types/profile";
import type { RoleMatchResult } from "@/intelligence/types/results";

type Props = {
  profile: UserProfile;
  proof: ProofScoreResult;
  bestMatch?: RoleMatchResult;
};

export default function EvidenceSummaryCard({
  profile,
  proof,
  bestMatch,
}: Props) {
  const evidenceSources = getEvidenceSources(profile, proof);

  return (
    <section className={`${premiumHeroSurface} overflow-hidden p-0`}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className={premiumEyebrow}>Evidence Summary</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">
              What your resume currently supports
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-7 text-slate-700">
              {bestMatch
                ? `Your current resume supports exploring ${bestMatch.role} as a profile-fit direction. This is resume-based guidance, not an employer decision or hiring prediction.`
                : "Your current resume contains evidence candidates, but it does not yet support a clear profile-fit direction. Missing proof means unverified, not false."}
            </p>
          </div>
          <Link href="/resume" className={`${premiumSecondaryCta} w-fit`}>
            Review resume evidence
          </Link>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <SummaryItem
            title="Strongest support"
            body={proof.strongestEvidence}
            tone="success"
          />
          <SummaryItem
            title="Main evidence gap"
            body={proof.weakestEvidence}
            tone="warning"
          />
          <SummaryItem
            title="Best next move"
            body={proof.nextProofMove}
            tone="action"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50/80 p-6 md:px-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">
          Selected resume evidence
        </h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
          {evidenceSources.map((source) => (
            <li
              key={source}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              {source}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          SkillMint reads resume-internal evidence candidates. It does not
          externally verify links, repositories, employment, education,
          identity, or candidate truthfulness.
        </p>
        <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-950">
              What changed since a prior analysis?
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Compare two saved reports to see changed resume evidence. A
              difference does not prove that you gained or lost a skill.
            </p>
          </div>
          <Link
            href={ROUTES.RESUME_COMPARE}
            className={`${premiumSecondaryCta} w-fit shrink-0`}
          >
            Compare saved evidence
          </Link>
        </div>
      </div>
    </section>
  );
}

function SummaryItem({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "success" | "warning" | "action";
}) {
  const className = tone === "success"
    ? "border-emerald-200 bg-emerald-50"
    : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-sky-200 bg-sky-50";

  return (
    <article className={`rounded-2xl border p-5 ${className}`}>
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-700">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-800">{body}</p>
    </article>
  );
}

function getEvidenceSources(
  profile: UserProfile,
  proof: ProofScoreResult,
): string[] {
  const sources = [
    proof.evidenceBackedSkills.length
      ? `${proof.evidenceBackedSkills.slice(0, 3).join(", ")} supported by resume context.`
      : null,
    profile.projects.length
      ? `${profile.projects.length} project entr${profile.projects.length === 1 ? "y" : "ies"} detected for review.`
      : null,
    profile.experience.length
      ? `${profile.experience.length} experience entr${profile.experience.length === 1 ? "y" : "ies"} detected for review.`
      : null,
    proof.extractedProofLinks.length
      ? `${proof.extractedProofLinks.length} link evidence candidate${proof.extractedProofLinks.length === 1 ? "" : "s"} detected but not externally checked.`
      : null,
  ].filter((source): source is string => Boolean(source));

  return sources.length
    ? sources.slice(0, 3)
    : [
        "No supported skill context detected yet.",
        "No project evidence detected yet.",
        "No experience or link evidence detected yet.",
      ];
}
