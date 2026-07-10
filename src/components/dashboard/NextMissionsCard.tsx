import {
  premiumBadge,
  premiumCompactSurface,
  premiumEyebrow,
  premiumInsetSurface,
} from "@/components/ui/premium";

type Props = {
  missions: string[];
  recommendations: string[];
  proofNextMove?: string;
  atsMissingSkills?: string[];
  hasResumeAnalysis?: boolean;
};

export default function NextMissionsCard({
  missions,
  recommendations,
  proofNextMove,
  atsMissingSkills = [],
  hasResumeAnalysis = false,
}: Props) {
  const actions = getActions({
    missions,
    recommendations,
    proofNextMove,
    atsMissingSkills,
    hasResumeAnalysis,
  });
  const primaryAction = actions[0];
  const supportingActions = actions.slice(1);
  const primaryMeta = getMissionMeta(primaryAction, 0);

  return (
    <section className={`${premiumCompactSurface} flex h-full flex-col p-0`}>
      <div className="border-b border-slate-200 p-6">
        <p className={premiumEyebrow}>
          Next Missions
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          What to fix next
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Prioritized career actions for the next visible proof upgrade.
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                Primary Next Action
              </p>

              <h3 className="mt-3 text-xl font-black leading-snug text-slate-950">
                {primaryAction}
              </h3>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
              <MissionBadge label={`Priority: ${primaryMeta.priority}`} />
              <MissionBadge label={`Impact: ${primaryMeta.impact}`} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MissionSignal
              label="Expected outcome"
              value={primaryMeta.expectedOutcome}
            />

            <MissionSignal
              label="Why this matters"
              value={getMissionReason(primaryAction)}
            />
          </div>
        </article>

        <div className="mt-5 grid flex-1 gap-3">
          {supportingActions.length ? (
            supportingActions.map((action, index) => (
              <SupportingMissionCard
                key={action}
                action={action}
                index={index}
              />
            ))
          ) : (
            <article className={premiumInsetSurface}>
              <p className="text-sm leading-6 text-slate-600">
                Upload a resume or run a job match to unlock sharper mission
                sequencing.
              </p>
            </article>
          )}
        </div>

        <div className={`mt-5 ${premiumInsetSurface}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Mission Stack
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {actions.length} prioritized action
                {actions.length === 1 ? "" : "s"} ready
              </p>
            </div>

            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{
                  width: `${Math.min(100, actions.length * 34)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type SupportingMissionCardProps = {
  action: string;
  index: number;
};

function SupportingMissionCard({
  action,
  index,
}: SupportingMissionCardProps) {
  const meta = getMissionMeta(action, index + 1);

  return (
    <article
      key={action}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-black text-slate-700">
          {index + 2}
        </span>

        <div className="min-w-0">
          <p className="font-bold text-slate-950">
            {action}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <MissionBadge label={`Priority: ${meta.priority}`} />
            <MissionBadge label={`Impact: ${meta.impact}`} />
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {getMissionReason(action)}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            Expected outcome: {meta.expectedOutcome}
          </p>
        </div>
      </div>
    </article>
  );
}

type MissionSignalProps = {
  label: string;
  value: string;
};

function MissionSignal({ label, value }: MissionSignalProps) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
        {label}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
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

type MissionMeta = {
  priority: "High" | "Medium" | "Low";
  impact: "Proof Confidence" | "ATS" | "Recruiter Trust" | "Portfolio" | "Interview" | "Skill Gap";
  expectedOutcome: string;
};

function getMissionMeta(action: string, index: number): MissionMeta {
  const normalizedAction = action.toLowerCase();
  const impact = getMissionImpact(normalizedAction);
  const priority = getMissionPriority(normalizedAction, index);

  return {
    priority,
    impact,
    expectedOutcome: getExpectedOutcome(impact),
  };
}

function getMissionPriority(
  normalizedAction: string,
  index: number,
): MissionMeta["priority"] {
  if (
    index === 0 ||
    normalizedAction.includes("jd gap") ||
    normalizedAction.includes("proof") ||
    normalizedAction.includes("missing")
  ) {
    return "High";
  }

  if (
    normalizedAction.includes("linkedin") ||
    normalizedAction.includes("profile")
  ) {
    return "Low";
  }

  return "Medium";
}

function getMissionImpact(normalizedAction: string): MissionMeta["impact"] {
  if (
    normalizedAction.includes("jd gap") ||
    normalizedAction.includes("ats") ||
    normalizedAction.includes("keyword")
  ) {
    return "ATS";
  }

  if (
    normalizedAction.includes("github") ||
    normalizedAction.includes("portfolio") ||
    normalizedAction.includes("demo")
  ) {
    return "Portfolio";
  }

  if (
    normalizedAction.includes("interview") ||
    normalizedAction.includes("answer")
  ) {
    return "Interview";
  }

  if (
    normalizedAction.includes("learn") ||
    normalizedAction.includes("skill") ||
    normalizedAction.includes("gap")
  ) {
    return "Skill Gap";
  }

  if (
    normalizedAction.includes("project") ||
    normalizedAction.includes("proof")
  ) {
    return "Proof Confidence";
  }

  return "Recruiter Trust";
}

function getExpectedOutcome(impact: MissionMeta["impact"]): string {
  if (impact === "Proof Confidence") {
    return "More claimed skills become supported by visible evidence candidates.";
  }

  if (impact === "ATS") {
    return "The next job match becomes easier to read and tailor truthfully.";
  }

  if (impact === "Portfolio") {
    return "Your strongest work becomes easier for recruiters to inspect.";
  }

  if (impact === "Interview") {
    return "You can explain your projects and choices with less guessing.";
  }

  if (impact === "Skill Gap") {
    return "A missing skill becomes something you can learn, build, and then add truthfully.";
  }

  return "Recruiters get a clearer reason to trust the resume claims.";
}

function getActions({
  missions,
  recommendations,
  proofNextMove,
  atsMissingSkills,
  hasResumeAnalysis,
}: {
  missions: string[];
  recommendations: string[];
  proofNextMove?: string;
  atsMissingSkills: string[];
  hasResumeAnalysis: boolean;
}): string[] {
  const prioritizedActions = [
    proofNextMove,
    atsMissingSkills.length
      ? `Close latest JD gap truthfully: ${atsMissingSkills[0]}`
      : undefined,
    hasResumeAnalysis ? "Improve GitHub/project proof" : undefined,
    ...missions,
    ...recommendations,
  ].filter((action): action is string => {
    if (!action?.trim()) {
      return false;
    }

    return !hasResumeAnalysis || !isUploadResumeAction(action);
  });
  const uniqueActions = new Set(prioritizedActions);
  const actions = Array.from(uniqueActions).slice(0, 3);

  if (actions.length) {
    return actions;
  }

  return hasResumeAnalysis
    ? ["Strengthen one project with clearer proof links and outcomes"]
    : ["Upload a resume to generate missions"];
}

function getMissionReason(action: string): string {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes("project")) {
    return "Projects convert skills into proof, which matters more than keyword volume.";
  }

  if (normalizedAction.includes("github")) {
    return "A public repository makes your work easier to inspect and trust.";
  }

  if (normalizedAction.includes("resume")) {
    return "Resume structure controls how quickly your strongest evidence is understood.";
  }

  if (normalizedAction.includes("ats")) {
    return "ATS clarity helps the right experience and skills survive the first screen.";
  }

  if (normalizedAction.includes("jd gap")) {
    return "Latest JD gaps should be learned or proved truthfully before they appear on the resume.";
  }

  if (normalizedAction.includes("linkedin")) {
    return "LinkedIn fills the trust gap between your resume and public identity.";
  }

  return "This is the next practical move from your current readiness signals.";
}

function isUploadResumeAction(action: string): boolean {
  return action.toLowerCase().includes("upload a resume");
}
