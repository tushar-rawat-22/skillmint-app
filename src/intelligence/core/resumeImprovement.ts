import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { UserProfile } from "@/intelligence/types/profile";

import { hasMeasurableImpact, hasPlaceholderText } from "./utils";

export interface ResumeImprovementItem {
  title: string;
  reason: string;
  action: string;
  priority: "High" | "Medium" | "Low";
  impact: "High" | "Medium" | "Low";
  category:
    | "Skills"
    | "Projects"
    | "Experience"
    | "ATS"
    | "Proof"
    | "Keywords"
    | "Links"
    | "Certifications";
}

export interface ResumeImprovementPlan {
  readiness: "Apply now" | "Tailor before applying" | "Improve first";
  summary: string;
  priorityFixes: ResumeImprovementItem[];
  keywordAdditions: string[];
  projectSuggestions: string[];
  proofGaps: string[];
  sectionFixes: string[];
  beforeApplyChecklist: string[];
}

type JobDomain =
  | "frontend"
  | "backend"
  | "fullStack"
  | "ai"
  | "devops"
  | "data";

export function generateResumeImprovementPlan(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
  jobDescription: string,
): ResumeImprovementPlan {
  const domains = detectJobDomains(jobDescription);
  const readiness = getReadiness(matchResult.matchScore);
  const priorityFixes = getPriorityFixes(profile, matchResult, domains);

  return {
    readiness,
    summary: getSummary(readiness, matchResult.matchScore),
    priorityFixes,
    keywordAdditions: getKeywordAdditions(matchResult),
    projectSuggestions: getProjectSuggestions(domains),
    proofGaps: getProofGaps(profile),
    sectionFixes: getSectionFixes(profile, matchResult),
    beforeApplyChecklist: getBeforeApplyChecklist(
      profile,
      matchResult,
      readiness,
    ),
  };
}

function getReadiness(
  matchScore: number,
): ResumeImprovementPlan["readiness"] {
  if (matchScore >= 75) return "Apply now";
  if (matchScore >= 55) return "Tailor before applying";

  return "Improve first";
}

function getSummary(
  readiness: ResumeImprovementPlan["readiness"],
  matchScore: number,
): string {
  if (readiness === "Apply now") {
    return `Your resume is close enough for this JD at ${matchScore}%, but it still needs keyword tailoring before submission.`;
  }

  if (readiness === "Tailor before applying") {
    return `Your resume has partial overlap at ${matchScore}%. Apply only after tightening keywords, proof, and project bullets.`;
  }

  return `Your resume is not ready for this JD yet at ${matchScore}% because several required proof signals are missing.`;
}

function getPriorityFixes(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
  domains: JobDomain[],
): ResumeImprovementItem[] {
  const fixes: ResumeImprovementItem[] = [];

  if (hasPlaceholderText(profile)) {
    fixes.push({
      title: "Re-analyze a readable resume",
      reason:
        "The extracted resume text looks incomplete, so SkillMint cannot judge the JD match confidently.",
      action:
        "Upload a text-readable PDF, DOCX, or TXT resume before trusting this match.",
      priority: "High",
      impact: "High",
      category: "ATS",
    });
  }

  if (matchResult.missingSkills.length) {
    fixes.push({
      title: "Close missing JD-critical skills",
      reason: `This JD asks for ${formatInlineList(
        matchResult.missingSkills.slice(0, 5),
      )}, but those skills are not detected in your profile.`,
      action:
        "Do not add them falsely. Learn the missing skill or build a project that proves it, then mention it truthfully.",
      priority: matchResult.matchScore < 55 ? "High" : "Medium",
      impact: "High",
      category: "Skills",
    });
  }

  if (profile.projectsScore < 9 || !profile.projects.length) {
    fixes.push({
      title: "Strengthen project proof",
      reason:
        "Recruiters need projects that prove the required stack, not just generic project names.",
      action:
        "Add project bullets with problem, tech stack, your role, database/API/deployment details, and measurable outcome.",
      priority: "High",
      impact: "High",
      category: "Projects",
    });
  }

  if (domains.length && !hasDomainProjectProof(profile, domains)) {
    fixes.push({
      title: "Add role-specific project evidence",
      reason:
        "Your projects do not clearly prove the main domain this JD is hiring for.",
      action:
        "Build or rewrite one project so it directly proves the target role requirements instead of listing broad skills.",
      priority: matchResult.matchScore < 75 ? "High" : "Medium",
      impact: "High",
      category: "Projects",
    });
  }

  if (!profile.github) {
    fixes.push({
      title: "Add GitHub or live project links",
      reason:
        "Without public proof, recruiters have to trust claims instead of seeing work.",
      action:
        "Add GitHub repositories and live links for your strongest projects. Keep repos readable with a clean README.",
      priority: matchResult.matchScore < 75 ? "High" : "Medium",
      impact: "High",
      category: "Links",
    });
  }

  if (!hasMeasurableImpact(profile)) {
    fixes.push({
      title: "Quantify project and work outcomes",
      reason:
        "The resume does not show enough numbers, scale, performance, accuracy, users, or before-after impact.",
      action:
        "Rewrite bullets with truthful metrics such as users, latency, accuracy, automation time saved, cost reduced, or performance improved.",
      priority: "Medium",
      impact: "High",
      category: "Proof",
    });
  }

  if (!profile.experience.length || profile.experienceScore < 5) {
    fixes.push({
      title: "Clarify real experience signals",
      reason:
        "Experience or internship proof is weak, so the resume will compete mostly on projects.",
      action:
        "Add internships, freelance work, campus roles, or open-source work only if real. Otherwise make projects stronger.",
      priority: matchResult.matchScore < 55 ? "High" : "Medium",
      impact: "Medium",
      category: "Experience",
    });
  }

  if (!profile.analysisFlags?.hasSectionClarity || profile.atsScore <= 2) {
    fixes.push({
      title: "Improve ATS section clarity",
      reason:
        "ATS readiness depends on clear sections for skills, projects, education, experience, certifications, and links.",
      action:
        "Use simple section headings and avoid burying important keywords in dense paragraphs.",
      priority: "Medium",
      impact: "Medium",
      category: "ATS",
    });
  }

  if (
    domains.length &&
    !profile.certifications.length &&
    matchResult.matchScore >= 55
  ) {
    fixes.push({
      title: "Use certifications only as supporting proof",
      reason:
        "A relevant certificate can help, but it will not replace projects or experience.",
      action:
        "Add a role-relevant certification only if completed and useful. Do not pad the resume with generic courses.",
      priority: "Low",
      impact: "Low",
      category: "Certifications",
    });
  }

  return fixes.slice(0, 8);
}

function getKeywordAdditions(
  matchResult: JobDescriptionMatchResult,
): string[] {
  return uniqueValues([
    ...matchResult.missingKeywords,
    ...matchResult.missingSkills,
  ])
    .slice(0, 10)
    .map(
      (keyword) =>
        `${keyword}: Add this only if you can support it with project or experience proof.`,
    );
}

function getProjectSuggestions(domains: JobDomain[]): string[] {
  const suggestions: string[] = [];

  if (domains.includes("fullStack")) {
    suggestions.push(
      "Build a full-stack app with frontend, backend, database, authentication, deployment, and a clear README.",
    );
  }

  if (domains.includes("frontend")) {
    suggestions.push(
      "Build and deploy a React or Next.js project with responsive UI, auth state, API integration, and measurable UX detail.",
    );
  }

  if (domains.includes("backend")) {
    suggestions.push(
      "Build a REST API with database models, authentication, validation, error handling, tests, and deployment.",
    );
  }

  if (domains.includes("ai")) {
    suggestions.push(
      "Build an ML or LLM project with dataset/source, model choice, evaluation metric, failure cases, and deployment or demo link.",
    );
  }

  if (domains.includes("devops")) {
    suggestions.push(
      "Deploy an app using Docker, cloud hosting, environment variables, CI/CD, logs, and a deployment diagram.",
    );
  }

  if (domains.includes("data")) {
    suggestions.push(
      "Build an ETL, dashboard, or data pipeline project with source data, cleaning steps, SQL/Python logic, and business insight.",
    );
  }

  if (!suggestions.length) {
    suggestions.push(
      "Add one role-specific project that proves the top JD requirements with stack, scope, links, and measurable outcome.",
    );
  }

  return suggestions.slice(0, 4);
}

function getProofGaps(profile: UserProfile): string[] {
  const gaps: string[] = [];

  if (!profile.github) {
    gaps.push("No GitHub link detected.");
  }

  if (!hasDeployedProjectLink(profile)) {
    gaps.push("No deployed project link detected.");
  }

  if (!hasMeasurableImpact(profile)) {
    gaps.push("No measurable impact detected.");
  }

  if (!profile.experience.length) {
    gaps.push("No internship or experience signal detected.");
  }

  if (!profile.codingProfiles.length) {
    gaps.push("No coding profile detected.");
  }

  if (!profile.linkedin) {
    gaps.push("No LinkedIn profile detected.");
  }

  return gaps;
}

function getSectionFixes(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
): string[] {
  const fixes: string[] = [];

  if (matchResult.missingSkills.length) {
    fixes.push(
      "Skills section needs JD-specific grouping. Add only skills you can defend with project or experience proof.",
    );
  }

  if (profile.projectsScore < 12 || !profile.projects.length) {
    fixes.push(
      "Projects need stronger bullet points with stack, scope, your contribution, links, and outcome.",
    );
  }

  if (!profile.experience.length || profile.experienceScore < 5) {
    fixes.push(
      "Experience section is weak or missing. Add real internships, freelance work, open-source work, or campus technical responsibility if applicable.",
    );
  }

  if (!profile.certifications.length || matchResult.matchScore < 75) {
    fixes.push(
      "Certifications are not strong enough for this role unless they support the required stack.",
    );
  }

  if (!hasMeasurableImpact(profile)) {
    fixes.push("Resume needs quantified impact in project or work bullets.");
  }

  if (!profile.analysisFlags?.hasSectionClarity) {
    fixes.push(
      "Use clear section headings: Skills, Projects, Experience, Education, Certifications, and Links.",
    );
  }

  return fixes.slice(0, 6);
}

function getBeforeApplyChecklist(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult,
  readiness: ResumeImprovementPlan["readiness"],
): string[] {
  const checklist = [
    "Tailor the resume title or summary to the target role.",
    "Add missing truthful JD keywords where your work actually proves them.",
    "Ensure projects prove the required stack, not just generic coding ability.",
    "Add GitHub, live project, LinkedIn, or coding profile links where available.",
    "Quantify impact with numbers, scale, performance, accuracy, or time saved.",
    "Remove irrelevant buzzwords that are not backed by evidence.",
    "Re-run the ATS match after editing.",
  ];

  if (readiness === "Improve first") {
    checklist.unshift(
      "Do not apply yet unless you can quickly add missing proof for this JD.",
    );
  }

  if (!profile.github && !profile.codingProfiles.length) {
    checklist.push("Add at least one public proof link before applying.");
  }

  if (matchResult.matchScore >= 75) {
    checklist.push("Apply after tailoring the top keywords and strongest project bullets.");
  }

  return uniqueValues(checklist).slice(0, 8);
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

function hasDomainProjectProof(
  profile: UserProfile,
  domains: JobDomain[],
): boolean {
  const projectText = profile.projects.join(" ").toLowerCase();

  return domains.some((domain) => {
    if (domain === "frontend") {
      return /\b(?:react|next\.?js|angular|vue|tailwind|responsive|ui)\b/i.test(
        projectText,
      );
    }

    if (domain === "backend") {
      return /\b(?:api|database|mongodb|mysql|postgres|auth|server|express|node\.?js)\b/i.test(
        projectText,
      );
    }

    if (domain === "fullStack") {
      return /\b(?:frontend|react|next\.?js|ui)\b/i.test(projectText) &&
        /\b(?:backend|api|database|auth|server)\b/i.test(projectText);
    }

    if (domain === "ai") {
      return /\b(?:machine learning|ml|llm|rag|model|dataset|accuracy|tensorflow|pytorch)\b/i.test(
        projectText,
      );
    }

    if (domain === "devops") {
      return /\b(?:docker|kubernetes|aws|azure|gcp|ci\/cd|deployment|linux|cloud)\b/i.test(
        projectText,
      );
    }

    return /\b(?:etl|pipeline|dashboard|analytics|sql|pandas|data)\b/i.test(
      projectText,
    );
  });
}

function hasDeployedProjectLink(profile: UserProfile): boolean {
  const projectText = profile.projects.join(" ");

  return Boolean(profile.analysisFlags?.hasProofLink) ||
    /\b(?:https?:\/\/|vercel\.app|netlify\.app|render\.com|github\.io|firebaseapp\.com)\b/i.test(
      projectText,
    );
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
