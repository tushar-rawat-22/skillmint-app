import type { UserProfile } from "@/intelligence/types/profile";
import type { ProofScoreResult } from "@/intelligence/proof";
import type {
  ATSResult,
  CareerIQResult,
  RecruiterResult,
  RoleMatchResult,
} from "@/intelligence/types/results";

type Props = {
  careerIQ: CareerIQResult;
  ats: ATSResult;
  recruiter: RecruiterResult;
  roleMatches: RoleMatchResult[];
  missions: string[];
  recommendations: string[];
  profile: UserProfile;
  proof: ProofScoreResult;
  hasLatestJobMatch?: boolean;
};

export default function RealityCheckCard({
  careerIQ,
  ats,
  recruiter,
  roleMatches,
  missions,
  recommendations,
  profile,
  proof,
  hasLatestJobMatch = false,
}: Props) {
  const nextAction = getNextBestAction(proof, missions, recommendations);
  const insights = [
    {
      label: "Strongest signal",
      text: getStrongSignal(profile, roleMatches, hasLatestJobMatch),
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    },
    {
      label: "Weakest signal",
      text: getWeakSignal(profile, ats, recruiter),
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    },
    {
      label: "Biggest risk",
      text: getHiringBlocker(profile, careerIQ, missions, recommendations),
      tone: "border-rose-500/30 bg-rose-500/10 text-rose-100",
    },
    {
      label: "Proof gap",
      text: getProofGap(proof),
      tone: "border-violet-500/30 bg-violet-500/10 text-violet-100",
    },
    {
      label: "Next best action",
      text: nextAction,
      tone: "border-sky-500/30 bg-sky-500/10 text-sky-100",
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-200/80">
            Harsh Truth
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            The honest read before applying
          </h2>
        </div>

        <p className="max-w-xl text-sm leading-6 text-neutral-400">
          Direct, resume-based guidance. Missing proof means unverified, not
          false.
        </p>
      </div>

      <p className="mt-5 max-w-4xl text-base leading-7 text-neutral-200">
        {getHarshTruthSummary(profile, proof, nextAction)}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        {insights.map((insight) => (
          <article
            key={insight.label}
            className={`rounded-2xl border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${insight.tone}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
              {insight.label}
            </p>

            <p className="mt-3 text-sm leading-6">
              {insight.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function getStrongSignal(
  profile: UserProfile,
  roleMatches: RoleMatchResult[],
  hasLatestJobMatch: boolean,
): string {
  const bestMatch = roleMatches[0];

  if (bestMatch && bestMatch.matchScore >= 65) {
    if (hasLatestJobMatch) {
      return `${bestMatch.role} is your strongest profile-fit direction, separate from your latest JD. The match still depends on visible project proof.`;
    }

    return `${bestMatch.role} is your strongest current direction, but the match still depends on visible project proof.`;
  }

  if (profile.projectsScore >= 12) {
    return "Your projects are doing the most work for your profile right now.";
  }

  if (profile.skillsScore >= 12) {
    return "Your skill coverage is visible, but skills alone will not convince recruiters.";
  }

  if (profile.educationScore >= 8) {
    return "Your education signal is clear. Now the profile needs stronger proof of ability.";
  }

  return "The profile has a starting point, but no standout hiring signal yet.";
}

function getWeakSignal(
  profile: UserProfile,
  ats: ATSResult,
  recruiter: RecruiterResult,
): string {
  if (profile.projectsScore < 9) {
    return "Project evidence is too thin or too generic for confident shortlisting.";
  }

  if (profile.experienceScore === 0) {
    return "There is no real internship or work signal yet, so recruiter confidence stays capped.";
  }

  if (ats.score < 60) {
    return "ATS readiness is weak because key resume sections or proof signals are missing.";
  }

  if (recruiter.score < 55) {
    return "Recruiter confidence is low because proof is not strong enough beyond keywords.";
  }

  return "The profile is decent, but needs sharper outcomes, numbers, and public proof.";
}

function getHiringBlocker(
  profile: UserProfile,
  careerIQ: CareerIQResult,
  missions: string[],
  recommendations: string[],
): string {
  const firstAction = [...missions, ...recommendations][0];

  if (!profile.github && !profile.linkedin) {
    return "No GitHub or LinkedIn proof makes the profile harder to trust quickly.";
  }

  if (!profile.analysisFlags?.hasMeasurableImpact) {
    return "No measurable impact is visible. Add numbers, users, performance, or outcomes.";
  }

  if (profile.projectsScore < 12) {
    return "The next hiring blocker is project quality. Build one stronger, deployed project.";
  }

  if (careerIQ.score < 70 && firstAction) {
    return `${firstAction} is the highest leverage next move.`;
  }

  return "The blocker is no longer one gap. You need stronger proof across multiple signals.";
}

function getProofGap(proof: ProofScoreResult): string {
  if (proof.evidenceBackedSkills.length === 0) {
    return "No evidence-backed skills were detected. Add proof candidates for the top claimed skills first.";
  }

  if (proof.unverifiedSkills.length > 0) {
    return `${proof.unverifiedSkills.length} claimed skill${
      proof.unverifiedSkills.length === 1 ? "" : "s"
    } still need clearer evidence candidates.`;
  }

  if (!proof.extractedProofLinks.length) {
    return "The resume has some internal evidence, but no proof links were detected.";
  }

  return "Proof candidates exist, but SkillMint has not externally verified those sources.";
}

function getNextBestAction(
  proof: ProofScoreResult,
  missions: string[],
  recommendations: string[],
): string {
  return proof.nextProofMove || [...missions, ...recommendations][0] ||
    "Upload a resume with projects, links, and measurable outcomes.";
}

function getHarshTruthSummary(
  profile: UserProfile,
  proof: ProofScoreResult,
  nextAction: string,
): string {
  const sentenceAction = formatSentenceAction(nextAction);

  if (!profile.projects.length) {
    return `Your resume shows skills, but not enough project proof. Before applying to stronger roles, ${sentenceAction}`;
  }

  if (proof.unverifiedSkills.length >= 3) {
    return `Your resume shows activity, but too many claimed skills are still unverified. Before applying to stronger roles, ${sentenceAction}`;
  }

  if (!profile.analysisFlags?.hasMeasurableImpact) {
    return `Your resume has signals, but the outcomes are thin. Before applying to stronger roles, ${sentenceAction}`;
  }

  return `Your resume has usable signals, but trust still depends on evidence candidates. The next move is clear: ${nextAction}`;
}

function formatSentenceAction(action: string): string {
  const trimmedAction = action.trim();

  if (!trimmedAction) {
    return "add evidence candidates for your top claimed skills.";
  }

  const sentence =
    `${trimmedAction.charAt(0).toLowerCase()}${trimmedAction.slice(1)}`;

  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
