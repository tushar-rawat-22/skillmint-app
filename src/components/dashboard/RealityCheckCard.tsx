import type { UserProfile } from "@/intelligence/types/profile";
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
  hasLatestJobMatch = false,
}: Props) {
  const insights = [
    {
      label: "What is strong",
      text: getStrongSignal(profile, roleMatches, hasLatestJobMatch),
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    },
    {
      label: "What is weak",
      text: getWeakSignal(profile, ats, recruiter),
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    },
    {
      label: "Blocking hiring",
      text: getHiringBlocker(profile, careerIQ, missions, recommendations),
      tone: "border-rose-500/30 bg-rose-500/10 text-rose-100",
    },
  ];

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Reality Check
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            The honest read
          </h2>
        </div>

        <p className="max-w-xl text-sm leading-6 text-neutral-400">
          Deterministic signals from resume structure, proof, and role fit.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
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
