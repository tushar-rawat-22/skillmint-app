import {
  premiumCompactSurface,
  premiumEyebrow,
  premiumInsetSurface,
} from "@/components/ui/premium";
import type { RoleMatchResult } from "@/intelligence/types/results";
import type { ProofScoreResult } from "@/intelligence/proof";
import type { UserProfile } from "@/intelligence/types/profile";

type Props = {
  matches: RoleMatchResult[];
  profile: UserProfile;
  proof: ProofScoreResult;
};

export default function CareerMatchCard({
  matches,
  profile,
  proof,
}: Props) {
  const topMatches = matches.slice(0, 3);

  return (
    <section className="text-slate-950">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Career Fit Engine
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Profile-fit roles
          </h2>
        </div>

        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Profile-fit roles show where your resume naturally fits. Latest JD
          Match shows fit for one specific pasted job.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {topMatches.map((match) => {
          const matchedSignals = getMatchedSignals(match);
          const supportingEvidence = getSupportingEvidence(profile, proof);
          const trustLimits = getTrustLimits(match, profile, proof);

          return (
            <div
              key={match.role}
              className={premiumCompactSurface}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">
                    {match.role}
                  </h3>

                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                    {match.category} | {match.salaryRange} | {match.difficulty}
                  </p>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-2xl font-black tabular-nums text-emerald-700">
                    {Math.round(match.matchScore)}%
                  </p>

                  <p className="text-xs text-slate-500">
                    match
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${match.matchScore}%` }}
                />
              </div>

              <div className={`mt-5 ${premiumInsetSurface}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Why this role appears
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  SkillMint suggested this as a general profile-fit role because
                  your resume contains matching detected signals. It is separate
                  from any Latest JD Match.
                </p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <RoleReasonBlock
                  title="Matched signals"
                  tone="success"
                  items={matchedSignals}
                  emptyText="Not enough matching signals yet."
                />

                <RoleReasonBlock
                  title="Supporting resume evidence"
                  tone="neutral"
                  items={supportingEvidence}
                  emptyText="Add projects, links, or experience to support this direction."
                />

                <RoleReasonBlock
                  title="Trust limits"
                  tone="warning"
                  items={trustLimits}
                  emptyText="No major gaps detected."
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type RoleReasonBlockProps = {
  title: string;
  tone: "success" | "warning" | "neutral";
  items: string[];
  emptyText: string;
};

function RoleReasonBlock({
  title,
  tone,
  items,
  emptyText,
}: RoleReasonBlockProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className={`max-w-full break-words rounded-full px-3 py-1 text-xs leading-5 ${getReasonPillClassName(tone)}`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">
            {emptyText}
          </span>
        )}
      </div>
    </div>
  );
}

function getReasonPillClassName(
  tone: RoleReasonBlockProps["tone"],
): string {
  if (tone === "success") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "warning") {
    return "border border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border border-slate-200 bg-slate-50 text-slate-700";
}

function getMatchedSignals(match: RoleMatchResult): string[] {
  return match.why.length
    ? match.why.slice(0, 5)
    : [];
}

function getSupportingEvidence(
  profile: UserProfile,
  proof: ProofScoreResult,
): string[] {
  const signals = [
    profile.projects.length > 0
      ? `${profile.projects.length} project${
        profile.projects.length === 1 ? "" : "s"
      } detected`
      : null,
    profile.experience.length > 0
      ? `${profile.experience.length} experience entr${
        profile.experience.length === 1 ? "y" : "ies"
      } detected`
      : null,
    proof.extractedProofLinks.length > 0
      ? `${proof.extractedProofLinks.length} evidence candidate${
        proof.extractedProofLinks.length === 1 ? "" : "s"
      } from links`
      : null,
    profile.education ? "Education signal detected" : null,
  ].filter((item): item is string => Boolean(item));

  return signals.slice(0, 4);
}

function getTrustLimits(
  match: RoleMatchResult,
  profile: UserProfile,
  proof: ProofScoreResult,
): string[] {
  const limits = [
    ...match.gaps.slice(0, 2).map((gap) => `${gap} missing or weak`),
    proof.unverifiedSkills.length > 0
      ? `${proof.unverifiedSkills.length} claimed skill${
        proof.unverifiedSkills.length === 1 ? "" : "s"
      } unverified`
      : null,
    proof.evidenceBackedSkills.length === 0
      ? "Evidence-backed skills missing"
      : null,
    !profile.analysisFlags?.hasMeasurableImpact
      ? "Measurable outcomes weak"
      : null,
  ].filter((item): item is string => Boolean(item));

  return limits.slice(0, 4);
}
