import type { UserProfile } from "@/intelligence/types/profile";

import { calculateCodingProfileScore } from "./coding";
import {
  clamp,
  hasMeasurableImpact,
  hasPlaceholderText,
  roundScore,
  scaleScore,
} from "./utils";

export interface JobDescriptionMatchResult {
  matchScore: number;
  verdict: string;
  brutalReality: string;
  matchedSkills: string[];
  missingSkills: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

type SkillCategory =
  | "language"
  | "frontend"
  | "backend"
  | "database"
  | "devops"
  | "dataAi"
  | "general";

type SkillDefinition = {
  name: string;
  categories: SkillCategory[];
  patterns: RegExp[];
};

const MIN_JOB_DESCRIPTION_LENGTH = 80;

const SKILL_DEFINITIONS: SkillDefinition[] = [
  skill("JavaScript", ["language"], [/\bjavascript\b/i, /\bjs\b/i]),
  skill("TypeScript", ["language"], [/\btypescript\b/i, /\bts\b/i]),
  skill("Python", ["language"], [/\bpython\b/i]),
  skill("Java", ["language"], [/\bjava\b/i]),
  skill("C++", ["language"], [
    /(?:^|[^a-z0-9+#.])c\+\+(?:[^a-z0-9+#.]|$)/i,
  ]),
  skill("C", ["language"], [
    /(?:^|[^a-z0-9+#.])c(?:[^a-z0-9+#.]|$)/i,
  ]),
  skill("SQL", ["language", "database"], [/\bsql\b/i]),
  skill("HTML", ["language", "frontend"], [/\bhtml\b/i]),
  skill("CSS", ["language", "frontend"], [/\bcss\b/i]),
  skill("React", ["frontend"], [/\breact(?:\.js|js)?\b/i]),
  skill("Next.js", ["frontend"], [/\bnext\.?js\b/i]),
  skill("Angular", ["frontend"], [/\bangular\b/i]),
  skill("Vue", ["frontend"], [/\bvue(?:\.js|js)?\b/i]),
  skill("Tailwind CSS", ["frontend"], [/\btailwind(?:\s+css)?\b/i]),
  skill("Redux", ["frontend"], [/\bredux\b/i]),
  skill("Figma", ["frontend"], [/\bfigma\b/i]),
  skill("Node.js", ["backend"], [/\bnode\.?js\b/i]),
  skill("Express", ["backend"], [/\bexpress(?:\.js|js)?\b/i]),
  skill("Spring Boot", ["backend"], [/\bspring\s+boot\b/i]),
  skill("Django", ["backend"], [/\bdjango\b/i]),
  skill("Flask", ["backend"], [/\bflask\b/i]),
  skill("REST API", ["backend", "general"], [
    /\brest(?:ful)?\s+apis?\b/i,
  ]),
  skill("GraphQL", ["backend"], [/\bgraphql\b/i]),
  skill("Microservices", ["backend"], [/\bmicroservices?\b/i]),
  skill("MongoDB", ["database"], [/\bmongodb\b/i, /\bmongo\s+db\b/i]),
  skill("MySQL", ["database"], [/\bmysql\b/i]),
  skill("PostgreSQL", ["database"], [/\bpostgres(?:ql)?\b/i]),
  skill("Redis", ["database"], [/\bredis\b/i]),
  skill("Firebase", ["database"], [/\bfirebase\b/i]),
  skill("Supabase", ["database"], [/\bsupabase\b/i]),
  skill("AWS", ["devops"], [/\baws\b/i, /\bamazon\s+web\s+services\b/i]),
  skill("Azure", ["devops"], [/\bazure\b/i]),
  skill("GCP", ["devops"], [
    /\bgcp\b/i,
    /\bgoogle\s+cloud(?:\s+platform)?\b/i,
  ]),
  skill("Docker", ["devops"], [/\bdocker\b/i]),
  skill("Kubernetes", ["devops"], [/\bkubernetes\b/i, /\bk8s\b/i]),
  skill("Linux", ["devops"], [/\blinux\b/i]),
  skill("CI/CD", ["devops"], [/\bci\/cd\b/i, /\bci\s+cd\b/i]),
  skill("Terraform", ["devops"], [/\bterraform\b/i]),
  skill("Jenkins", ["devops"], [/\bjenkins\b/i]),
  skill("Nginx", ["devops"], [/\bnginx\b/i]),
  skill("Machine Learning", ["dataAi"], [
    /\bmachine\s+learning\b/i,
    /\bml\b/i,
  ]),
  skill("Deep Learning", ["dataAi"], [/\bdeep\s+learning\b/i]),
  skill("TensorFlow", ["dataAi"], [/\btensorflow\b/i]),
  skill("PyTorch", ["dataAi"], [/\bpytorch\b/i]),
  skill("Pandas", ["dataAi"], [/\bpandas\b/i]),
  skill("NumPy", ["dataAi"], [/\bnumpy\b/i]),
  skill("Scikit-learn", ["dataAi"], [
    /\bscikit[-\s]?learn\b/i,
    /\bsklearn\b/i,
  ]),
  skill("LLM", ["dataAi"], [/\bllms?\b/i, /\blarge\s+language\s+models?\b/i]),
  skill("RAG", ["dataAi"], [
    /\brag\b/i,
    /\bretrieval[-\s]+augmented\s+generation\b/i,
  ]),
  skill("LangChain", ["dataAi"], [/\blangchain\b/i]),
  skill("Vector Database", ["dataAi"], [
    /\bvector\s+databases?\b/i,
    /\bvector\s+db\b/i,
  ]),
  skill("Git", ["general"], [/\bgit\b/i]),
  skill("GitHub", ["general"], [/\bgithub\b/i]),
  skill("Testing", ["general"], [
    /\btesting\b/i,
    /\bunit\s+tests?\b/i,
    /\bintegration\s+tests?\b/i,
  ]),
  skill("Authentication", ["general", "backend"], [/\bauth(?:entication)?\b/i]),
  skill("APIs", ["general", "backend"], [/\bapis?\b/i]),
  skill("Agile", ["general"], [/\bagile\b/i, /\bscrum\b/i]),
  skill("System Design", ["general", "backend"], [/\bsystem\s+design\b/i]),
  skill("Communication", ["general"], [/\bcommunication\b/i]),
  skill("Problem Solving", ["general"], [
    /\bproblem[-\s]+solving\b/i,
    /\bdsa\b/i,
  ]),
];

const IMPORTANT_KEYWORD_PATTERNS: Array<[string, RegExp]> = [
  ["frontend", /\bfront[-\s]?end\b/i],
  ["backend", /\bback[-\s]?end\b/i],
  ["full stack", /\bfull[-\s]?stack\b/i],
  ["deployment", /\bdeploy(?:ed|ment)?\b/i],
  ["database", /\bdatabases?\b/i],
  ["authentication", /\bauth(?:entication)?\b/i],
  ["testing", /\btest(?:ing|s)?\b/i],
  ["automation", /\bautomation\b/i],
  ["dashboard", /\bdashboards?\b/i],
  ["analytics", /\banalytics?\b/i],
  ["performance", /\bperformance\b/i],
  ["scalability", /\bscalab(?:le|ility)\b/i],
  ["security", /\bsecurity\b/i],
  ["internship", /\bintern(?:ship)?\b/i],
  ["production", /\bproduction\b/i],
  ["agile", /\bagile\b/i],
  ["system design", /\bsystem\s+design\b/i],
  ["unit testing", /\bunit\s+tests?\b/i],
  ["cloud", /\bcloud\b/i],
  ["devops", /\bdevops\b/i],
  ["open source", /\bopen[-\s]+source\b/i],
];

export function analyzeJobDescriptionMatch(
  resumeProfile: UserProfile,
  jobDescription: string,
): JobDescriptionMatchResult {
  const normalizedJobDescription = jobDescription.trim();

  if (normalizedJobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return {
      matchScore: 0,
      verdict: "Paste a fuller job description",
      brutalReality:
        "SkillMint needs a real JD with responsibilities and skills before it can judge fit.",
      matchedSkills: [],
      missingSkills: [],
      missingKeywords: [],
      strengths: [],
      weaknesses: ["Job description is too short to evaluate honestly."],
      recommendations: [
        "Paste the complete job description, including required skills and responsibilities.",
      ],
    };
  }

  const jobSkills = extractSkillsFromText(normalizedJobDescription);
  const resumeSkillKeys = getResumeSkillKeys(resumeProfile);
  const matchedSkillDefinitions = jobSkills.filter((skillDefinition) =>
    resumeSkillKeys.has(getSkillKey(skillDefinition.name)),
  );
  const matchedSkills = matchedSkillDefinitions.map(
    (skillDefinition) => skillDefinition.name,
  );
  const missingSkills = jobSkills
    .filter(
      (skillDefinition) =>
        !resumeSkillKeys.has(getSkillKey(skillDefinition.name)),
    )
    .map((skillDefinition) => skillDefinition.name);

  const projectText = resumeProfile.projects.join(" ");
  const experienceText = resumeProfile.experience.join(" ");
  const certificationText = resumeProfile.certifications
    .map((certification) => `${certification.name} ${certification.issuer}`)
    .join(" ");
  const resumeEvidenceText = [
    resumeProfile.skills.join(" "),
    projectText,
    experienceText,
    resumeProfile.education,
    certificationText,
  ].join(" ");

  const skillOverlapRatio = jobSkills.length
    ? matchedSkillDefinitions.length / jobSkills.length
    : 0;
  const projectSkillOverlapRatio = getEvidenceSkillOverlapRatio(
    jobSkills,
    projectText,
  );
  const experienceSkillOverlapRatio = getEvidenceSkillOverlapRatio(
    jobSkills,
    experienceText,
  );
  const importantKeywords = extractImportantKeywords(
    normalizedJobDescription,
    jobSkills,
  );
  const keywordPresenceRatio = importantKeywords.length
    ? importantKeywords.filter((keyword) =>
        hasTermInEvidence(keyword, resumeEvidenceText, resumeSkillKeys),
      ).length / importantKeywords.length
    : 0;
  const codingScore = calculateCodingProfileScore(
    resumeProfile.codingProfiles,
  );
  const strongProjectProof =
    resumeProfile.projectsScore >= 12 ||
    (resumeProfile.projects.length >= 2 && projectSkillOverlapRatio >= 0.35) ||
    hasMeasurableImpact(resumeProfile);

  let score =
    skillOverlapRatio * 45 +
    getProjectProofScore(
      resumeProfile,
      projectSkillOverlapRatio,
      normalizedJobDescription,
    ) +
    getExperienceProofScore(resumeProfile, experienceSkillOverlapRatio) +
    getPublicProofScore(resumeProfile, codingScore) +
    getCertificationEducationScore(resumeProfile) +
    keywordPresenceRatio * 5;

  score = applyStrictCaps({
    score,
    profile: resumeProfile,
    jobSkills,
    jobDescription: normalizedJobDescription,
    skillOverlapRatio,
    strongProjectProof,
    codingScore,
  });

  const matchScore = roundScore(clamp(score, 0, 100));

  return {
    matchScore,
    verdict: getVerdict(matchScore),
    brutalReality: getBrutalReality(matchScore),
    matchedSkills,
    missingSkills,
    missingKeywords: getMissingKeywords(
      importantKeywords,
      resumeEvidenceText,
      resumeSkillKeys,
    ),
    strengths: getStrengths(resumeProfile, matchedSkills),
    weaknesses: getWeaknesses({
      profile: resumeProfile,
      missingSkills,
      skillOverlapRatio,
      strongProjectProof,
      matchScore,
    }),
    recommendations: getRecommendations({
      profile: resumeProfile,
      missingSkills,
      jobSkills,
      jobDescription: normalizedJobDescription,
    }),
  };
}

function skill(
  name: string,
  categories: SkillCategory[],
  patterns: RegExp[],
): SkillDefinition {
  return {
    name,
    categories,
    patterns,
  };
}

function extractSkillsFromText(text: string): SkillDefinition[] {
  const detectedSkills = SKILL_DEFINITIONS.filter((skillDefinition) =>
    matchesSkillDefinition(skillDefinition, text),
  );

  if (detectedSkills.some((skillDefinition) => skillDefinition.name === "REST API")) {
    return detectedSkills.filter(
      (skillDefinition) => skillDefinition.name !== "APIs",
    );
  }

  return detectedSkills;
}

function matchesSkillDefinition(
  skillDefinition: SkillDefinition,
  text: string,
): boolean {
  return skillDefinition.patterns.some((pattern) => pattern.test(text));
}

function getResumeSkillKeys(profile: UserProfile): Set<string> {
  const skillKeys = new Set(profile.skills.map(getSkillKey));

  if (skillKeys.has("rest api")) {
    skillKeys.add("apis");
  }

  if (skillKeys.has("apis")) {
    skillKeys.add("rest api");
  }

  return skillKeys;
}

function getSkillKey(skillName: string): string {
  const knownSkill = SKILL_DEFINITIONS.find((skillDefinition) =>
    matchesSkillDefinition(skillDefinition, skillName),
  );

  return normalizeForSearch(knownSkill?.name ?? skillName);
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getEvidenceSkillOverlapRatio(
  jobSkills: SkillDefinition[],
  evidenceText: string,
): number {
  if (!jobSkills.length || !evidenceText.trim()) {
    return 0;
  }

  const matchedCount = jobSkills.filter((skillDefinition) =>
    matchesSkillDefinition(skillDefinition, evidenceText),
  ).length;

  return matchedCount / jobSkills.length;
}

function getProjectProofScore(
  profile: UserProfile,
  projectSkillOverlapRatio: number,
  jobDescription: string,
): number {
  if (!profile.projects.length) {
    return 0;
  }

  const projectText = profile.projects.join(" ");
  const hasRoleProof = getRoleProofTerms(jobDescription).some((term) =>
    hasTermInText(term, projectText),
  );

  const score =
    scaleScore(profile.projectsScore, 15, 10) +
    projectSkillOverlapRatio * 6 +
    (hasRoleProof ? 2 : 0) +
    (hasMeasurableImpact(profile) ? 2 : 0);

  return clamp(score, 0, 20);
}

function getExperienceProofScore(
  profile: UserProfile,
  experienceSkillOverlapRatio: number,
): number {
  if (!profile.experience.length) {
    return 0;
  }

  const score =
    scaleScore(profile.experienceScore, 12, 10) +
    experienceSkillOverlapRatio * 4 +
    (profile.experienceScore >= 8 ? 1 : 0);

  return clamp(score, 0, 15);
}

function getPublicProofScore(
  profile: UserProfile,
  codingScore: number,
): number {
  const score =
    (profile.github ? 4 : 0) +
    (profile.linkedin ? 2 : 0) +
    scaleScore(codingScore, 100, 3) +
    (profile.githubScore >= 7 ? 1 : 0);

  return clamp(score, 0, 10);
}

function getCertificationEducationScore(profile: UserProfile): number {
  const score =
    (profile.certifications.length ? 3 : 0) +
    (profile.education ? 2 : 0);

  return clamp(score, 0, 5);
}

type StrictCapInput = {
  score: number;
  profile: UserProfile;
  jobSkills: SkillDefinition[];
  jobDescription: string;
  skillOverlapRatio: number;
  strongProjectProof: boolean;
  codingScore: number;
};

function applyStrictCaps({
  score,
  profile,
  jobSkills,
  jobDescription,
  skillOverlapRatio,
  strongProjectProof,
  codingScore,
}: StrictCapInput): number {
  let cappedScore = score;
  const resumeSignalText = [
    profile.skills.join(" "),
    profile.projects.join(" "),
    profile.experience.join(" "),
    profile.education,
  ].join(" ");
  const hasGithubOrCodingProof =
    Boolean(profile.github) || profile.codingProfiles.length > 0;

  if (!jobSkills.length || skillOverlapRatio < 0.3) {
    cappedScore = Math.min(cappedScore, 55);
  }

  if (!profile.projects.length) {
    cappedScore = Math.min(cappedScore, 50);
  }

  if (!profile.experience.length && !strongProjectProof) {
    cappedScore = Math.min(cappedScore, 62);
  }

  if (!hasGithubOrCodingProof) {
    cappedScore = Math.min(cappedScore, 70);
  }

  if (
    requiresCategory(jobSkills, jobDescription, "dataAi") &&
    !hasCategorySignal(jobSkills, resumeSignalText, "dataAi")
  ) {
    cappedScore = Math.min(cappedScore, 55);
  }

  if (
    requiresCategory(jobSkills, jobDescription, "devops") &&
    !hasCategorySignal(jobSkills, resumeSignalText, "devops")
  ) {
    cappedScore = Math.min(cappedScore, 55);
  }

  if (
    requiresBackend(jobSkills, jobDescription) &&
    !hasBackendSignal(resumeSignalText)
  ) {
    cappedScore = Math.min(cappedScore, 60);
  }

  if (
    requiresFrontend(jobSkills, jobDescription) &&
    !hasFrontendSignal(resumeSignalText)
  ) {
    cappedScore = Math.min(cappedScore, 60);
  }

  const hasProjectOrExperienceProof =
    strongProjectProof || profile.experienceScore >= 5;
  if (
    cappedScore >= 79.5 &&
    (skillOverlapRatio < 0.65 || !hasProjectOrExperienceProof)
  ) {
    cappedScore = Math.min(cappedScore, 79);
  }

  const hasExceptionalProof =
    skillOverlapRatio >= 0.85 &&
    strongProjectProof &&
    (profile.experienceScore >= 8 ||
      profile.githubScore >= 7 ||
      codingScore >= 70);
  if (cappedScore >= 89.5 && !hasExceptionalProof) {
    cappedScore = Math.min(cappedScore, 89);
  }

  if (hasPlaceholderText(profile)) {
    cappedScore = Math.min(cappedScore, 25);
  }

  return cappedScore;
}

function requiresCategory(
  jobSkills: SkillDefinition[],
  jobDescription: string,
  category: SkillCategory,
): boolean {
  if (
    jobSkills.some((skillDefinition) =>
      skillDefinition.categories.includes(category),
    )
  ) {
    return true;
  }

  if (category === "dataAi") {
    return /\b(?:ai|ml|llm|rag|machine learning|deep learning|data science)\b/i.test(
      jobDescription,
    );
  }

  if (category === "devops") {
    return /\b(?:devops|cloud|deployment|infrastructure|ci\/cd)\b/i.test(
      jobDescription,
    );
  }

  return false;
}

function hasCategorySignal(
  jobSkills: SkillDefinition[],
  resumeSignalText: string,
  category: SkillCategory,
): boolean {
  return SKILL_DEFINITIONS.filter((skillDefinition) =>
    skillDefinition.categories.includes(category),
  ).some((skillDefinition) =>
    matchesSkillDefinition(skillDefinition, resumeSignalText),
  ) ||
    jobSkills
      .filter((skillDefinition) => skillDefinition.categories.includes(category))
      .some((skillDefinition) =>
        matchesSkillDefinition(skillDefinition, resumeSignalText),
      );
}

function requiresBackend(
  jobSkills: SkillDefinition[],
  jobDescription: string,
): boolean {
  return (
    /\bback[-\s]?end\b/i.test(jobDescription) ||
    jobSkills.some((skillDefinition) =>
      skillDefinition.categories.some((category) =>
        ["backend", "database"].includes(category),
      ),
    )
  );
}

function hasBackendSignal(resumeSignalText: string): boolean {
  return SKILL_DEFINITIONS.filter((skillDefinition) =>
    skillDefinition.categories.some((category) =>
      ["backend", "database"].includes(category),
    ),
  ).some((skillDefinition) =>
    matchesSkillDefinition(skillDefinition, resumeSignalText),
  );
}

function requiresFrontend(
  jobSkills: SkillDefinition[],
  jobDescription: string,
): boolean {
  return (
    /\bfront[-\s]?end\b/i.test(jobDescription) ||
    jobSkills.some((skillDefinition) =>
      skillDefinition.categories.includes("frontend"),
    )
  );
}

function hasFrontendSignal(resumeSignalText: string): boolean {
  return SKILL_DEFINITIONS.filter((skillDefinition) =>
    skillDefinition.categories.includes("frontend"),
  ).some((skillDefinition) =>
    matchesSkillDefinition(skillDefinition, resumeSignalText),
  );
}

function getRoleProofTerms(jobDescription: string): string[] {
  return IMPORTANT_KEYWORD_PATTERNS.filter(([, pattern]) =>
    pattern.test(jobDescription),
  ).map(([keyword]) => keyword);
}

function extractImportantKeywords(
  jobDescription: string,
  jobSkills: SkillDefinition[],
): string[] {
  return uniqueValues([
    ...jobSkills.map((skillDefinition) => skillDefinition.name),
    ...getRoleProofTerms(jobDescription),
  ]).slice(0, 24);
}

function getMissingKeywords(
  importantKeywords: string[],
  resumeEvidenceText: string,
  resumeSkillKeys: Set<string>,
): string[] {
  return importantKeywords
    .filter(
      (keyword) =>
        !hasTermInEvidence(keyword, resumeEvidenceText, resumeSkillKeys),
    )
    .slice(0, 12);
}

function hasTermInEvidence(
  term: string,
  evidenceText: string,
  resumeSkillKeys: Set<string>,
): boolean {
  return (
    resumeSkillKeys.has(getSkillKey(term)) ||
    hasTermInText(term, evidenceText)
  );
}

function hasTermInText(term: string, text: string): boolean {
  if (!term.trim() || !text.trim()) {
    return false;
  }

  const skillDefinition = SKILL_DEFINITIONS.find(
    (definition) => getSkillKey(definition.name) === getSkillKey(term),
  );

  if (skillDefinition) {
    return matchesSkillDefinition(skillDefinition, text);
  }

  const normalizedText = ` ${normalizeForSearch(text)} `;
  const normalizedTerm = ` ${normalizeForSearch(term)} `;

  return normalizedText.includes(normalizedTerm);
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = normalizeForSearch(value);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getVerdict(score: number): string {
  if (score >= 90) return "Very high JD alignment";
  if (score >= 75) return "Competitive JD alignment";
  if (score >= 60) return "Partial JD alignment";
  if (score >= 40) return "Weak JD alignment";

  return "Not ready yet";
}

function getBrutalReality(score: number): string {
  if (score >= 90) {
    return "You are highly aligned with this JD, but still tailor keywords before applying.";
  }

  if (score >= 75) {
    return "You can apply, but your resume should be customized before submission.";
  }

  if (score >= 60) {
    return "You have some overlap, but this resume will likely struggle against stronger applicants.";
  }

  if (score >= 40) {
    return "You are missing several important signals. Applying without changes is low probability.";
  }

  return "This role is currently a stretch. Build missing skills/projects before applying.";
}

function getStrengths(
  profile: UserProfile,
  matchedSkills: string[],
): string[] {
  const strengths: string[] = [];

  if (matchedSkills.length) {
    strengths.push(`Matched ${formatInlineList(matchedSkills.slice(0, 4))}`);
  }

  if (profile.projects.length) {
    strengths.push("Projects section is present");
  }

  if (profile.github) {
    strengths.push("GitHub link is available");
  }

  if (profile.linkedin) {
    strengths.push("LinkedIn profile is available");
  }

  if (profile.certifications.length) {
    strengths.push("Relevant certifications detected");
  }

  if (profile.experience.length) {
    strengths.push("Experience or internship signal found");
  }

  if (profile.codingProfiles.length) {
    strengths.push("Coding profile proof is available");
  }

  if (hasMeasurableImpact(profile)) {
    strengths.push("Resume includes measurable impact");
  }

  return strengths;
}

type WeaknessInput = {
  profile: UserProfile;
  missingSkills: string[];
  skillOverlapRatio: number;
  strongProjectProof: boolean;
  matchScore: number;
};

function getWeaknesses({
  profile,
  missingSkills,
  skillOverlapRatio,
  strongProjectProof,
  matchScore,
}: WeaknessInput): string[] {
  const weaknesses: string[] = [];

  if (missingSkills.length >= 3 || skillOverlapRatio < 0.5) {
    weaknesses.push("Missing several JD-critical skills");
  }

  if (!profile.github && !profile.codingProfiles.length) {
    weaknesses.push("No GitHub, portfolio, or coding proof detected");
  }

  if (!profile.experience.length || profile.experienceScore < 5) {
    weaknesses.push("Experience signal is weak");
  }

  if (!strongProjectProof) {
    weaknesses.push("Projects do not clearly prove this role");
  }

  if (!hasMeasurableImpact(profile)) {
    weaknesses.push("Resume may need stronger measurable impact");
  }

  if (hasPlaceholderText(profile)) {
    weaknesses.push("Resume extraction looks incomplete, so matching is conservative");
  }

  if (!weaknesses.length && matchScore < 90) {
    weaknesses.push("Resume still needs JD-specific tailoring before applying");
  }

  return weaknesses;
}

type RecommendationInput = {
  profile: UserProfile;
  missingSkills: string[];
  jobSkills: SkillDefinition[];
  jobDescription: string;
};

function getRecommendations({
  profile,
  missingSkills,
  jobSkills,
  jobDescription,
}: RecommendationInput): string[] {
  const recommendations: string[] = [];

  if (missingSkills.length) {
    recommendations.push(
      `Add missing JD keywords naturally where truthful: ${formatInlineList(
        missingSkills.slice(0, 5),
      )}.`,
    );
  }

  if (
    requiresBackend(jobSkills, jobDescription) &&
    !hasBackendSignal(profile.projects.join(" "))
  ) {
    recommendations.push(
      "Add one project proving backend APIs, database work, and deployment.",
    );
  }

  if (
    requiresFrontend(jobSkills, jobDescription) &&
    !hasFrontendSignal(profile.projects.join(" "))
  ) {
    recommendations.push(
      "Add a frontend project bullet that names the framework, UI scope, and user-facing outcome.",
    );
  }

  if (
    requiresCategory(jobSkills, jobDescription, "dataAi") &&
    !hasCategorySignal(jobSkills, profile.projects.join(" "), "dataAi")
  ) {
    recommendations.push(
      "Add an AI or data project with dataset, model, metric, and deployment details.",
    );
  }

  if (!profile.github && !profile.codingProfiles.length) {
    recommendations.push("Add GitHub, live project, or coding platform links.");
  }

  if (!hasMeasurableImpact(profile)) {
    recommendations.push(
      "Quantify impact with metrics such as users, performance, accuracy, latency, cost, or automation.",
    );
  }

  recommendations.push(
    "Do not apply with the same generic resume. Tailor it for this JD.",
  );

  return uniqueValues(recommendations).slice(0, 7);
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
