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

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(124,58,237,0.12),rgba(15,23,42,0.78))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="border-b border-white/10 bg-black/20 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Next Missions
        </p>

        <h2 className="mt-2 text-2xl font-black">
          What to fix next
        </h2>

        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Mission control for the next visible proof upgrade.
        </p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <article className="rounded-2xl border border-violet-400/30 bg-violet-400/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                Primary Next Action
              </p>

              <h3 className="mt-3 text-xl font-black leading-snug">
                {primaryAction}
              </h3>
            </div>

            <span className="shrink-0 rounded-full border border-violet-500/30 bg-black/20 px-3 py-1 text-xs font-bold text-violet-100">
              High impact
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MissionSignal
              label="Impact Preview"
              value={getImpactPreview(primaryAction)}
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
              <article
                key={action}
                className="rounded-2xl border border-white/10 bg-black/28 p-4"
              >
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 text-xs font-black text-neutral-200">
                    {index + 2}
                  </span>

                  <div className="min-w-0">
                    <p className="font-bold">
                      {action}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-neutral-400">
                      {getMissionReason(action)}
                    </p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="rounded-lg border border-neutral-800 bg-black/30 p-4">
              <p className="text-sm leading-6 text-neutral-400">
                Upload a resume or run a job match to unlock sharper mission
                sequencing.
              </p>
            </article>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/28 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Mission Stack
              </p>

              <p className="mt-1 text-sm text-neutral-300">
                {actions.length} prioritized action
                {actions.length === 1 ? "" : "s"} ready
              </p>
            </div>

            <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-emerald-400"
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

type MissionSignalProps = {
  label: string;
  value: string;
};

function MissionSignal({ label, value }: MissionSignalProps) {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300/70">
        {label}
      </p>

      <p className="mt-2 text-sm leading-6 text-violet-50/90">
        {value}
      </p>
    </div>
  );
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

function getImpactPreview(action: string): string {
  const normalizedAction = action.toLowerCase();

  if (
    normalizedAction.includes("project") ||
    normalizedAction.includes("github") ||
    normalizedAction.includes("proof")
  ) {
    return "Strengthens recruiter trust and gives interviews something concrete to discuss.";
  }

  if (
    normalizedAction.includes("resume") ||
    normalizedAction.includes("ats") ||
    normalizedAction.includes("keyword") ||
    normalizedAction.includes("jd gap")
  ) {
    return "Improves screening clarity before a recruiter reads the full profile.";
  }

  if (
    normalizedAction.includes("linkedin") ||
    normalizedAction.includes("profile")
  ) {
    return "Makes public proof easier to verify after someone opens your resume.";
  }

  return "Raises the next visible readiness signal without changing the scoring model.";
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
