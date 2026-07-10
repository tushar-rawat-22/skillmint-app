import type {
  ProofLinkCandidate,
  ProofLinkType,
  ProofScoreResult,
  ProofScoringInput,
  SkillProofClassification,
} from "./types";
import {
  countProofLinkTypes,
  createEmptyLinkTypeCounts,
  extractProofLinks,
} from "./proofLinkExtraction";
import type {
  CareerIQResult,
  RecruiterResult,
} from "@/intelligence/types/results";

const TECH_SKILL_KEYWORDS = [
  "react",
  "next",
  "node",
  "javascript",
  "typescript",
  "python",
  "api",
  "sql",
  "database",
  "docker",
  "aws",
  "machine learning",
  "data",
];

export function generateProofScore({
  profile,
  resumeText = "",
  parsedProfile,
  careerField,
}: ProofScoringInput): ProofScoreResult {
  const extractedProofLinks = extractProofLinks(resumeText, parsedProfile);
  const linkTypeCounts = countProofLinkTypes(extractedProofLinks);
  const skillClassifications = classifySkillProof(
    profile.skills,
    profile.projects,
    profile.experience,
    resumeText,
    extractedProofLinks,
  );
  const evidenceBackedSkills = getSkillsByStatus(
    skillClassifications,
    "Evidence-backed",
  );
  const weaklySupportedSkills = getSkillsByStatus(
    skillClassifications,
    "Weakly supported",
  );
  const unverifiedSkills = getSkillsByStatus(
    skillClassifications,
    "Claimed but unverified",
  );
  const skillCoverageScore = calculateSkillCoverageScore(
    skillClassifications,
  );
  const projectProofDepthScore = calculateProjectProofDepthScore(
    profile,
    resumeText,
    extractedProofLinks,
  );
  const proofLinkQualityScore = calculateProofLinkQualityScore(
    extractedProofLinks,
  );
  const recencyConsistencyScore = calculateRecencyConsistencyScore(
    profile,
    resumeText,
  );
  const careerFieldRelevanceScore = calculateCareerFieldRelevanceScore(
    profile,
    resumeText,
    careerField,
  );

  let score = Math.round(
    skillCoverageScore * 0.35 +
      projectProofDepthScore * 0.25 +
      proofLinkQualityScore * 0.2 +
      recencyConsistencyScore * 0.1 +
      careerFieldRelevanceScore * 0.1,
  );

  if (!profile.projects.length) score = Math.min(score, 45);
  if (!extractedProofLinks.length) score = Math.min(score, 68);
  if (!profile.skills.length && !profile.projects.length) score = Math.min(score, 24);
  if (profile.analysisFlags?.isPlaceholderText) score = Math.min(score, 20);

  const proofConfidenceScore = clampScore(score);
  const proofCoverageLabel = getCoverageLabel(proofConfidenceScore);
  const strongestEvidence = getStrongestEvidence(
    profile,
    extractedProofLinks,
  );
  const weakestEvidence = getWeakestEvidence(
    profile,
    extractedProofLinks,
    unverifiedSkills,
  );
  const nextProofMove = getNextProofMove(
    profile,
    extractedProofLinks,
    unverifiedSkills,
  );

  return {
    proofConfidenceScore,
    proofCoverageLabel,
    proofSummary: getProofSummary(proofCoverageLabel),
    extractedProofLinks,
    linkTypeCounts,
    evidenceBackedSkills,
    weaklySupportedSkills,
    unverifiedSkills,
    skillClassifications,
    strongestEvidence,
    weakestEvidence,
    nextProofMove,
    scoringReasons: [
      `Skill coverage contributed ${Math.round(skillCoverageScore)} based on ${evidenceBackedSkills.length} evidence-backed and ${weaklySupportedSkills.length} weakly supported skills.`,
      `Project proof depth contributed ${Math.round(projectProofDepthScore)} from project count, outcomes, and public proof hints.`,
      `Proof link quality contributed ${Math.round(proofLinkQualityScore)} from ${extractedProofLinks.length} evidence candidate link${extractedProofLinks.length === 1 ? "" : "s"}.`,
      "Proof links are evidence candidates, not external source scans or verified claims.",
      "Generic links do not verify every skill; skills need relevant project, experience, certification, or proof context.",
      "Missing proof lowers confidence, but it means unverified, not false.",
    ],
  };
}

export function createMissingProofScore(
  summary = "Upload a resume to calculate proof confidence.",
): ProofScoreResult {
  return {
    proofConfidenceScore: 0,
    proofCoverageLabel: "Missing",
    proofSummary: summary,
    extractedProofLinks: [],
    linkTypeCounts: createEmptyLinkTypeCounts(),
    evidenceBackedSkills: [],
    weaklySupportedSkills: [],
    unverifiedSkills: [],
    skillClassifications: [],
    strongestEvidence: "No resume proof has been analyzed yet.",
    weakestEvidence: "Resume proof, project evidence, and proof links are missing.",
    nextProofMove: "Upload a resume with projects and proof links.",
    scoringReasons: [
      "Proof Confidence needs resume text, parsed skills, projects, and proof links.",
      "Missing proof means unverified, not false.",
    ],
  };
}

export function calculateProofAwareCareerIQ(
  currentCareerIQ: CareerIQResult,
  proofScore: ProofScoreResult,
): CareerIQResult {
  const score = Math.round(
    currentCareerIQ.score * 0.72 +
      proofScore.proofConfidenceScore * 0.28,
  );

  return {
    score,
    grade: getCareerIQGrade(score),
    summary: getCareerIQSummary(score, proofScore),
  };
}

export function calculateProofAwareRecruiterConfidence(
  currentRecruiterConfidence: RecruiterResult,
  proofScore: ProofScoreResult,
): RecruiterResult {
  const score = Math.round(
    currentRecruiterConfidence.score * 0.55 +
      proofScore.proofConfidenceScore * 0.45,
  );

  return {
    score,
    confidence: getRecruiterConfidenceLabel(score),
  };
}

function classifySkillProof(
  skills: string[],
  projects: string[],
  experience: string[],
  resumeText: string,
  links: ProofLinkCandidate[],
): SkillProofClassification[] {
  const projectCorpus = normalizeText([...projects, getRawProjectHints(resumeText)].join(" "));
  const experienceCorpus = normalizeText([
    ...experience,
    getRawExperienceHints(resumeText),
  ].join(" "));
  const certificationCorpus = normalizeText(getRawCertificationHints(resumeText));
  const proofContextCorpus = normalizeText([
    projectCorpus,
    experienceCorpus,
    certificationCorpus,
    links.map((link) => link.normalizedUrl).join(" "),
  ].join(" "));
  const hasProjectProofLink = links.some(isProjectProofLink);
  const hasConcreteExperience = hasConcreteExperienceSignal(
    experienceCorpus,
  );

  return skills.map((skill) => {
    const normalizedSkill = normalizeText(skill);
    const appearsInProject = includesLoose(projectCorpus, normalizedSkill);
    const appearsInExperience = includesLoose(experienceCorpus, normalizedSkill);
    const appearsInCertificationOrProof = appearsNearCertificationOrProofContext(
      normalizedSkill,
      certificationCorpus,
      proofContextCorpus,
    );
    const hasRelevantGeneralProof = links.some((link) =>
      isGeneralProofLink(link) &&
      isSkillRelevantToGeneralProof(
        normalizedSkill,
        link,
        proofContextCorpus,
        certificationCorpus,
      ),
    );

    if (
      (appearsInProject && hasProjectProofLink) ||
      (appearsInExperience && hasConcreteExperience)
    ) {
      return {
        skill,
        status: "Evidence-backed",
        reason:
          "Connected to project proof or concrete work/internship context.",
      };
    }

    if (
      appearsInProject ||
      (appearsInExperience && hasConcreteExperience) ||
      appearsInCertificationOrProof ||
      hasRelevantGeneralProof
    ) {
      return {
        skill,
        status: "Weakly supported",
        reason:
          "Visible in relevant resume context, but proof depth or source validation is still thin.",
      };
    }

    return {
      skill,
      status: "Claimed but unverified",
      reason:
        "Skill is listed, but SkillMint did not find a clear project, work, certification, or relevant proof-link connection.",
    };
  });
}

function isProjectProofLink(link: ProofLinkCandidate): boolean {
  return [
    "github_repo",
    "live_project",
    "portfolio",
    "kaggle",
    "dashboard",
    "huggingface",
  ].includes(link.type);
}

function isGeneralProofLink(link: ProofLinkCandidate): boolean {
  return [
    "github_profile",
    "linkedin",
    "leetcode",
    "certification",
    "medium",
    "hashnode",
    "devto",
  ].includes(link.type);
}

function isSkillRelevantToGeneralProof(
  normalizedSkill: string,
  link: ProofLinkCandidate,
  proofContextCorpus: string,
  certificationCorpus: string,
): boolean {
  if (!normalizedSkill) {
    return false;
  }

  if (link.type === "leetcode") {
    return isDsaOrProgrammingSkill(normalizedSkill) &&
      appearsInRelevantContext(normalizedSkill, proofContextCorpus);
  }

  if (link.type === "certification") {
    return appearsNearCertificationOrProofContext(
      normalizedSkill,
      certificationCorpus,
      link.normalizedUrl,
    );
  }

  if (["medium", "hashnode", "devto"].includes(link.type)) {
    return appearsInRelevantContext(normalizedSkill, proofContextCorpus) ||
      link.normalizedUrl.includes(toUrlToken(normalizedSkill));
  }

  // LinkedIn and GitHub profile links help identity and general proof coverage,
  // but they do not support every listed skill without project/work context.
  return false;
}

function hasConcreteExperienceSignal(experienceCorpus: string): boolean {
  return /\b(internship|intern|work|worked|developer|engineer|analyst|associate|consultant|freelance|client|company|startup|pvt|ltd|llp|inc|corp|present|current|202[0-9])\b/i
    .test(experienceCorpus);
}

function appearsNearCertificationOrProofContext(
  normalizedSkill: string,
  certificationCorpus: string,
  proofContextCorpus: string,
): boolean {
  if (!normalizedSkill) {
    return false;
  }

  return (
    includesLoose(certificationCorpus, normalizedSkill) ||
    (
      includesLoose(proofContextCorpus, normalizedSkill) &&
      /\b(certification|certificate|credential|course|specialization|nanodegree|verified)\b/i
        .test(proofContextCorpus)
    )
  );
}

function appearsInRelevantContext(
  normalizedSkill: string,
  proofContextCorpus: string,
): boolean {
  return includesLoose(proofContextCorpus, normalizedSkill) ||
    getSkillAliases(normalizedSkill).some((alias) =>
      includesLoose(proofContextCorpus, alias)
    );
}

function isDsaOrProgrammingSkill(normalizedSkill: string): boolean {
  const exactProgrammingSkills = new Set([
    "c",
    "c++",
    "cpp",
    "java",
    "python",
    "javascript",
    "js",
    "typescript",
    "ts",
  ]);

  if (exactProgrammingSkills.has(normalizedSkill)) {
    return true;
  }

  if (normalizedSkill === "c programming") {
    return true;
  }

  return [
    "dsa",
    "data structures",
    "algorithms",
    "algorithm",
    "problem solving",
  ].some((phrase) => containsPhrase(normalizedSkill, phrase));
}

function getSkillAliases(normalizedSkill: string): string[] {
  if (normalizedSkill === "c++") {
    return ["cpp", "c plus plus"];
  }

  if (normalizedSkill === "js") {
    return ["javascript"];
  }

  if (normalizedSkill === "ts") {
    return ["typescript"];
  }

  if (normalizedSkill === "dsa") {
    return ["data structures", "algorithms", "problem solving"];
  }

  return [];
}

function toUrlToken(normalizedSkill: string): string {
  return normalizedSkill.replace(/\s+/g, "-");
}

function calculateSkillCoverageScore(
  classifications: SkillProofClassification[],
): number {
  if (!classifications.length) {
    return 0;
  }

  const score = classifications.reduce((total, classification) => {
    if (classification.status === "Evidence-backed") return total + 1;
    if (classification.status === "Weakly supported") return total + 0.45;

    return total;
  }, 0);

  return clampScore((score / classifications.length) * 100);
}

function calculateProjectProofDepthScore(
  profile: ProofScoringInput["profile"],
  resumeText: string,
  links: ProofLinkCandidate[],
): number {
  if (!profile.projects.length) {
    return 0;
  }

  const linkTypes = new Set(links.map((link) => link.type));
  const hasProjectLink = [
    "github_repo",
    "live_project",
    "portfolio",
    "kaggle",
    "dashboard",
    "huggingface",
  ].some((type) => linkTypes.has(type as ProofLinkType));
  const projectCountScore = Math.min(profile.projects.length * 8, 24);
  const measurableScore = profile.analysisFlags?.hasMeasurableImpact ? 18 : 0;
  const linkScore = hasProjectLink ? 18 : links.length ? 8 : 0;
  const depthLanguageScore = countProjectDepthHints(resumeText) * 5;
  let score =
    (profile.projectsScore / 15) * 42 +
    projectCountScore +
    measurableScore +
    linkScore +
    Math.min(depthLanguageScore, 18);

  if (profile.analysisFlags?.hasGenericProjects) {
    score = Math.min(score, 58);
  }

  return clampScore(score);
}

function calculateProofLinkQualityScore(links: ProofLinkCandidate[]): number {
  if (!links.length) {
    return 0;
  }

  const score = links.reduce((total, link) => total + getLinkTypeWeight(link.type), 0);

  return clampScore(score);
}

function calculateRecencyConsistencyScore(
  profile: ProofScoringInput["profile"],
  resumeText: string,
): number {
  const normalizedText = normalizeText(resumeText);
  let score = 42;

  if (/\b(2024|2025|2026|present|current|ongoing)\b/i.test(normalizedText)) {
    score += 22;
  }

  if (profile.analysisFlags?.hasSectionClarity) score += 16;
  if (profile.analysisFlags?.hasMeasurableImpact) score += 14;
  if (profile.activityScore >= 4) score += 8;
  if (profile.analysisFlags?.isPlaceholderText) score = Math.min(score, 20);

  return clampScore(score);
}

function calculateCareerFieldRelevanceScore(
  profile: ProofScoringInput["profile"],
  resumeText: string,
  careerField?: string | null,
): number {
  const normalizedCorpus = normalizeText([
    resumeText,
    profile.skills.join(" "),
    profile.projects.join(" "),
  ].join(" "));

  if (!careerField) {
    return profile.skills.length || profile.projects.length ? 58 : 25;
  }

  const keywordHits = getCareerFieldKeywords(careerField).filter((keyword) =>
    normalizedCorpus.includes(keyword),
  ).length;

  return clampScore(42 + keywordHits * 13);
}

function getSkillsByStatus(
  classifications: SkillProofClassification[],
  status: SkillProofClassification["status"],
): string[] {
  return classifications
    .filter((classification) => classification.status === status)
    .map((classification) => classification.skill);
}

function getStrongestEvidence(
  profile: ProofScoringInput["profile"],
  links: ProofLinkCandidate[],
): string {
  if (links.some((link) => link.type === "github_repo")) {
    return "GitHub repository links are present as evidence candidates.";
  }

  if (links.some((link) => link.type === "live_project")) {
    return "Live project links are present as evidence candidates.";
  }

  if (profile.projects.length && profile.analysisFlags?.hasMeasurableImpact) {
    return "Projects include measurable outcomes or concrete impact language.";
  }

  if (links.some((link) => link.type === "portfolio")) {
    return "Portfolio links are present as evidence candidates.";
  }

  if (profile.projects.length) {
    return "Project entries give SkillMint a starting point for proof.";
  }

  return "No standout evidence signal was detected yet.";
}

function getWeakestEvidence(
  profile: ProofScoringInput["profile"],
  links: ProofLinkCandidate[],
  unverifiedSkills: string[],
): string {
  if (unverifiedSkills.length) {
    return `${unverifiedSkills.length} claimed skill${unverifiedSkills.length === 1 ? "" : "s"} still need clearer proof.`;
  }

  if (!links.length) {
    return "No proof links were found in the resume.";
  }

  if (!profile.analysisFlags?.hasMeasurableImpact) {
    return "Projects need stronger outcomes, numbers, or user impact.";
  }

  if (!profile.github && !links.some((link) => link.type === "github_repo")) {
    return "Code proof is still light because no GitHub repository signal was detected.";
  }

  return "Proof exists, but source validation is still future work.";
}

function getNextProofMove(
  profile: ProofScoringInput["profile"],
  links: ProofLinkCandidate[],
  unverifiedSkills: string[],
): string {
  if (!profile.projects.length) {
    return "Build one role-aligned project with measurable outcomes.";
  }

  if (!links.length) {
    return "Add GitHub, portfolio, or live project links to your resume.";
  }

  if (unverifiedSkills[0]) {
    return `Tie ${unverifiedSkills[0]} to a project bullet or proof link.`;
  }

  if (!profile.analysisFlags?.hasMeasurableImpact) {
    return "Add measurable project outcomes, users, performance, or results.";
  }

  return "Strengthen one deployed project with README, screenshots, and results.";
}

function getCoverageLabel(score: number): ProofScoreResult["proofCoverageLabel"] {
  if (score >= 78) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 35) return "Weak";

  return "Missing";
}

function getProofSummary(label: ProofScoreResult["proofCoverageLabel"]): string {
  if (label === "Strong") {
    return "Your claims have visible project, link, or experience support.";
  }

  if (label === "Moderate") {
    return "Some claims are supported, but proof depth still needs work.";
  }

  if (label === "Weak") {
    return "Skill claims exist, but too much proof is thin or indirect.";
  }

  return "SkillMint needs resume proof, projects, and links before confidence can rise.";
}

function getCareerIQGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";

  return "C";
}

function getCareerIQSummary(
  score: number,
  proofScore: ProofScoreResult,
): string {
  if (score >= 80) {
    return `Career IQ: ${getCareerIQBand(score)}, with ${proofScore.proofCoverageLabel.toLowerCase()} Proof Confidence. Treat it as directional until more evidence candidates are complete.`;
  }

  if (score >= 65) {
    return `Career IQ: ${getCareerIQBand(score)}, but Proof Confidence is ${proofScore.proofCoverageLabel.toLowerCase()}. More project evidence will raise trust.`;
  }

  return `Career IQ: ${getCareerIQBand(score)}. ${proofScore.nextProofMove}`;
}

function getCareerIQBand(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Competitive";
  if (score >= 55) return "Developing";
  if (score >= 40) return "Weak";

  return "Critical";
}

function getRecruiterConfidenceLabel(score: number): string {
  if (score >= 85) return "Very High";
  if (score >= 70) return "High";
  if (score >= 55) return "Moderate";

  return "Low";
}

function getLinkTypeWeight(type: ProofLinkType): number {
  if (type === "github_repo") return 24;
  if (type === "live_project") return 20;
  if (type === "github_profile" || type === "portfolio") return 16;
  if (type === "kaggle" || type === "huggingface" || type === "dashboard") return 14;
  if (type === "leetcode" || type === "behance" || type === "figma" || type === "dribbble") return 11;
  if (type === "linkedin" || type === "certification" || type === "medium" || type === "hashnode" || type === "devto") return 8;
  if (type === "app_store") return 10;
  if (type === "google_drive") return 3;

  return 2;
}

function countProjectDepthHints(text: string): number {
  const normalizedText = normalizeText(text);

  return [
    "deployed",
    "readme",
    "screenshot",
    "test",
    "auth",
    "database",
    "api",
    "dashboard",
    "users",
    "performance",
    "optimized",
    "metrics",
  ].filter((hint) => normalizedText.includes(hint)).length;
}

function getRawProjectHints(text: string): string {
  const projectSectionMatch = text.match(
    /(?:projects?|academic projects?|personal projects?)\s*:?\s*([\s\S]{0,1800})/i,
  );

  return projectSectionMatch?.[1] ?? "";
}

function getRawExperienceHints(text: string): string {
  const experienceSectionMatch = text.match(
    /(?:experience|work experience|internships?|professional experience)\s*:?\s*([\s\S]{0,1800})/i,
  );

  return experienceSectionMatch?.[1] ?? "";
}

function getRawCertificationHints(text: string): string {
  const certificationSectionMatch = text.match(
    /(?:certifications?|licenses and certifications|licenses & certifications|courses|credentials?)\s*:?\s*([\s\S]{0,1400})/i,
  );

  return certificationSectionMatch?.[1] ?? "";
}

function getCareerFieldKeywords(careerField: string): string[] {
  if (careerField === "data_analytics") {
    return ["sql", "dashboard", "excel", "python", "analytics", "tableau", "power bi", "etl"];
  }

  if (careerField === "sales_business_development") {
    return ["sales", "crm", "lead", "pipeline", "revenue", "client", "bd"];
  }

  if (careerField === "marketing_content") {
    return ["marketing", "content", "seo", "campaign", "copy", "social", "analytics"];
  }

  if (careerField === "finance_operations") {
    return ["finance", "excel", "operations", "report", "forecast", "accounting", "process"];
  }

  if (careerField === "design_product") {
    return ["design", "figma", "prototype", "product", "ux", "ui", "research"];
  }

  return TECH_SKILL_KEYWORDS;
}

function includesLoose(corpus: string, needle: string): boolean {
  if (!needle) {
    return false;
  }

  if (needle.length === 1) {
    return containsPhrase(corpus, needle);
  }

  return corpus.includes(needle);
}

function containsPhrase(corpus: string, phrase: string): boolean {
  if (!phrase) {
    return false;
  }

  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  const phrasePattern = new RegExp(`(?:^|\\s)${escapedPhrase}(?:\\s|$)`);

  return phrasePattern.test(corpus);
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#. ]/g, " ").replace(/\s+/g, " ");
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
