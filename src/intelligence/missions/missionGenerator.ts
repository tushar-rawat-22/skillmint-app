import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ProofScoreResult } from "@/intelligence/proof";
import {
  isJdMatchCurrentForResume,
  type ActiveTarget,
  type ActiveTargetResumeContext,
} from "@/intelligence/target";
import type { UserProfile } from "@/intelligence/types/profile";
import type {
  CareerIQResult,
  RoleMatchResult,
} from "@/intelligence/types/results";

import {
  makeMissionId,
  type Mission,
  type MissionSourcePath,
} from "./missionContract";
import { prioritizeMissions } from "./missionPrioritizer";

export type LatestJobMissionContext = {
  title?: string;
  companyName?: string;
  result: JobDescriptionMatchResult;
};

export type MissionGeneratorInput = {
  profile: UserProfile;
  careerIQ: CareerIQResult;
  proof: ProofScoreResult;
  roleMatches: RoleMatchResult[];
  latestJobMatch?: LatestJobMissionContext | null;
  activeTarget?: ActiveTarget | null;
  resumeContext?: ActiveTargetResumeContext | null;
  targetRole?: string | null;
  careerField?: string | null;
  sourcePath?: MissionSourcePath;
};

export function generateStructuredMissions(
  input: MissionGeneratorInput,
): Mission[] {
  const missions = [
    ...getCareerIQCapMissions(input),
    ...getSkillTruthMissions(input),
    ...getProofMissions(input),
    ...getProjectImpactMissions(input),
    ...getAtsMissions(input),
    ...getProfileFitMissions(input),
    ...getActiveTargetMissions(input),
    ...getLatestJdMissions(input),
    ...getUltimateGoalMissions(input),
  ].filter((mission) =>
    mission.sourcePath === "global" ||
      mission.sourcePath === input.sourcePath ||
      input.sourcePath === undefined
  );

  return prioritizeMissions(missions);
}

function getCareerIQCapMissions({
  careerIQ,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  return (careerIQ.capsApplied ?? []).slice(0, 4).map((cap, index) =>
    createMission({
      id: makeMissionId(["career-iq-cap", cap.id]),
      title: getCapMissionTitle(cap.id),
      category: cap.id.includes("skill")
        ? "skill_backing"
        : cap.id.includes("format") || cap.id.includes("direction")
          ? "resume"
          : "project",
      priority: 980 - index * 8,
      impact: cap.maxScore <= 55 ? "critical" : "high",
      difficulty: cap.id.includes("no-applied") ? "hard" : "medium",
      linkedScore: "Career IQ",
      linkedCapId: cap.id,
      sourcePath: sourcePath ?? "global",
      whyThisMatters: cap.reason,
      evidenceNeeded: getCapEvidenceNeeded(cap.id),
      steps: getCapSteps(cap.id),
      completionCheck:
        "Re-upload your resume. SkillMint should detect the missing evidence in the latest analysis.",
      expectedOutcome:
        "Can remove or soften a Career IQ cap after resume evidence changes and SkillMint detects it.",
      createdFrom: "career_iq_cap",
    })
  );
}

function getSkillTruthMissions({
  careerIQ,
  proof,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  const skillTruthClassifications =
    careerIQ.skillTruth?.classifications ?? [];
  const claimedOnlySkills = skillTruthClassifications
    .filter((classification) =>
      classification.supportLevel === "claimed_only" ||
        classification.supportLevel === "lightly_supported"
    )
    .map((classification) => classification.skill);
  const fallbackSkills = proof.unverifiedSkills;
  const skills = uniqueValues([...claimedOnlySkills, ...fallbackSkills])
    .slice(0, 5);

  return skills.map((skill, index) =>
    createSkillBackingMission({
      skill,
      sourcePath: sourcePath ?? "global",
      priority: 900 - index * 12,
      createdFrom: "skill_truth_gap",
    })
  );
}

function getProofMissions({
  proof,
  profile,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  const missions: Mission[] = [];

  if (
    proof.extractedProofLinks.length === 0 ||
    !profile.analysisFlags?.hasProofLink
  ) {
    missions.push(createMission({
      id: "proof:add-project-link",
      title: "Add one inspectable proof candidate",
      category: "proof",
      priority: 850,
      impact: "high",
      difficulty: "easy",
      linkedScore: "Proof Confidence",
      sourcePath: sourcePath ?? "global",
      whyThisMatters:
        "SkillMint found claims but not enough inspectable evidence candidates.",
      evidenceNeeded:
        "GitHub, live app, portfolio, case study, dashboard, report, certificate, research artifact, or demo link.",
      steps: [
        "Pick the strongest real project, report, dashboard, or certificate.",
        "Add a working link beside the matching resume bullet.",
        "Label the link clearly so the evidence candidate is easy to inspect.",
      ],
      completionCheck:
        "Re-upload your resume. SkillMint should detect at least one proof candidate link.",
      expectedOutcome:
        "Can improve Proof Confidence and proof-candidate coverage after re-analysis.",
      createdFrom: "proof_blocker",
    }));
  }

  if (proof.blockers?.[0]) {
    missions.push(createMission({
      id: makeMissionId(["proof", "blocker", proof.blockers[0]]),
      title: "Reduce the top Proof Confidence blocker",
      category: "proof",
      priority: 830,
      impact: "high",
      difficulty: "medium",
      linkedScore: "Proof Confidence",
      sourcePath: sourcePath ?? "global",
      whyThisMatters: proof.blockers[0],
      evidenceNeeded:
        "A visible project, experience bullet, proof-candidate link, or measurable outcome that supports the claim.",
      steps: [
        "Read the blocker and identify the exact claim it weakens.",
        "Add truthful project, work, certification, or artifact context.",
        "Avoid adding claims that are not backed by real evidence.",
      ],
      completionCheck:
        "Re-upload your resume and check whether Proof Confidence detects the new support.",
      expectedOutcome:
        "Can improve Proof Confidence only after the evidence appears in the resume.",
      createdFrom: "proof_blocker",
    }));
  }

  return missions;
}

function getProjectImpactMissions({
  profile,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  const missions: Mission[] = [];

  if (!profile.projects.length || profile.projectsScore < 9) {
    missions.push(createMission({
      id: "profile-fit:project:add-role-relevant-proof",
      title: "Add one role-relevant project with proof",
      category: "project",
      priority: 920,
      impact: "critical",
      difficulty: "hard",
      linkedScore: "Career IQ",
      sourcePath: sourcePath ?? "global",
      whyThisMatters:
        "Your Career IQ is capped when the resume lists skills but does not show applied evidence.",
      evidenceNeeded:
        "A project bullet with tool, action, result, and GitHub/live/demo/case-study link if available.",
      steps: [
        "Choose one role-relevant problem you can build honestly.",
        "Build a small complete workflow instead of many unfinished features.",
        "Name the stack, your implementation work, and one result or limitation.",
        "Add a proof-candidate link if one exists.",
      ],
      completionCheck:
        "Re-upload your resume. SkillMint should detect project evidence and proof context.",
      expectedOutcome:
        "Can improve Project Evidence, Skill Truth, and Proof Confidence after re-analysis.",
      createdFrom: "career_iq_cap",
    }));
  }

  if (!profile.analysisFlags?.hasMeasurableImpact) {
    missions.push(createMission({
      id: "profile-fit:impact:add-project-metric",
      title: "Add a measurable outcome to your strongest project",
      category: "impact",
      priority: 780,
      impact: "high",
      difficulty: "medium",
      linkedScore: "Career IQ",
      sourcePath: sourcePath ?? "global",
      whyThisMatters:
        "Your project shows work, but not enough result or impact.",
      evidenceNeeded:
        "A metric such as users, time saved, performance improvement, accuracy, scale, ranking, or before/after result.",
      steps: [
        "Pick the strongest truthful project.",
        "Identify one real outcome, scale, performance number, or before-after change.",
        "Add the metric to the project bullet with context.",
      ],
      completionCheck:
        "Re-upload your resume. SkillMint should detect measurable outcome language.",
      expectedOutcome:
        "Can improve Impact & Outcomes after re-analysis.",
      createdFrom: "resume_gap",
    }));
  }

  return missions;
}

function getAtsMissions({
  profile,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  if (profile.atsScore >= 3 && profile.analysisFlags?.hasSectionClarity) {
    return [];
  }

  return [
    createMission({
      id: "ats:resume:section-clarity",
      title: "Make the resume easier to scan",
      category: "ats",
      priority: 640,
      impact: "medium",
      difficulty: "easy",
      linkedScore: "ATS Readiness",
      sourcePath: sourcePath ?? "global",
      whyThisMatters:
        "ATS and recruiters need clear sections before they can find your strongest evidence.",
      evidenceNeeded:
        "Simple headings for skills, projects, experience, education, links, and certifications where relevant.",
      steps: [
        "Use standard section headings.",
        "Keep bullets short and evidence-focused.",
        "Move links close to the work they support.",
      ],
      completionCheck:
        "Re-upload your resume. SkillMint should detect stronger section clarity and ATS readiness.",
      expectedOutcome:
        "Can improve ATS Readiness after resume structure changes are detected.",
      createdFrom: "ats_gap",
    }),
  ];
}

function getProfileFitMissions({
  roleMatches,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  const topRole = roleMatches[0];

  if (!topRole || topRole.matchScore >= 70) {
    return [];
  }

  const firstGap = topRole.gaps[0] ?? "one core skill";

  return [
    createMission({
      id: makeMissionId(["profile-fit", "skill", firstGap, "backing"]),
      title: `Back the ${firstGap} profile-fit gap`,
      category: "profile_fit",
      priority: 760,
      impact: "high",
      difficulty: "medium",
      linkedScore: "Profile-fit Role Score",
      sourcePath: sourcePath ?? "profile_fit",
      evidenceTarget: firstGap,
      whyThisMatters:
        `${topRole.role} is your closest role direction, but this gap still limits profile-fit strength.`,
      evidenceNeeded:
        "A truthful project, work bullet, certification, or proof candidate that shows the missing skill in use.",
      steps: [
        `Pick one real example where ${firstGap} was used, or build a small proof project first.`,
        "Add the skill only where it is connected to real evidence.",
        "Describe what you built, configured, analyzed, or improved.",
      ],
      completionCheck:
        "Re-upload your resume. SkillMint should detect the gap skill in applied context.",
      expectedOutcome:
        "Can improve Profile-fit Role Score after the resume shows real evidence.",
      createdFrom: "profile_fit_gap",
    }),
  ];
}

function getLatestJdMissions({
  latestJobMatch,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  if (!latestJobMatch || sourcePath === "ultimate_goal") {
    return [];
  }

  const missingSkills = [
    ...latestJobMatch.result.missingSkills,
    ...latestJobMatch.result.missingKeywords,
  ].slice(0, 5);

  return uniqueValues(missingSkills).slice(0, 3).map((skill, index) =>
    createMission({
      id: makeMissionId(["latest-jd", skill, "evidence"]),
      title: `Close the ${skill} proof gap for this JD`,
      category: "jd_match",
      priority: 880 - index * 12,
      impact: "high",
      difficulty: "medium",
      linkedScore: "Latest JD Match",
      sourcePath: "latest_jd",
      evidenceTarget: skill,
      whyThisMatters:
        `This JD asks for ${skill}, but your resume does not show ${skill} usage clearly enough.`,
      evidenceNeeded:
        `Only add ${skill} if you actually used it. Otherwise, build a small proof project first.`,
      steps: [
        `Check whether you have a real ${skill} example.`,
        "If yes, connect it to a project, internship, certification, or work bullet.",
        "If not, build a small role-relevant proof project before adding it.",
      ],
      completionCheck:
        "Re-upload after adding truthful JD evidence. SkillMint should detect the skill in applied context.",
      expectedOutcome:
        "Can improve Latest JD Match only when the resume evidence changes.",
      createdFrom: "jd_match_gap",
    })
  );
}

function getActiveTargetMissions({
  activeTarget,
  resumeContext,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  if (
    !activeTarget?.jdMatch ||
    activeTarget.source !== "latest_jd" ||
    !isJdMatchCurrentForResume(activeTarget.jdMatch, resumeContext) ||
    sourcePath === "ultimate_goal" ||
    sourcePath === "profile_fit"
  ) {
    return [];
  }

  const missingSignals = uniqueValues([
    ...activeTarget.jdMatch.missingSkills,
    ...activeTarget.jdMatch.missingKeywords,
  ]).slice(0, 3);

  return missingSignals.map((skill, index) =>
    createMission({
      id: makeMissionId([
        "active-target",
        activeTarget.jdHash ?? activeTarget.id,
        skill,
        "proof",
      ]),
      title: `Back ${skill} for your Active Target`,
      category: "jd_match",
      priority: 940 - index * 10,
      impact: "high",
      difficulty: "medium",
      linkedScore: "Latest JD Match",
      sourcePath: "latest_jd",
      evidenceTarget: skill,
      whyThisMatters:
        `Your Active Target JD asks for ${skill}, but your resume does not show ${skill} usage in project, experience, certification, or proof context.`,
      evidenceNeeded:
        `Only add ${skill} if you actually used it. Otherwise, build a small proof project first.`,
      steps: [
        `Check whether you have a real ${skill} example.`,
        "If yes, connect it to a project, internship, certification, or work bullet.",
        "If not, build a small proof project before adding it to your resume.",
      ],
      completionCheck:
        `Re-upload your resume so SkillMint can check whether ${skill} evidence is now visible.`,
      expectedOutcome:
        "Can improve target-specific JD alignment only after resume evidence changes and SkillMint detects it.",
      createdFrom: "jd_match_gap",
    })
  );
}

function getUltimateGoalMissions({
  targetRole,
  roleMatches,
  sourcePath,
}: MissionGeneratorInput): Mission[] {
  if (!targetRole || sourcePath === "latest_jd") {
    return [];
  }

  const topRole = roleMatches[0];
  const targetText = targetRole.trim();
  const topRoleName = topRole?.role ?? "your closest current role";

  if (
    topRole &&
    targetText &&
    topRole.role.toLowerCase().includes(targetText.toLowerCase())
  ) {
    return [];
  }

  const targetSkill = getGoalSkillHint(targetText);

  return [
    createMission({
      id: makeMissionId(["goal", targetText, targetSkill, "proof"]),
      title: `Build proof toward ${targetText}`,
      category: "goal_alignment",
      priority: 720,
      impact: "high",
      difficulty: "hard",
      linkedScore: "Profile-fit Role Score",
      sourcePath: "ultimate_goal",
      evidenceTarget: targetSkill,
      whyThisMatters:
        `Your current resume is closer to ${topRoleName}, while your goal points toward ${targetText}.`,
      evidenceNeeded:
        `A truthful project or work example that shows ${targetSkill} in applied context.`,
      steps: [
        `Pick one ${targetText} requirement that is missing from your current evidence.`,
        `Build or document a small proof project using ${targetSkill}.`,
        "Add the evidence to your resume only after it exists.",
      ],
      completionCheck:
        "Re-upload your resume. SkillMint should detect goal-relevant evidence in applied context.",
      expectedOutcome:
        "Can make the Ultimate Goal Path more realistic after re-analysis.",
      createdFrom: "goal_gap",
    }),
  ];
}

function createSkillBackingMission({
  skill,
  sourcePath,
  priority,
  createdFrom,
}: {
  skill: string;
  sourcePath: Mission["sourcePath"];
  priority: number;
  createdFrom: Mission["createdFrom"];
}): Mission {
  return createMission({
    id: makeMissionId(["profile-fit", "skill", skill, "backing"]),
    title: `Back your ${skill} claim`,
    category: "skill_backing",
    priority,
    impact: "high",
    difficulty: "medium",
    linkedScore: "Skill Truth",
    sourcePath,
    evidenceTarget: skill,
    whyThisMatters:
      `${skill} is listed, but the resume does not show where ${skill} was used.`,
    evidenceNeeded:
      `A project, internship, certification, or bullet showing actual ${skill} usage.`,
    steps: [
      `Pick one real project or work example where ${skill} was used.`,
      "Explain what you built, configured, analyzed, or improved.",
      "Add one result, link, or reason if possible.",
    ],
    completionCheck:
      `Re-upload your resume. SkillMint should detect ${skill} in project, experience, certification, or proof context.`,
    expectedOutcome:
      "Can improve Skill Truth and Proof Confidence after re-analysis.",
    createdFrom,
  });
}

function createMission(
  mission: Omit<Mission, "status"> & { status?: Mission["status"] },
): Mission {
  const missionWithStatus: Mission = {
    ...mission,
    status: mission.status ?? "suggested",
  };

  return {
    ...missionWithStatus,
    copyText: mission.copyText ?? buildMissionCopyText(missionWithStatus),
  };
}

function buildMissionCopyText(mission: Mission): string {
  return [
    `SkillMint mission: ${mission.title}`,
    `Linked score: ${mission.linkedScore}`,
    `Why: ${mission.whyThisMatters}`,
    `Evidence needed: ${mission.evidenceNeeded}`,
    `Completion check: ${mission.completionCheck}`,
  ].join("\n");
}

function getCapMissionTitle(capId: string): string {
  if (capId.includes("unsupported")) return "Back your unsupported skill claims";
  if (capId.includes("applied") || capId.includes("project")) {
    return "Add applied evidence before chasing higher scores";
  }
  if (capId.includes("direction")) return "Clarify your career direction";
  if (capId.includes("format")) return "Turn clean formatting into real proof";

  return "Remove the top Career IQ cap";
}

function getCapEvidenceNeeded(capId: string): string {
  if (capId.includes("unsupported")) {
    return "Project, experience, certification, or education context for the most important claimed skills.";
  }

  if (capId.includes("applied") || capId.includes("project")) {
    return "At least one role-relevant project or experience bullet with tool, action, result, and proof candidate if available.";
  }

  if (capId.includes("direction")) {
    return "A focused headline, project set, and skill story that point toward the same realistic role.";
  }

  return "Resume evidence that directly addresses the cap reason.";
}

function getCapSteps(capId: string): string[] {
  if (capId.includes("unsupported")) {
    return [
      "Pick the top three claimed skills that matter for your role.",
      "Add only truthful project, experience, or certification context.",
      "Remove or deprioritize claims you cannot support yet.",
    ];
  }

  if (capId.includes("applied") || capId.includes("project")) {
    return [
      "Choose one role-relevant problem.",
      "Build or document a real project/work example.",
      "Add stack, action, result, and a proof candidate if available.",
    ];
  }

  return [
    "Read the cap reason.",
    "Add truthful evidence that addresses it.",
    "Re-upload your resume so SkillMint can re-check the signal.",
  ];
}

function getGoalSkillHint(targetRole: string): string {
  const normalizedRole = targetRole.toLowerCase();

  if (/\b(devops|cloud|aws|azure|gcp)\b/.test(normalizedRole)) return "AWS";
  if (/\b(data|analyst|analytics)\b/.test(normalizedRole)) return "SQL";
  if (/\b(ai|ml|machine learning)\b/.test(normalizedRole)) return "Python";
  if (/\b(frontend|react|ui)\b/.test(normalizedRole)) return "React";
  if (/\b(backend|api)\b/.test(normalizedRole)) return "API";

  return "one goal-critical skill";
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
