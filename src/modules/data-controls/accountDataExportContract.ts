import type { ParsedResumeProfile } from "@/lib/parser/profileBuilder";
import type {
  CareerRoadmap,
  RoadmapPhase,
  RoadmapTask,
} from "@/intelligence/core/careerRoadmap";
import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type {
  ResumeImprovementItem,
  ResumeImprovementPlan,
} from "@/intelligence/core/resumeImprovement";
import type {
  ResumeRewritePlan,
  ResumeRewriteSuggestion,
} from "@/intelligence/core/resumeRewrite";
import type {
  Certification,
  CodingProfile,
  GithubProfile,
  LinkedinProfile,
  ProfileAnalysisFlags,
  UserProfile,
} from "@/intelligence/types/profile";
import type {
  AccountExportTableName,
  BetaFeedbackExportRow,
  JobMatchExportRow,
  ProfileExportRow,
  ResumeAnalysisExportRow,
} from "@/modules/data-controls/types";

export type AccountExportCardinality = "zero_or_one" | "zero_or_many";
export type AccountExportPagination = "none" | "id_keyset" | "count_only";

export type AccountExportReconstructionResult<T> =
  | { ok: true; value: T }
  | { ok: false };

type SupportedAccountExportTableName = Exclude<
  AccountExportTableName,
  "career_snapshots"
>;

export type AccountExportTableContract<T> = {
  tableName: AccountExportTableName;
  ownerColumn: "id" | "user_id";
  cardinality: AccountExportCardinality;
  selectedColumns: string;
  primaryKey: "id";
  pagination: AccountExportPagination;
  internalFieldsExcluded: readonly string[];
  reconstructRow: ((value: unknown) => AccountExportReconstructionResult<T>) | null;
};

export const ACCOUNT_EXPORT_TABLE_ORDER = [
  "profiles",
  "resume_analyses",
  "job_matches",
  "career_snapshots",
  "beta_feedback",
] as const satisfies readonly AccountExportTableName[];

export const ACCOUNT_EXPORT_TABLE_CONTRACTS = {
  profiles: {
    tableName: "profiles",
    ownerColumn: "id",
    cardinality: "zero_or_one",
    selectedColumns:
      "id,full_name,email,career_goal,target_role,created_at,updated_at",
    primaryKey: "id",
    pagination: "none",
    internalFieldsExcluded: ["id"],
    reconstructRow: reconstructProfileExportRow,
  },
  resume_analyses: {
    tableName: "resume_analyses",
    ownerColumn: "user_id",
    cardinality: "zero_or_many",
    selectedColumns:
      "id,user_id,file_name,file_type,extracted_text,parsed_profile,user_profile,created_at",
    primaryKey: "id",
    pagination: "id_keyset",
    internalFieldsExcluded: ["user_id"],
    reconstructRow: reconstructResumeAnalysisExportRow,
  },
  job_matches: {
    tableName: "job_matches",
    ownerColumn: "user_id",
    cardinality: "zero_or_many",
    selectedColumns:
      "id,user_id,job_title,company_name,job_description,match_result,improvement_plan,rewrite_plan,roadmap,created_at",
    primaryKey: "id",
    pagination: "id_keyset",
    internalFieldsExcluded: ["user_id"],
    reconstructRow: reconstructJobMatchExportRow,
  },
  career_snapshots: {
    tableName: "career_snapshots",
    ownerColumn: "user_id",
    cardinality: "zero_or_many",
    selectedColumns: "id",
    primaryKey: "id",
    pagination: "count_only",
    internalFieldsExcluded: ["user_id"],
    reconstructRow: null,
  },
  beta_feedback: {
    tableName: "beta_feedback",
    ownerColumn: "user_id",
    cardinality: "zero_or_many",
    selectedColumns:
      "id,user_id,feedback_type,sentiment,message,page_path,created_at",
    primaryKey: "id",
    pagination: "id_keyset",
    internalFieldsExcluded: ["user_id", "status"],
    reconstructRow: reconstructBetaFeedbackExportRow,
  },
} as const satisfies Record<
  AccountExportTableName,
  AccountExportTableContract<unknown>
>;

export const SUPPORTED_ACCOUNT_EXPORT_TABLES = [
  "profiles",
  "resume_analyses",
  "job_matches",
  "beta_feedback",
] as const satisfies readonly SupportedAccountExportTableName[];

export function reconstructProfileExportRow(
  value: unknown,
): AccountExportReconstructionResult<ProfileExportRow> {
  return reconstruct(() => {
    const row = requireRecord(value);
    return {
      full_name: requireNullableString(row, "full_name"),
      email: requireNullableString(row, "email"),
      career_goal: requireNullableString(row, "career_goal"),
      target_role: requireNullableString(row, "target_role"),
      created_at: requireIsoTimestamp(row, "created_at"),
      updated_at: requireIsoTimestamp(row, "updated_at"),
    };
  });
}

export function reconstructResumeAnalysisExportRow(
  value: unknown,
): AccountExportReconstructionResult<ResumeAnalysisExportRow> {
  return reconstruct(() => {
    const row = requireRecord(value);
    return {
      id: requireUuid(row, "id"),
      file_name: requireString(row, "file_name"),
      file_type: requireString(row, "file_type"),
      extracted_text: requireNullableString(row, "extracted_text"),
      parsed_profile: requireNullableNested(
        row,
        "parsed_profile",
        reconstructParsedResumeProfile,
      ),
      user_profile: requireNullableNested(
        row,
        "user_profile",
        reconstructUserProfile,
      ),
      created_at: requireIsoTimestamp(row, "created_at"),
    };
  });
}

export function reconstructJobMatchExportRow(
  value: unknown,
): AccountExportReconstructionResult<JobMatchExportRow> {
  return reconstruct(() => {
    const row = requireRecord(value);
    return {
      id: requireUuid(row, "id"),
      job_title: requireNullableString(row, "job_title"),
      company_name: requireNullableString(row, "company_name"),
      job_description: requireString(row, "job_description"),
      match_result: requireNullableNested(
        row,
        "match_result",
        reconstructJobDescriptionMatchResult,
      ),
      improvement_plan: requireNullableNested(
        row,
        "improvement_plan",
        reconstructResumeImprovementPlan,
      ),
      rewrite_plan: requireNullableNested(
        row,
        "rewrite_plan",
        reconstructResumeRewritePlan,
      ),
      roadmap: requireNullableNested(row, "roadmap", reconstructCareerRoadmap),
      created_at: requireIsoTimestamp(row, "created_at"),
    };
  });
}

export function reconstructBetaFeedbackExportRow(
  value: unknown,
): AccountExportReconstructionResult<BetaFeedbackExportRow> {
  return reconstruct(() => {
    const row = requireRecord(value);
    return {
      id: requireUuid(row, "id"),
      feedback_type: requireEnum(row, "feedback_type", [
        "bug",
        "confusion",
        "ui",
        "idea",
        "other",
      ] as const),
      sentiment: requireEnum(row, "sentiment", [
        "negative",
        "neutral",
        "positive",
      ] as const),
      message: requireString(row, "message"),
      page_path: requireNullableString(row, "page_path"),
      created_at: requireIsoTimestamp(row, "created_at"),
    };
  });
}

export function getUuidComparisonKey(value: string): string {
  return value.toLowerCase();
}

export function isUuidShapedAccountExportId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(value);
}

export function isValidAccountExportTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return false;
  }

  return day <= getDaysInMonth(year, month);
}

export function reconstructParsedResumeProfileContractValue(
  value: unknown,
): AccountExportReconstructionResult<ParsedResumeProfile> {
  return reconstruct(() => reconstructParsedResumeProfile(value));
}

export function reconstructUserProfileContractValue(
  value: unknown,
): AccountExportReconstructionResult<UserProfile> {
  return reconstruct(() => reconstructUserProfile(value));
}

export function reconstructJobDescriptionMatchResultContractValue(
  value: unknown,
): AccountExportReconstructionResult<JobDescriptionMatchResult> {
  return reconstruct(() => reconstructJobDescriptionMatchResult(value));
}

export function reconstructResumeImprovementPlanContractValue(
  value: unknown,
): AccountExportReconstructionResult<ResumeImprovementPlan> {
  return reconstruct(() => reconstructResumeImprovementPlan(value));
}

export function reconstructResumeRewritePlanContractValue(
  value: unknown,
): AccountExportReconstructionResult<ResumeRewritePlan> {
  return reconstruct(() => reconstructResumeRewritePlan(value));
}

export function reconstructCareerRoadmapContractValue(
  value: unknown,
): AccountExportReconstructionResult<CareerRoadmap> {
  return reconstruct(() => reconstructCareerRoadmap(value));
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function reconstructParsedResumeProfile(value: unknown): ParsedResumeProfile {
  const profile = requireExactRecord(value, [
    "skills",
    "projects",
    "education",
    "experience",
    "certifications",
    "links",
    "rawSections",
  ]);
  const links = requireExactRecord(profile.links, [
    "github",
    "linkedin",
    "portfolio",
    "leetcode",
    "codeforces",
    "email",
    "phone",
  ]);
  const rawSections = requireExactRecord(profile.rawSections, [
    "skills",
    "projects",
    "education",
    "experience",
    "certifications",
  ]);

  return {
    skills: requireStringArrayValue(profile.skills),
    projects: requireStringArrayValue(profile.projects),
    education: requireStringArrayValue(profile.education),
    experience: requireStringArrayValue(profile.experience),
    certifications: requireStringArrayValue(profile.certifications),
    links: {
      ...optionalStringProperty(links, "github"),
      ...optionalStringProperty(links, "linkedin"),
      ...optionalStringProperty(links, "portfolio"),
      ...optionalStringProperty(links, "leetcode"),
      ...optionalStringProperty(links, "codeforces"),
      ...optionalStringProperty(links, "email"),
      ...optionalStringProperty(links, "phone"),
    },
    rawSections: {
      ...optionalStringProperty(rawSections, "skills"),
      ...optionalStringProperty(rawSections, "projects"),
      ...optionalStringProperty(rawSections, "education"),
      ...optionalStringProperty(rawSections, "experience"),
      ...optionalStringProperty(rawSections, "certifications"),
    },
  };
}

function reconstructUserProfile(value: unknown): UserProfile {
  const profile = requireExactRecord(value, [
    "resumeScore",
    "skillsScore",
    "projectsScore",
    "experienceScore",
    "educationScore",
    "githubScore",
    "linkedinScore",
    "atsScore",
    "recruiterScore",
    "activityScore",
    "skills",
    "projects",
    "experience",
    "education",
    "certifications",
    "codingProfiles",
    "github",
    "linkedin",
    "hackathons",
    "openSourceScore",
    "leadershipScore",
    "achievementScore",
    "researchScore",
    "analysisFlags",
  ]);

  return {
    resumeScore: requireFiniteNumber(profile.resumeScore),
    skillsScore: requireFiniteNumber(profile.skillsScore),
    projectsScore: requireFiniteNumber(profile.projectsScore),
    experienceScore: requireFiniteNumber(profile.experienceScore),
    educationScore: requireFiniteNumber(profile.educationScore),
    githubScore: requireFiniteNumber(profile.githubScore),
    linkedinScore: requireFiniteNumber(profile.linkedinScore),
    atsScore: requireFiniteNumber(profile.atsScore),
    recruiterScore: requireFiniteNumber(profile.recruiterScore),
    activityScore: requireFiniteNumber(profile.activityScore),
    skills: requireStringArrayValue(profile.skills),
    projects: requireStringArrayValue(profile.projects),
    experience: requireStringArrayValue(profile.experience),
    education: requireStringValue(profile.education),
    certifications: requireArray(profile.certifications).map(reconstructCertification),
    codingProfiles: requireArray(profile.codingProfiles).map(reconstructCodingProfile),
    ...optionalNestedProperty(profile, "github", reconstructGithubProfile),
    ...optionalNestedProperty(profile, "linkedin", reconstructLinkedinProfile),
    ...optionalNumberProperty(profile, "hackathons"),
    ...optionalNumberProperty(profile, "openSourceScore"),
    ...optionalNumberProperty(profile, "leadershipScore"),
    ...optionalNumberProperty(profile, "achievementScore"),
    ...optionalNumberProperty(profile, "researchScore"),
    ...optionalNestedProperty(
      profile,
      "analysisFlags",
      reconstructProfileAnalysisFlags,
    ),
  };
}

function reconstructCertification(value: unknown): Certification {
  const item = requireExactRecord(value, ["name", "issuer", "tier", "verified"]);
  return {
    name: requireStringValue(item.name),
    issuer: requireStringValue(item.issuer),
    tier: requireEnumValue(item.tier, ["S", "A", "B", "C", "D"] as const),
    ...optionalBooleanProperty(item, "verified"),
  };
}

function reconstructCodingProfile(value: unknown): CodingProfile {
  const item = requireExactRecord(value, [
    "platform",
    "username",
    "solved",
    "rating",
    "contestRating",
    "hardSolved",
    "mediumSolved",
    "easySolved",
    "url",
  ]);
  return {
    platform: requireEnumValue(item.platform, [
      "leetcode",
      "codeforces",
      "codechef",
      "hackerrank",
      "hackerearth",
      "atcoder",
    ] as const),
    ...optionalStringProperty(item, "username"),
    ...optionalNumberProperty(item, "solved"),
    ...optionalNumberProperty(item, "rating"),
    ...optionalNumberProperty(item, "contestRating"),
    ...optionalNumberProperty(item, "hardSolved"),
    ...optionalNumberProperty(item, "mediumSolved"),
    ...optionalNumberProperty(item, "easySolved"),
    ...optionalStringProperty(item, "url"),
  };
}

function reconstructGithubProfile(value: unknown): GithubProfile {
  const item = requireExactRecord(value, [
    "url",
    "repositories",
    "stars",
    "followers",
    "openSourceContributions",
  ]);
  return {
    ...optionalStringProperty(item, "url"),
    repositories: requireFiniteNumber(item.repositories),
    stars: requireFiniteNumber(item.stars),
    followers: requireFiniteNumber(item.followers),
    openSourceContributions: requireFiniteNumber(item.openSourceContributions),
  };
}

function reconstructLinkedinProfile(value: unknown): LinkedinProfile {
  const item = requireExactRecord(value, [
    "url",
    "connections",
    "hasHeadline",
    "hasAbout",
    "hasFeatured",
  ]);
  return {
    ...optionalStringProperty(item, "url"),
    ...optionalNumberProperty(item, "connections"),
    hasHeadline: requireBooleanValue(item.hasHeadline),
    hasAbout: requireBooleanValue(item.hasAbout),
    hasFeatured: requireBooleanValue(item.hasFeatured),
  };
}

function reconstructProfileAnalysisFlags(value: unknown): ProfileAnalysisFlags {
  const flags = requireExactRecord(value, [
    "hasMeasurableImpact",
    "hasSectionClarity",
    "hasProofLink",
    "hasGenericProjects",
    "isPlaceholderText",
  ]);
  return {
    hasMeasurableImpact: requireBooleanValue(flags.hasMeasurableImpact),
    hasSectionClarity: requireBooleanValue(flags.hasSectionClarity),
    hasProofLink: requireBooleanValue(flags.hasProofLink),
    hasGenericProjects: requireBooleanValue(flags.hasGenericProjects),
    isPlaceholderText: requireBooleanValue(flags.isPlaceholderText),
  };
}

function reconstructJobDescriptionMatchResult(
  value: unknown,
): JobDescriptionMatchResult {
  const result = requireExactRecord(value, [
    "matchScore",
    "verdict",
    "brutalReality",
    "matchedSkills",
    "missingSkills",
    "missingKeywords",
    "strengths",
    "weaknesses",
    "recommendations",
  ]);
  return {
    matchScore: requireFiniteNumber(result.matchScore),
    verdict: requireStringValue(result.verdict),
    brutalReality: requireStringValue(result.brutalReality),
    matchedSkills: requireStringArrayValue(result.matchedSkills),
    missingSkills: requireStringArrayValue(result.missingSkills),
    missingKeywords: requireStringArrayValue(result.missingKeywords),
    strengths: requireStringArrayValue(result.strengths),
    weaknesses: requireStringArrayValue(result.weaknesses),
    recommendations: requireStringArrayValue(result.recommendations),
  };
}

function reconstructResumeImprovementPlan(value: unknown): ResumeImprovementPlan {
  const plan = requireExactRecord(value, [
    "readiness",
    "summary",
    "priorityFixes",
    "keywordAdditions",
    "projectSuggestions",
    "proofGaps",
    "sectionFixes",
    "beforeApplyChecklist",
  ]);
  return {
    readiness: requireEnumValue(plan.readiness, [
      "Apply now",
      "Tailor before applying",
      "Improve first",
    ] as const),
    summary: requireStringValue(plan.summary),
    priorityFixes: requireArray(plan.priorityFixes).map(reconstructImprovementItem),
    keywordAdditions: requireStringArrayValue(plan.keywordAdditions),
    projectSuggestions: requireStringArrayValue(plan.projectSuggestions),
    proofGaps: requireStringArrayValue(plan.proofGaps),
    sectionFixes: requireStringArrayValue(plan.sectionFixes),
    beforeApplyChecklist: requireStringArrayValue(plan.beforeApplyChecklist),
  };
}

function reconstructImprovementItem(value: unknown): ResumeImprovementItem {
  const item = requireExactRecord(value, [
    "title",
    "reason",
    "action",
    "priority",
    "impact",
    "category",
  ]);
  return {
    title: requireStringValue(item.title),
    reason: requireStringValue(item.reason),
    action: requireStringValue(item.action),
    priority: requireEnumValue(item.priority, ["High", "Medium", "Low"] as const),
    impact: requireEnumValue(item.impact, ["High", "Medium", "Low"] as const),
    category: requireEnumValue(item.category, [
      "Skills",
      "Projects",
      "Experience",
      "ATS",
      "Proof",
      "Keywords",
      "Links",
      "Certifications",
    ] as const),
  };
}

function reconstructResumeRewritePlan(value: unknown): ResumeRewritePlan {
  const plan = requireExactRecord(value, [
    "headline",
    "summaryRewrite",
    "skillsRewrite",
    "projectRewrites",
    "experienceRewrites",
    "finalWarnings",
  ]);
  return {
    headline: requireStringValue(plan.headline),
    summaryRewrite: reconstructRewriteSuggestion(plan.summaryRewrite),
    skillsRewrite: reconstructRewriteSuggestion(plan.skillsRewrite),
    projectRewrites: requireArray(plan.projectRewrites).map(
      reconstructRewriteSuggestion,
    ),
    experienceRewrites: requireArray(plan.experienceRewrites).map(
      reconstructRewriteSuggestion,
    ),
    finalWarnings: requireStringArrayValue(plan.finalWarnings),
  };
}

function reconstructRewriteSuggestion(value: unknown): ResumeRewriteSuggestion {
  const suggestion = requireExactRecord(value, [
    "section",
    "title",
    "weakExample",
    "improvedExample",
    "whyBetter",
    "evidenceNeeded",
    "caution",
  ]);
  return {
    section: requireEnumValue(suggestion.section, [
      "Summary",
      "Skills",
      "Projects",
      "Experience",
      "Certifications",
      "Links",
    ] as const),
    title: requireStringValue(suggestion.title),
    weakExample: requireStringValue(suggestion.weakExample),
    improvedExample: requireStringValue(suggestion.improvedExample),
    whyBetter: requireStringValue(suggestion.whyBetter),
    evidenceNeeded: requireStringArrayValue(suggestion.evidenceNeeded),
    caution: requireStringValue(suggestion.caution),
  };
}

function reconstructCareerRoadmap(value: unknown): CareerRoadmap {
  const roadmap = requireExactRecord(value, [
    "targetRole",
    "readiness",
    "brutalSummary",
    "currentBlockers",
    "thirtyDayPlan",
    "sixtyDayPlan",
    "ninetyDayPlan",
    "weeklyMissions",
    "projectRoadmap",
    "skillRoadmap",
    "applicationStrategy",
  ]);
  return {
    targetRole: requireStringValue(roadmap.targetRole),
    readiness: requireEnumValue(roadmap.readiness, [
      "Not ready",
      "Getting ready",
      "Apply selectively",
      "Ready to apply",
    ] as const),
    brutalSummary: requireStringValue(roadmap.brutalSummary),
    currentBlockers: requireStringArrayValue(roadmap.currentBlockers),
    thirtyDayPlan: reconstructRoadmapPhase(roadmap.thirtyDayPlan),
    sixtyDayPlan: reconstructRoadmapPhase(roadmap.sixtyDayPlan),
    ninetyDayPlan: reconstructRoadmapPhase(roadmap.ninetyDayPlan),
    weeklyMissions: requireArray(roadmap.weeklyMissions).map(reconstructRoadmapTask),
    projectRoadmap: requireArray(roadmap.projectRoadmap).map(reconstructRoadmapTask),
    skillRoadmap: requireArray(roadmap.skillRoadmap).map(reconstructRoadmapTask),
    applicationStrategy: requireStringArrayValue(roadmap.applicationStrategy),
  };
}

function reconstructRoadmapPhase(value: unknown): RoadmapPhase {
  const phase = requireExactRecord(value, ["title", "goal", "tasks"]);
  return {
    title: requireStringValue(phase.title),
    goal: requireStringValue(phase.goal),
    tasks: requireArray(phase.tasks).map(reconstructRoadmapTask),
  };
}

function reconstructRoadmapTask(value: unknown): RoadmapTask {
  const task = requireExactRecord(value, [
    "title",
    "reason",
    "action",
    "category",
    "priority",
    "estimatedTime",
  ]);
  return {
    title: requireStringValue(task.title),
    reason: requireStringValue(task.reason),
    action: requireStringValue(task.action),
    category: requireEnumValue(task.category, [
      "Skills",
      "Projects",
      "Resume",
      "ATS",
      "GitHub",
      "Portfolio",
      "Applications",
      "Interview",
    ] as const),
    priority: requireEnumValue(task.priority, ["High", "Medium", "Low"] as const),
    estimatedTime: requireStringValue(task.estimatedTime),
  };
}

function reconstruct<T>(builder: () => T): AccountExportReconstructionResult<T> {
  try {
    return { ok: true, value: builder() };
  } catch {
    return { ok: false };
  }
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidContractValueError();
  }
  return value as Record<string, unknown>;
}

function requireExactRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  const record = requireRecord(value);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      // Sensitive-key normalization is deliberately location-aware. All
      // undeclared nested keys fail, with sensitive variants covered too.
      throw isSensitiveUnexpectedKey(key)
        ? new SensitiveContractValueError()
        : new InvalidContractValueError();
    }
  }
  return record;
}

function isSensitiveUnexpectedKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return new Set([
    "accesstoken",
    "refreshtoken",
    "authorization",
    "bearer",
    "jwt",
    "apikey",
    "anonkey",
    "servicerolekey",
    "cookie",
    "cookies",
    "session",
    "password",
    "secret",
    "clientsecret",
    "privatekey",
    "rawprovidererror",
    "stacktrace",
    "proto",
    "prototype",
    "constructor",
    "userid",
    "accountid",
    "ownerid",
  ]).has(normalized);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
): string {
  requireOwnProperty(record, key);
  return requireStringValue(record[key]);
}

function requireNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  requireOwnProperty(record, key);
  const value = record[key];
  if (value === null) return null;
  return requireStringValue(value);
}

function requireUuid(record: Record<string, unknown>, key: string): string {
  requireOwnProperty(record, key);
  const value = record[key];
  if (!isUuidShapedAccountExportId(value)) {
    throw new InvalidContractValueError();
  }
  return value;
}

function requireIsoTimestamp(
  record: Record<string, unknown>,
  key: string,
): string {
  requireOwnProperty(record, key);
  const value = record[key];
  if (!isValidAccountExportTimestamp(value)) {
    throw new InvalidContractValueError();
  }
  return value;
}

function requireNullableNested<T>(
  record: Record<string, unknown>,
  key: string,
  builder: (value: unknown) => T,
): T | null {
  requireOwnProperty(record, key);
  return record[key] === null ? null : builder(record[key]);
}

function requireEnum<const T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  values: T,
): T[number] {
  requireOwnProperty(record, key);
  return requireEnumValue(record[key], values);
}

function requireEnumValue<const T extends readonly string[]>(
  value: unknown,
  values: T,
): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new InvalidContractValueError();
  }
  return value as T[number];
}

function requireStringValue(value: unknown): string {
  if (typeof value !== "string") throw new InvalidContractValueError();
  return value;
}

function requireFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidContractValueError();
  }
  return value;
}

function requireBooleanValue(value: unknown): boolean {
  if (typeof value !== "boolean") throw new InvalidContractValueError();
  return value;
}

function requireArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new InvalidContractValueError();
  return value;
}

function requireStringArrayValue(value: unknown): string[] {
  return requireArray(value).map(requireStringValue);
}

function optionalStringProperty(
  record: Record<string, unknown>,
  key: string,
): Record<string, string> {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return {};
  return { [key]: requireStringValue(record[key]) };
}

function optionalNumberProperty(
  record: Record<string, unknown>,
  key: string,
): Record<string, number> {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return {};
  return { [key]: requireFiniteNumber(record[key]) };
}

function optionalBooleanProperty(
  record: Record<string, unknown>,
  key: string,
): Record<string, boolean> {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return {};
  return { [key]: requireBooleanValue(record[key]) };
}

function optionalNestedProperty<T>(
  record: Record<string, unknown>,
  key: string,
  builder: (value: unknown) => T,
): Record<string, T> {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return {};
  return { [key]: builder(record[key]) };
}

function requireOwnProperty(record: Record<string, unknown>, key: string) {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    throw new InvalidContractValueError();
  }
}

class InvalidContractValueError extends Error {}
class SensitiveContractValueError extends InvalidContractValueError {}
