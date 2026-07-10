import {
  premiumEyebrow,
  premiumSurface,
} from "@/components/ui/premium";
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
      tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
    {
      label: "Weakest signal",
      text: getWeakSignal(profile, ats, recruiter),
      tone: "border-amber-200 bg-amber-50 text-amber-950",
    },
    {
      label: "Biggest risk",
      text: getHiringBlocker(profile, careerIQ, missions, recommendations),
      tone: "border-rose-200 bg-rose-50 text-rose-950",
    },
    {
      label: "Proof gap",
      text: getProofGap(proof),
      tone: "border-slate-200 bg-slate-50 text-slate-900",
    },
    {
      label: "Next best action",
      text: nextAction,
      tone: "border-sky-200 bg-sky-50 text-sky-950",
    },
  ];

  return (
    <section className={premiumSurface}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Harsh Truth
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            The honest read before applying
          </h2>
        </div>

        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Direct, resume-based guidance. Missing proof means unverified, not
          false.
        </p>
      </div>

      <p className="mt-5 max-w-4xl text-base leading-7 text-slate-700">
        {getHarshTruthSummary(profile, proof, nextAction)}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <article
            key={insight.label}
            className={`rounded-2xl border p-5 ${insight.tone}`}
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
