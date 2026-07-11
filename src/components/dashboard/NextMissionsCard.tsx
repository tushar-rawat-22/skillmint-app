import Link from "next/link";

import {
  premiumBadge,
  premiumCompactSurface,
  premiumEyebrow,
  premiumInsetSurface,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import type { Mission } from "@/intelligence/missions";

type Props = {
  missions: string[];
  recommendations: string[];
  proofNextMove?: string;
  atsMissingSkills?: string[];
  hasResumeAnalysis?: boolean;
  nextBestMissions?: Mission[];
};

export default function NextMissionsCard({
  missions,
  recommendations,
  proofNextMove,
  atsMissingSkills = [],
  hasResumeAnalysis = false,
  nextBestMissions = [],
}: Props) {
  const missionActions = getMissionActions({
    nextBestMissions,
    missions,
    recommendations,
    proofNextMove,
    atsMissingSkills,
    hasResumeAnalysis,
  });
  const primaryAction = missionActions[0];
  const supportingActions = missionActions.slice(1);

  return (
    <section className={`${premiumCompactSurface} flex h-full flex-col p-0`}>
      <div className="border-b border-slate-200 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={premiumEyebrow}>
              Next best things
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              What to do next
            </h2>
          </div>

          <Link
            href="/roadmap"
            className={`${premiumSecondaryCta} w-fit`}
          >
            Open roadmap
          </Link>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Based on your latest resume evidence. Full 30/60/90 proof plans live
          on the roadmap.
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {primaryAction ? (
          <MissionActionCard
            mission={primaryAction}
            index={0}
            featured
          />
        ) : (
          <article className={premiumInsetSurface}>
            <p className="text-sm leading-6 text-slate-600">
              Upload a resume to generate the next best proof-building action.
            </p>
          </article>
        )}

        <div className="mt-5 grid flex-1 gap-3">
          {supportingActions.map((mission, index) => (
            <MissionActionCard
              key={mission.id}
              mission={mission}
              index={index + 1}
            />
          ))}
        </div>

        <div className={`mt-5 ${premiumInsetSurface}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Mission trust rule
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                Marking done never changes scores. Re-upload your resume so
                SkillMint can detect evidence.
              </p>
            </div>

            <span className={premiumBadge}>
              Max 3 shown
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

type MissionActionCardProps = {
  mission: Mission;
  index: number;
  featured?: boolean;
};

function MissionActionCard({
  mission,
  index,
  featured = false,
}: MissionActionCardProps) {
  const cardClassName = featured
    ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
    : "rounded-2xl border border-slate-200 bg-white p-4";

  return (
    <article className={cardClassName}>
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-black text-slate-700">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {mission.linkedScore}
              </p>

              <h3 className="mt-2 break-words text-lg font-black leading-snug text-slate-950">
                {mission.title}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <MissionBadge label={`Impact: ${mission.impact}`} />
              <MissionBadge label={formatStatus(mission.status)} />
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {mission.whyThisMatters}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Expected outcome: {mission.expectedOutcome}
          </p>
        </div>
      </div>
    </article>
  );
}

type MissionBadgeProps = {
  label: string;
};

function MissionBadge({ label }: MissionBadgeProps) {
  return (
    <span className={`${premiumBadge} break-words text-left leading-5`}>
      {label}
    </span>
  );
}

function getMissionActions({
  nextBestMissions,
  missions,
  recommendations,
  proofNextMove,
  atsMissingSkills,
  hasResumeAnalysis,
}: {
  nextBestMissions: Mission[];
  missions: string[];
  recommendations: string[];
  proofNextMove?: string;
  atsMissingSkills: string[];
  hasResumeAnalysis: boolean;
}): Mission[] {
  if (nextBestMissions.length) {
    return nextBestMissions.slice(0, 3);
  }

  const fallbackActions = [
    proofNextMove,
    atsMissingSkills.length
      ? `Close latest JD gap truthfully: ${atsMissingSkills[0]}`
      : undefined,
    ...missions,
    ...recommendations,
  ].filter((action): action is string => {
    const actionText = action?.trim();

    if (!actionText) {
      return false;
    }

    return hasResumeAnalysis || !isUploadResumeAction(actionText);
  });

  return Array.from(new Set(fallbackActions))
    .slice(0, 3)
    .map((action, index) => ({
      id: `dashboard:fallback:${index}:${action.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: action,
      category: "proof",
      status: "suggested",
      priority: 100 - index,
      impact: index === 0 ? "high" : "medium",
      difficulty: "medium",
      linkedScore: "Proof Confidence",
      sourcePath: "global",
      whyThisMatters:
        "This is the next practical move from your current readiness signals.",
      evidenceNeeded:
        "Visible resume evidence, proof candidate links, or measurable outcomes.",
      steps: [
        "Make the evidence visible in your resume.",
        "Re-upload your resume after the edit.",
      ],
      completionCheck:
        "Re-upload your resume so SkillMint can check whether the evidence is now visible.",
      expectedOutcome:
        "Scores can improve only after resume evidence changes and SkillMint detects it.",
      createdFrom: "proof_blocker",
    }));
}

function isUploadResumeAction(action: string): boolean {
  return action.toLowerCase().includes("upload a resume");
}

function formatStatus(status: Mission["status"]): string {
  if (status === "done_by_user") return "Marked done";
  if (status === "evidence_detected") return "Evidence detected";

  return status.replace(/_/g, " ");
}
