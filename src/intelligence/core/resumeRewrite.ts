import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type { UserProfile } from "@/intelligence/types/profile";
import { calculateRoleMatches } from "@/intelligence/core/roleMatch";

export interface ResumeRewriteSuggestion {
  section:
    | "Summary"
    | "Skills"
    | "Projects"
    | "Experience"
    | "Certifications"
    | "Links";
  title: string;
  weakExample: string;
  improvedExample: string;
  whyBetter: string;
  evidenceNeeded: string[];
  caution: string;
}

export interface ResumeRewritePlan {
  headline: string;
  summaryRewrite: ResumeRewriteSuggestion;
  skillsRewrite: ResumeRewriteSuggestion;
  projectRewrites: ResumeRewriteSuggestion[];
  experienceRewrites: ResumeRewriteSuggestion[];
  finalWarnings: string[];
}

type SkillGroup =
  | "Frontend"
  | "Backend"
  | "Databases"
  | "Cloud/DevOps"
  | "AI/Data"
  | "Languages"
  | "Tools";

type JobDomain =
  | "frontend"
  | "backend"
  | "fullStack"
  | "ai"
  | "devops"
  | "data";

const SKILL_GROUP_PATTERNS: Record<SkillGroup, RegExp> = {
  Frontend:
    /\b(?:react|next\.?js|angular|vue|html|css|tailwind|redux|figma|typescript|javascript)\b/i,
  Backend:
    /\b(?:node\.?js|express|spring boot|django|flask|rest api|apis?|graphql|microservices|authentication)\b/i,
  Databases:
    /\b(?:mongodb|mysql|postgresql|postgres|sql|redis|firebase|supabase)\b/i,
  "Cloud/DevOps":
    /\b(?:aws|azure|gcp|docker|kubernetes|linux|ci\/cd|terraform|jenkins|nginx|deployment)\b/i,
  "AI/Data":
    /\b(?:machine learning|deep learning|tensorflow|pytorch|pandas|numpy|scikit|llm|rag|langchain|vector database|power bi|tableau)\b/i,
  Languages: /\b(?:javascript|typescript|python|java|c\+\+|c|sql|html|css)\b/i,
  Tools: /\b(?:git|github|testing|agile|system design|communication|problem solving)\b/i,
};

const LEADING_ACTION_VERB_PATTERN =
  /^(?:built|used|developed|created|designed|implemented|led|improved|deployed|integrated|automated|optimized|presented)\b\s*/i;

export interface ResumeRewriteContext {
  jobTitle?: string | null;
  companyName?: string | null;
  setupTargetRole?: string | null;
  profileFitRole?: string | null;
}

export function generateResumeRewritePlan(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
  improvementPlan: ResumeImprovementPlan,
  jobDescription: string,
  context: ResumeRewriteContext = {},
): ResumeRewritePlan {
  const domains = detectJobDomains(jobDescription);
  const roleLabel = getRoleLabel(profile, context);
  const presentSkills = uniqueValues([
    ...matchResult.matchedSkills,
    ...profile.skills,
  ]).slice(0, 10);

  return {
    headline: getHeadline(matchResult.matchScore, roleLabel),
    summaryRewrite: getSummaryRewrite(
      profile,
      matchResult,
      improvementPlan,
      roleLabel,
      presentSkills,
    ),
    skillsRewrite: getSkillsRewrite(profile, matchResult),
    projectRewrites: getProjectRewrites(
      profile,
      matchResult,
      domains,
      presentSkills,
    ),
    experienceRewrites: getExperienceRewrites(profile, presentSkills),
    finalWarnings: getFinalWarnings(profile, matchResult),
  };
}

function getHeadline(matchScore: number, roleLabel: string): string {
  if (matchScore >= 75) {
    return `Rewrite your resume for ${roleLabel}, then apply.`;
  }

  if (matchScore >= 55) {
    return `Tailor your resume hard before applying for ${roleLabel}.`;
  }

  return `Build more proof before using this resume for ${roleLabel}.`;
}

function getSummaryRewrite(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
  improvementPlan: ResumeImprovementPlan,
  roleLabel: string,
  presentSkills: string[],
): ResumeRewriteSuggestion {
  const candidateLabel = getCandidateLabel(profile);
  const skillsText = formatInlineList(presentSkills.slice(0, 6));
  const weakReadiness = improvementPlan.readiness === "Improve first";
  const skillPhrase = skillsText
    ? `with hands-on work using ${skillsText}`
    : "building practical technical proof through projects";
  const directionPhrase = weakReadiness
    ? `building toward ${roleLabel}`
    : `focused on ${roleLabel}`;

  return {
    section: "Summary",
    title: "Make the summary role-specific without overstating readiness",
    weakExample: "Computer Science student looking for an internship.",
    improvedExample:
      `${candidateLabel} ${directionPhrase} ${skillPhrase}. ` +
      "Currently improving JD-specific proof through project-based work, clearer links, and measurable outcomes.",
    whyBetter:
      "It names the target direction, uses skills actually detected in the profile, and avoids pretending missing skills already exist.",
    evidenceNeeded: [
      "Projects or experience proving the named skills",
      "GitHub or live links for the strongest work",
      "Truthful metrics for impact, scale, speed, accuracy, or users",
    ],
    caution:
      "Only use this if true. If a skill is missing from your profile, learn it or build proof before adding it.",
  };
}

function getSkillsRewrite(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
): ResumeRewriteSuggestion {
  const groupedSkills = getGroupedSkills(profile.skills);
  const groupedText = Object.entries(groupedSkills)
    .filter(([, skills]) => skills.length)
    .map(([group, skills]) => `${group}: ${skills.join(", ")}`)
    .join("\n");
  const missingNote = matchResult.missingSkills.length
    ? `\nMissing JD skills to learn or prove before adding: ${formatInlineList(
        matchResult.missingSkills.slice(0, 6),
      )}.`
    : "";

  return {
    section: "Skills",
    title: "Group skills so ATS and recruiters can scan them fast",
    weakExample: "Skills: React, coding, teamwork, hard working, MS Office.",
    improvedExample:
      (groupedText || "Skills: Add only technical skills you can prove.") +
      missingNote,
    whyBetter:
      "Grouped skills are easier to scan and reduce the buzzword feel. Missing JD skills are clearly separated from proven skills.",
    evidenceNeeded: [
      "Project bullets using each listed technical skill",
      "GitHub commits or README sections showing the stack",
      "Experience, certificate, or coursework proof where applicable",
    ],
    caution:
      "Do not add missing JD skills to the main skills list unless you can prove them in projects, experience, or coursework.",
  };
}

function getProjectRewrites(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
  domains: JobDomain[],
  presentSkills: string[],
): ResumeRewriteSuggestion[] {
  if (!profile.projects.length) {
    return [
      {
        section: "Projects",
        title: "Add a project before claiming this JD fit",
        weakExample: "No relevant project listed.",
        improvedExample:
          `After building proof: Built a ${getProjectType(domains)} using ${formatInlineList(
            presentSkills.slice(0, 5),
          ) || "[truthful stack]"}, including [feature you actually built], [N API endpoints/screens], and [GitHub/live link].`,
        whyBetter:
          "It gives recruiters concrete project evidence instead of an unsupported skill list.",
        evidenceNeeded: [
          "GitHub repository",
          "Live deployment or demo screenshots",
          "README with setup steps and architecture",
          "Truthful scope such as [N API endpoints] or [X screens]",
        ],
        caution:
          "Do not add this until the project exists. Replace every placeholder with truthful evidence.",
      },
    ];
  }

  return profile.projects.slice(0, 3).map((project, index) => {
    const projectName = cleanProjectName(project, index);
    const projectSubject = cleanProjectSubject(projectName);
    const stack = formatInlineList(presentSkills.slice(0, 5)) ||
      "[truthful tech stack]";

    return {
      section: "Projects",
      title: `Rewrite project bullet: ${projectName}`,
      weakExample: `${projectName}: Project using ${presentSkills[0] ?? "technology"}.`,
      improvedExample:
        `Improved ${projectSubject} using ${stack} by implementing [feature you actually implemented], ` +
        "[technical detail if true], and [measurable outcome], with proof via [GitHub/demo/README].",
      whyBetter:
        "It turns a project name into proof: stack, feature, implementation detail, user value, and measurable placeholder.",
      evidenceNeeded: [
        "GitHub link",
        "Live deployment or screenshots",
        "README explaining your contribution",
        "API endpoints, database schema, or UI flows",
        "A truthful metric such as [X users], [Y% faster], or [Z seconds]",
      ],
      caution:
        "Only use this if true. Do not claim deployment, authentication, API work, or metrics unless implemented and verifiable.",
    };
  });
}

function getExperienceRewrites(
  profile: UserProfile,
  presentSkills: string[],
): ResumeRewriteSuggestion[] {
  if (!profile.experience.length) {
    return [
      {
        section: "Experience",
        title: "Do not fake experience",
        weakExample: "Experience: Fresher.",
        improvedExample:
          "If you have no internship or work experience, skip fake experience and strengthen Projects with stack, links, scope, and measurable outcomes.",
        whyBetter:
          "A strong project section is safer than invented experience. Recruiters can verify internships and companies.",
        evidenceNeeded: [
          "Real internship, freelance, open-source, or campus technical responsibility",
          "Offer letter, certificate, public contribution, or project link where applicable",
        ],
        caution:
          "Do not fabricate internships, companies, clients, titles, or results.",
      },
    ];
  }

  return profile.experience.slice(0, 2).map((experience, index) => {
    const label = cleanExperienceName(experience, index);
    const stack = formatInlineList(presentSkills.slice(0, 4)) ||
      "[truthful tools/stack]";

    return {
      section: "Experience",
      title: `Rewrite experience bullet: ${label}`,
      weakExample: `${label}: Worked on development tasks.`,
      improvedExample:
        `Contributed to ${label} using ${stack}, owning [specific task], collaborating with [team/stakeholder if true], and improving [metric/outcome] by [truthful value].`,
      whyBetter:
        "It clarifies ownership, tools used, collaboration, and measurable result without inventing the company or title.",
      evidenceNeeded: [
        "Real role or internship proof",
        "Specific task you owned",
        "Code, document, demo, or manager-visible output",
        "Truthful metric or before-after detail",
      ],
      caution:
        "Replace placeholders with real facts. Do not claim ownership or impact you cannot defend.",
    };
  });
}

function getFinalWarnings(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
): string[] {
  const warnings = [
    "Only use rewrite templates if the statement is true.",
    "Replace placeholders like [X users], [Y% faster], and [N API endpoints] with real values or remove them.",
    "Recruiters can verify GitHub, live links, internships, and project claims.",
    "Do not claim missing JD skills until you have built or learned them.",
  ];

  if (!profile.github) {
    warnings.push("Add GitHub proof before making strong project claims.");
  }

  if (!profile.linkedin) {
    warnings.push("Add LinkedIn if you want recruiters to trust the profile context faster.");
  }

  if (matchResult.matchScore < 55) {
    warnings.push("This resume is not ready for the JD yet. Build proof before applying broadly.");
  }

  return uniqueValues(warnings).slice(0, 7);
}

function getGroupedSkills(skills: string[]): Record<SkillGroup, string[]> {
  const groupedSkills: Record<SkillGroup, string[]> = {
    Frontend: [],
    Backend: [],
    Databases: [],
    "Cloud/DevOps": [],
    "AI/Data": [],
    Languages: [],
    Tools: [],
  };

  skills.forEach((skill) => {
    const firstGroup = (Object.keys(SKILL_GROUP_PATTERNS) as SkillGroup[])
      .find((group) => SKILL_GROUP_PATTERNS[group].test(skill));

    if (firstGroup) {
      groupedSkills[firstGroup].push(skill);
    }
  });

  return Object.fromEntries(
    Object.entries(groupedSkills).map(([group, groupSkills]) => [
      group,
      uniqueValues(groupSkills),
    ]),
  ) as Record<SkillGroup, string[]>;
}

function getCandidateLabel(profile: UserProfile): string {
  if (/\b(?:computer science|cse|b\.?tech|btech|bachelor|engineering)\b/i.test(
    profile.education,
  )) {
    return "Computer Science student";
  }

  if (profile.education) {
    return "Student";
  }

  return "Candidate";
}

function detectJobDomains(jobDescription: string): JobDomain[] {
  const text = jobDescription.toLowerCase();
  const domains: JobDomain[] = [];
  const frontend =
    /\b(?:front[-\s]?end|react|next\.?js|angular|vue|tailwind|redux|figma|ui|responsive)\b/i.test(
      text,
    );
  const backend =
    /\b(?:back[-\s]?end|node\.?js|express|spring boot|django|flask|rest|api|graphql|database|mongodb|mysql|postgres|redis|microservices)\b/i.test(
      text,
    );

  if (/\bfull[-\s]?stack\b/i.test(text) || (frontend && backend)) {
    domains.push("fullStack");
  }

  if (frontend) domains.push("frontend");
  if (backend) domains.push("backend");

  if (
    /\b(?:ai|ml|machine learning|deep learning|llm|rag|langchain|tensorflow|pytorch|model|data science)\b/i.test(
      text,
    )
  ) {
    domains.push("ai");
  }

  if (
    /\b(?:devops|cloud|aws|azure|gcp|docker|kubernetes|linux|ci\/cd|terraform|jenkins|nginx|deployment)\b/i.test(
      text,
    )
  ) {
    domains.push("devops");
  }

  if (
    /\b(?:data engineer|etl|pipeline|analytics|dashboard|pandas|numpy|sql|tableau|power bi|warehouse)\b/i.test(
      text,
    )
  ) {
    domains.push("data");
  }

  return uniqueValues(domains);
}

function getRoleLabel(
  profile: UserProfile,
  context: ResumeRewriteContext,
): string {
  const jobTitle = getUsableLabel(context.jobTitle, ["untitled role"]);
  const companyName = getUsableLabel(context.companyName, ["unknown company"]);

  if (jobTitle && companyName) {
    return `${formatRoleLabel(jobTitle)} at ${formatRoleLabel(companyName)}`;
  }

  if (jobTitle) {
    return formatRoleLabel(jobTitle);
  }

  const setupTargetRole = getUsableLabel(context.setupTargetRole);

  if (setupTargetRole) {
    return formatRoleLabel(setupTargetRole);
  }

  const profileFitRole = getUsableLabel(context.profileFitRole) ??
    calculateRoleMatches(profile)[0]?.role;

  if (profileFitRole) {
    return formatRoleLabel(profileFitRole);
  }

  return "target role";
}

function getUsableLabel(
  value: string | null | undefined,
  blockedLabels: string[] = [],
): string | null {
  const normalizedValue = value?.trim().replace(/\s+/g, " ") ?? "";

  if (!normalizedValue) {
    return null;
  }

  const lowerValue = normalizedValue.toLowerCase();

  if (blockedLabels.includes(lowerValue)) {
    return null;
  }

  return normalizedValue;
}

function formatRoleLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(ai|ml|sql|llm|jd|api|ui|ux|dsa)\b/gi, (match) =>
      match.toUpperCase()
    )
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\b(At|For|Of|And|Or|In|To|With)\b/g, (match) =>
      match.toLowerCase()
    );
}

function getProjectType(domains: JobDomain[]): string {
  if (domains.includes("fullStack")) return "full-stack application";
  if (domains.includes("frontend")) return "frontend application";
  if (domains.includes("backend")) return "backend API service";
  if (domains.includes("ai")) return "ML or LLM project";
  if (domains.includes("devops")) return "cloud deployment project";
  if (domains.includes("data")) return "data pipeline or dashboard";

  return "role-specific project";
}

function cleanProjectName(project: string, index: number): string {
  const cleanedProject = project
    .replace(/^[-*\u2022\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedProject) {
    return `Project ${index + 1}`;
  }

  if (cleanedProject.length <= 64) {
    return cleanedProject;
  }

  return `${cleanedProject.slice(0, 61).trim()}...`;
}

function cleanProjectSubject(projectName: string): string {
  const withoutLeadingVerb = projectName
    .replace(LEADING_ACTION_VERB_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  const withoutArticle = withoutLeadingVerb
    .replace(/^(?:a|an|the)\s+/i, "")
    .trim();

  if (!withoutArticle) {
    return "the project";
  }

  return `the ${withoutArticle}`;
}

function cleanExperienceName(experience: string, index: number): string {
  const cleanedExperience = experience
    .replace(/^[-*\u2022\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedExperience) {
    return `Experience ${index + 1}`;
  }

  if (cleanedExperience.length <= 64) {
    return cleanedExperience;
  }

  return `${cleanedExperience.slice(0, 61).trim()}...`;
}

function uniqueValues<T extends string>(values: T[]): T[] {
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

function formatInlineList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}
