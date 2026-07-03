import type { ParsedResumeProfile } from "@/lib/parser/profileBuilder";
import type {
  Certification,
  CertificationTier,
  CodingProfile,
  GithubProfile,
  LinkedinProfile,
  UserProfile,
} from "@/intelligence/types/profile";

const SCORE_LIMITS = {
  resume: 20,
  skills: 15,
  projects: 15,
  experience: 12,
  education: 10,
  github: 8,
  linkedin: 5,
  ats: 5,
  recruiter: 5,
  activity: 5,
  optional: 10,
} as const;

const CERTIFICATION_TIERS: Record<
  CertificationTier,
  readonly string[]
> = {
  S: [
    "Google",
    "Meta",
    "Amazon",
    "Microsoft",
    "Apple",
    "NVIDIA",
    "OpenAI",
    "DeepMind",
    "Anthropic",
    "Netflix",
    "Tesla",
    "Adobe",
    "Stripe",
    "Uber",
    "Airbnb",
    "Databricks",
    "Snowflake",
    "Cloudflare",
  ],
  A: [
    "AWS",
    "Azure",
    "GCP",
    "Oracle",
    "Cisco",
    "Red Hat",
    "Salesforce",
    "MongoDB",
    "Docker",
    "Kubernetes",
    "HashiCorp",
  ],
  B: [
    "IBM",
    "Intel",
    "Linux Foundation",
    "FreeCodeCamp",
    "HarvardX",
    "MITx",
    "Stanford Online",
    "edX",
    "NPTEL",
  ],
  C: [
    "Coursera",
    "Udemy",
    "Great Learning",
    "Simplilearn",
    "Scaler",
    "LinkedIn Learning",
    "Pluralsight",
  ],
  D: ["Unknown"],
};

const PROJECT_PROOF_PATTERN =
  /\b(?:deployed|deployment|users?|github|api|database|authentication|auth|ai|cloud|analytics|dashboard|automation|mongodb|sql|firebase|supabase|aws|docker|react|next\.?js|node\.?js)\b/i;
const GENERIC_PROJECT_PATTERN =
  /^(?:portfolio|website|app|application|dashboard|project|mini project|major project|resume analyzer)$/i;
const MEASURABLE_IMPACT_PATTERN =
  /(?:\b\d+(?:\.\d+)?\s?(?:%|x|k|lpa|users?|clients?|requests?|ms|seconds?|minutes?|hours?|stars?|repos?|repositories)\b)|(?:\b(?:revenue|performance|accuracy|latency|cost|growth|reduced|increased|improved|optimized|saved)\b.{0,32}\b\d+)/i;
const STRUCTURED_LINE_PATTERN =
  /(?:^|\n)\s*(?:[-*+]|\d+[.)])\s+\S/;
const EXPERIENCE_WORD_PATTERN =
  /\b(?:intern|internship|developer|engineer|freelancer|client|trainee|worked|built|delivered)\b/i;
const EDUCATION_DEGREE_PATTERN =
  /\b(?:b\.?\s?tech|btech|bachelor|b\.?\s?e\.?)\b/i;
const EDUCATION_DOMAIN_PATTERN =
  /\b(?:computer\s+science|cse|information\s+technology|\bit\b|data|artificial\s+intelligence|\bai\b|machine\s+learning|\bml\b)\b/i;
const EDUCATION_GPA_PATTERN = /\b(?:cgpa|gpa)\b/i;
const HACKATHON_PATTERN = /\bhackathons?\b/i;
const LEADERSHIP_PATTERN =
  /\b(?:lead|leader|led|coordinator|founder|president|captain|head)\b/i;
const ACHIEVEMENT_PATTERN =
  /\b(?:winner|award|finalist|rank|achievement|selected|scholarship)\b/i;
const RESEARCH_PATTERN =
  /\b(?:research\s+paper|publication|ieee|patent|journal)\b/i;
const OPEN_SOURCE_PATTERN =
  /\b(?:open\s+source|pull\s+request|merged\s+pr|contributor|contribution)\b/i;
const VERIFIED_CERTIFICATION_PATTERN =
  /\b(?:verified|professional|associate|expert|certified|certification|credential)\b/i;

export function buildUserProfileFromParsedResume(
  parsedProfile: ParsedResumeProfile,
  extractedText: string,
): UserProfile {
  const rawText = extractedText.trim();

  if (isPlaceholderExtraction(rawText)) {
    return buildPlaceholderUserProfile();
  }

  const allText = [
    rawText,
    parsedProfile.projects.join("\n"),
    parsedProfile.experience.join("\n"),
    parsedProfile.certifications.join("\n"),
  ].join("\n");
  const certifications = buildCertifications(parsedProfile.certifications);
  const codingProfiles = buildCodingProfiles(parsedProfile, allText);
  const github = buildGithubProfile(parsedProfile, allText);
  const linkedin = buildLinkedinProfile(parsedProfile);

  // Brutal scoring: only visible proof gets credit; vague claims stay low.
  const resumeScore = scoreResume(parsedProfile, rawText);
  const skillsScore = scoreSkills(parsedProfile);
  const projectsScore = scoreProjects(parsedProfile);
  const experienceScore = scoreExperience(parsedProfile);
  const educationScore = scoreEducation(parsedProfile, allText);
  const githubScore = scoreGithub(parsedProfile);
  const linkedinScore = scoreLinkedin(parsedProfile);
  const atsScore = scoreBaseAts(parsedProfile, rawText);
  const recruiterScore = scoreBaseRecruiter(
    parsedProfile,
    certifications,
    codingProfiles,
    rawText,
  );
  const activityScore = scoreActivity(
    parsedProfile,
    certifications,
    codingProfiles,
    allText,
  );

  return {
    resumeScore,
    skillsScore,
    projectsScore,
    experienceScore,
    educationScore,
    githubScore,
    linkedinScore,
    atsScore,
    recruiterScore,
    activityScore,
    skills: parsedProfile.skills,
    projects: parsedProfile.projects,
    experience: parsedProfile.experience,
    education: parsedProfile.education.join(" | "),
    certifications,
    codingProfiles,
    github,
    linkedin,
    hackathons: scoreHackathons(allText),
    openSourceScore: scoreOpenSource(allText, github),
    leadershipScore: scoreOptionalSignal(allText, LEADERSHIP_PATTERN),
    achievementScore: scoreOptionalSignal(allText, ACHIEVEMENT_PATTERN),
    researchScore: scoreOptionalSignal(allText, RESEARCH_PATTERN),
    analysisFlags: {
      hasMeasurableImpact: hasMeasurableImpact(rawText),
      hasSectionClarity: hasSectionClarity(parsedProfile),
      hasProofLink: hasProofLink(parsedProfile),
      hasGenericProjects: hasGenericProjects(
        parsedProfile,
        [
          ...parsedProfile.projects,
          parsedProfile.rawSections.projects ?? "",
        ].join("\n"),
      ),
      isPlaceholderText: false,
    },
  };
}

function buildPlaceholderUserProfile(): UserProfile {
  return {
    resumeScore: 0,
    skillsScore: 0,
    projectsScore: 0,
    experienceScore: 0,
    educationScore: 0,
    githubScore: 0,
    linkedinScore: 0,
    atsScore: 0,
    recruiterScore: 0,
    activityScore: 0,
    skills: [],
    projects: [],
    experience: [],
    education: "",
    certifications: [],
    codingProfiles: [],
    hackathons: 0,
    openSourceScore: 0,
    leadershipScore: 0,
    achievementScore: 0,
    researchScore: 0,
    analysisFlags: {
      hasMeasurableImpact: false,
      hasSectionClarity: false,
      hasProofLink: false,
      hasGenericProjects: false,
      isPlaceholderText: true,
    },
  };
}

function scoreResume(
  parsedProfile: ParsedResumeProfile,
  text: string,
): number {
  let score = 0;

  if (parsedProfile.rawSections.skills) score += 3;
  if (parsedProfile.rawSections.projects) score += 3;
  if (parsedProfile.education.length) score += 2;
  if (parsedProfile.experience.length) score += 2;
  if (parsedProfile.certifications.length) score += 2;
  if (hasProofLink(parsedProfile)) score += 2;
  if (hasMeaningfulLength(text)) score += 2;
  if (hasStructuredLines(text)) score += 2;
  if (hasMeasurableImpact(text)) score += 2;
  if (hasContactSignal(parsedProfile)) score += 2;

  return clamp(score, 0, SCORE_LIMITS.resume);
}

function scoreSkills(parsedProfile: ParsedResumeProfile): number {
  const skillCount = parsedProfile.skills.length;

  let score = 0;

  if (skillCount >= 13) score = 15;
  else if (skillCount >= 8) score = 12;
  else if (skillCount >= 4) score = 8;
  else if (skillCount >= 1) score = 4;

  if (skillCount >= 20 && parsedProfile.projects.length < 2) {
    score = Math.min(score, 11);
  }

  return clamp(score, 0, SCORE_LIMITS.skills);
}

function scoreProjects(parsedProfile: ParsedResumeProfile): number {
  const projectCount = parsedProfile.projects.length;

  let score = 0;

  if (projectCount >= 4) score = 15;
  else if (projectCount === 3) score = 12;
  else if (projectCount === 2) score = 9;
  else if (projectCount === 1) score = 5;

  const projectText = [
    ...parsedProfile.projects,
    parsedProfile.rawSections.projects ?? "",
  ].join("\n");
  const proofHits = countPatternHits(projectText, PROJECT_PROOF_PATTERN);

  if (proofHits >= 3) score += 2;
  else if (proofHits > 0) score += 1;

  if (projectCount > 0 && hasGenericProjects(parsedProfile, projectText)) {
    score = Math.min(score, 9);
  }

  return clamp(score, 0, SCORE_LIMITS.projects);
}

function scoreExperience(parsedProfile: ParsedResumeProfile): number {
  const experienceCount = parsedProfile.experience.filter((entry) =>
    EXPERIENCE_WORD_PATTERN.test(entry),
  ).length;

  if (experienceCount >= 3) return 12;
  if (experienceCount === 2) return 8;
  if (experienceCount === 1) return 5;

  return 0;
}

function scoreEducation(
  parsedProfile: ParsedResumeProfile,
  text: string,
): number {
  if (!parsedProfile.education.length) {
    return 0;
  }

  let score = 6;

  if (EDUCATION_DEGREE_PATTERN.test(text)) score = 8;
  if (EDUCATION_DOMAIN_PATTERN.test(text)) score += 1;
  if (EDUCATION_GPA_PATTERN.test(text)) score += 1;

  return clamp(score, 0, SCORE_LIMITS.education);
}

function scoreGithub(parsedProfile: ParsedResumeProfile): number {
  if (!parsedProfile.links.github) {
    return 0;
  }

  return clamp(
    4 + Math.min(parsedProfile.projects.length, 4),
    0,
    SCORE_LIMITS.github,
  );
}

function scoreLinkedin(parsedProfile: ParsedResumeProfile): number {
  if (!parsedProfile.links.linkedin) {
    return 0;
  }

  let score = 3;

  if (parsedProfile.experience.length) score += 1;
  if (
    parsedProfile.certifications.length ||
    parsedProfile.projects.length
  ) {
    score += 1;
  }

  return clamp(score, 0, SCORE_LIMITS.linkedin);
}

function scoreBaseAts(
  parsedProfile: ParsedResumeProfile,
  text: string,
): number {
  let score = 0;

  if (parsedProfile.skills.length) score += 1;
  if (parsedProfile.projects.length) score += 1;
  if (parsedProfile.education.length) score += 0.55;
  if (parsedProfile.experience.length) score += 0.45;
  if (parsedProfile.certifications.length) score += 0.35;
  if (hasContactSignal(parsedProfile)) score += 0.45;
  if (hasSectionClarity(parsedProfile)) score += 0.65;
  if (hasMeasurableImpact(text)) score += 0.6;

  if (!parsedProfile.skills.length) score -= 1.1;
  if (!parsedProfile.projects.length) score -= 1.1;
  if (!parsedProfile.education.length) score -= 0.6;
  if (
    parsedProfile.skills.length >= 16 &&
    parsedProfile.projects.length < 2
  ) {
    score -= 0.5;
  }

  return roundScore(clamp(score, 0, SCORE_LIMITS.ats));
}

function scoreBaseRecruiter(
  parsedProfile: ParsedResumeProfile,
  certifications: Certification[],
  codingProfiles: CodingProfile[],
  text: string,
): number {
  let score = 0;

  if (parsedProfile.projects.length >= 3) score += 1.2;
  else if (parsedProfile.projects.length >= 1) score += 0.8;

  if (parsedProfile.experience.length >= 2) score += 1.1;
  else if (parsedProfile.experience.length === 1) score += 0.7;

  if (parsedProfile.skills.length >= 8) score += 0.8;
  else if (parsedProfile.skills.length >= 4) score += 0.5;

  if (parsedProfile.links.github) score += 0.55;
  if (parsedProfile.links.linkedin) score += 0.35;
  if (certifications.length) score += hasStrongCertification(certifications)
    ? 0.55
    : 0.25;
  if (hasMeasurableImpact(text)) score += 0.55;
  if (codingProfiles.length) score += 0.45;
  if (LEADERSHIP_PATTERN.test(text) || ACHIEVEMENT_PATTERN.test(text)) {
    score += 0.45;
  }

  const exceptionalFresherProof =
    parsedProfile.experience.length === 0 &&
    parsedProfile.projects.length >= 4 &&
    parsedProfile.links.github &&
    parsedProfile.skills.length >= 10 &&
    (codingProfiles.length || hasStrongCertification(certifications));

  if (!parsedProfile.experience.length && !exceptionalFresherProof) {
    score = Math.min(score, 3.7);
  }

  if (!parsedProfile.projects.length) {
    score = Math.min(score, 2.75);
  }

  return roundScore(clamp(score, 0, SCORE_LIMITS.recruiter));
}

function scoreActivity(
  parsedProfile: ParsedResumeProfile,
  certifications: Certification[],
  codingProfiles: CodingProfile[],
  text: string,
): number {
  let score = 0;

  if (parsedProfile.links.github) score += 1;
  if (parsedProfile.links.linkedin) score += 0.6;
  if (parsedProfile.projects.length >= 2) score += 1;
  else if (parsedProfile.projects.length === 1) score += 0.6;
  if (certifications.length) score += 0.7;
  if (codingProfiles.length) score += 0.8;
  if (HACKATHON_PATTERN.test(text)) score += 0.5;
  if (OPEN_SOURCE_PATTERN.test(text)) score += 0.4;
  if (ACHIEVEMENT_PATTERN.test(text)) score += 0.4;

  return roundScore(clamp(score, 0, SCORE_LIMITS.activity));
}

function buildCertifications(
  certificateLines: string[],
): Certification[] {
  return certificateLines.map((certificateLine) => {
    const issuer = inferCertificationIssuer(certificateLine);
    const tier = inferCertificationTier(issuer);

    return {
      name: certificateLine,
      issuer,
      tier,
      verified: VERIFIED_CERTIFICATION_PATTERN.test(certificateLine),
    };
  });
}

function inferCertificationIssuer(certificateText: string): string {
  for (const tier of ["S", "A", "B", "C"] satisfies CertificationTier[]) {
    const issuer = CERTIFICATION_TIERS[tier].find((candidateIssuer) =>
      new RegExp(`\\b${escapeRegExp(candidateIssuer)}\\b`, "i").test(
        certificateText,
      ),
    );

    if (issuer) {
      return issuer;
    }
  }

  return "Unknown";
}

// Certificate tiers keep generic course platforms from overpowering proof.
function inferCertificationTier(issuer: string): CertificationTier {
  for (const tier of ["S", "A", "B", "C"] satisfies CertificationTier[]) {
    if (CERTIFICATION_TIERS[tier].includes(issuer)) {
      return tier;
    }
  }

  return "D";
}

function buildCodingProfiles(
  parsedProfile: ParsedResumeProfile,
  text: string,
): CodingProfile[] {
  const profiles: CodingProfile[] = [];
  const leetcodeDetected =
    Boolean(parsedProfile.links.leetcode) || /\bleetcode\b/i.test(text);
  const codeforcesDetected =
    Boolean(parsedProfile.links.codeforces) || /\bcodeforces\b/i.test(text);

  if (leetcodeDetected) {
    const leetcodeProfile: CodingProfile = {
      platform: "leetcode",
      url: parsedProfile.links.leetcode,
      username: parsedProfile.links.leetcode
        ? getUsernameFromUrl(parsedProfile.links.leetcode)
        : undefined,
    };
    const solved = inferSolvedCount(text);
    const explicitSplits = inferLeetCodeSplits(text);

    if (solved !== undefined) leetcodeProfile.solved = solved;
    Object.assign(leetcodeProfile, explicitSplits);

    profiles.push(leetcodeProfile);
  }

  if (codeforcesDetected) {
    profiles.push({
      platform: "codeforces",
      url: parsedProfile.links.codeforces,
      username: parsedProfile.links.codeforces
        ? getUsernameFromUrl(parsedProfile.links.codeforces)
        : undefined,
    });
  }

  return profiles;
}

function buildGithubProfile(
  parsedProfile: ParsedResumeProfile,
  text: string,
): GithubProfile | undefined {
  if (!parsedProfile.links.github) {
    return undefined;
  }

  return {
    url: parsedProfile.links.github,
    repositories:
      extractNumberNear(text, /\b(\d{1,4})\s+(?:repos?|repositories)\b/i) ??
      parsedProfile.projects.length,
    stars:
      extractNumberNear(text, /\b(\d{1,5})\s+(?:github\s+)?stars?\b/i) ??
      0,
    followers:
      extractNumberNear(text, /\b(\d{1,5})\s+(?:github\s+)?followers?\b/i) ??
      0,
    openSourceContributions:
      extractNumberNear(
        text,
        /\b(\d{1,4})\s+(?:open\s+source\s+)?contributions?\b/i,
      ) ?? 0,
  };
}

function buildLinkedinProfile(
  parsedProfile: ParsedResumeProfile,
): LinkedinProfile | undefined {
  if (!parsedProfile.links.linkedin) {
    return undefined;
  }

  return {
    url: parsedProfile.links.linkedin,
    hasHeadline: false,
    hasAbout: false,
    hasFeatured: Boolean(
      parsedProfile.links.portfolio || parsedProfile.links.github,
    ),
  };
}

function inferSolvedCount(text: string): number | undefined {
  const patterns = [
    /\bleetcode[^\n]{0,40}?\b(\d{2,5})\b/i,
    /\b(\d{2,5})\s+(?:leetcode\s+)?(?:problems|questions)(?:\s+solved)?\b/i,
    /\bsolved\s+(\d{2,5})\s+(?:leetcode\s+)?(?:problems|questions)\b/i,
  ];

  return firstNumberMatch(text, patterns);
}

function inferLeetCodeSplits(
  text: string,
): Pick<
  CodingProfile,
  "easySolved" | "mediumSolved" | "hardSolved"
> {
  return {
    easySolved: extractNumberNear(text, /\b(\d{1,4})\s+easy\b/i),
    mediumSolved: extractNumberNear(text, /\b(\d{1,4})\s+medium\b/i),
    hardSolved: extractNumberNear(text, /\b(\d{1,4})\s+hard\b/i),
  };
}

function scoreHackathons(text: string): number {
  if (!HACKATHON_PATTERN.test(text)) {
    return 0;
  }

  const explicitCount =
    extractNumberNear(text, /\b(\d{1,2})\s+hackathons?\b/i) ?? 1;

  return clamp(explicitCount, 1, 5);
}

function scoreOpenSource(
  text: string,
  github?: GithubProfile,
): number {
  let score = 0;

  if (OPEN_SOURCE_PATTERN.test(text)) score += 4;
  if ((github?.openSourceContributions ?? 0) > 0) score += 4;
  if ((github?.stars ?? 0) >= 10) score += 2;

  return clamp(score, 0, SCORE_LIMITS.optional);
}

function scoreOptionalSignal(
  text: string,
  pattern: RegExp,
): number {
  if (!pattern.test(text)) {
    return 0;
  }

  let score = 4;

  if (hasMeasurableImpact(text)) score += 2;
  if (STRUCTURED_LINE_PATTERN.test(text)) score += 1;

  return clamp(score, 0, SCORE_LIMITS.optional);
}

function hasGenericProjects(
  parsedProfile: ParsedResumeProfile,
  projectText: string,
): boolean {
  const genericProjectCount = parsedProfile.projects.filter((project) =>
    GENERIC_PROJECT_PATTERN.test(project.trim()),
  ).length;
  const lacksTechnicalDetail = !PROJECT_PROOF_PATTERN.test(projectText);

  return genericProjectCount >= 1 && lacksTechnicalDetail;
}

function hasStrongCertification(certifications: Certification[]): boolean {
  return certifications.some(
    (certification) =>
      certification.tier === "S" || certification.tier === "A",
  );
}

function hasProofLink(parsedProfile: ParsedResumeProfile): boolean {
  return Boolean(
    parsedProfile.links.github ||
      parsedProfile.links.linkedin ||
      parsedProfile.links.portfolio,
  );
}

function hasContactSignal(parsedProfile: ParsedResumeProfile): boolean {
  return Boolean(
    parsedProfile.links.email ||
      parsedProfile.links.phone ||
      hasProofLink(parsedProfile),
  );
}

function hasMeaningfulLength(text: string): boolean {
  return text.replace(/\s+/g, " ").trim().length >= 600;
}

function hasStructuredLines(text: string): boolean {
  return STRUCTURED_LINE_PATTERN.test(text) ||
    text.split(/\n+/).filter((line) => line.trim().length > 12).length >= 12;
}

function hasSectionClarity(parsedProfile: ParsedResumeProfile): boolean {
  return Object.values(parsedProfile.rawSections).filter(Boolean).length >= 3;
}

function hasMeasurableImpact(text: string): boolean {
  return MEASURABLE_IMPACT_PATTERN.test(text);
}

function isPlaceholderExtraction(text: string): boolean {
  return /temporary\s+(?:pdf|docx)\s+extraction\s+placeholder/i.test(text);
}

function countPatternHits(text: string, pattern: RegExp): number {
  const globalPattern = new RegExp(pattern.source, `${pattern.flags}g`);

  return text.match(globalPattern)?.length ?? 0;
}

function firstNumberMatch(
  text: string,
  patterns: RegExp[],
): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1] ? Number.parseInt(match[1], 10) : NaN;

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function extractNumberNear(
  text: string,
  pattern: RegExp,
): number | undefined {
  const match = text.match(pattern);
  const value = match?.[1] ? Number.parseInt(match[1], 10) : NaN;

  return Number.isFinite(value) ? value : undefined;
}

function getUsernameFromUrl(url: string): string | undefined {
  const cleanedUrl = url.replace(/\/+$/g, "");
  const username = cleanedUrl.split("/").filter(Boolean).pop();

  return username && !["in", "u", "profile"].includes(username)
    ? username
    : undefined;
}

function roundScore(score: number): number {
  return Math.round(score * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
