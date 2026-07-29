"use client";

import {
  RESUME_COMPARISON_FLAG_TYPES,
  RESUME_COMPARISON_LINK_TYPES,
  validateResumeComparisonEvidence,
  type ResumeComparisonEvidenceInput,
  type ValidatedResumeComparisonEvidence,
} from "@/modules/resume/domain/resumeComparison";
import {
  authenticateResumeOwner,
  confirmResumeOwner,
  hasExactKeys,
  isRecord,
  isUuid,
  isValidTimestamp,
  type ResumeSupabaseClient,
} from "@/modules/resume/services/resumeRepositorySupport";
import type { ResumeAnalysisRepositoryOptions } from "@/modules/resume/types";

export const RESUME_COMPARISON_PAGE_SIZE = 10;
const RESUME_COMPARISON_PAIR_COLUMNS =
  "id, user_id, file_name, created_at, comparison_skills:parsed_profile->skills, comparison_projects:parsed_profile->projects, comparison_experience:parsed_profile->experience, comparison_certifications:parsed_profile->certifications, link_github:parsed_profile->links->github, link_linkedin:parsed_profile->links->linkedin, link_portfolio:parsed_profile->links->portfolio, link_leetcode:parsed_profile->links->leetcode, link_codeforces:parsed_profile->links->codeforces, flag_has_measurable_impact:user_profile->analysisFlags->hasMeasurableImpact, flag_has_section_clarity:user_profile->analysisFlags->hasSectionClarity, flag_has_proof_link:user_profile->analysisFlags->hasProofLink, flag_has_generic_projects:user_profile->analysisFlags->hasGenericProjects, flag_is_placeholder_text:user_profile->analysisFlags->isPlaceholderText";
const RESUME_COMPARISON_PAGE_COLUMNS =
  "id, user_id, file_name, created_at";
const RESUME_COMPARISON_PAGE_QUERY_LIMIT =
  RESUME_COMPARISON_PAGE_SIZE + 1;
const PAIR_QUERY_LIMIT = 3;
const CURSOR_KEYS = ["createdAt", "id"] as const;
const PAIR_ROW_KEYS = [
  "id",
  "user_id",
  "file_name",
  "created_at",
  "comparison_skills",
  "comparison_projects",
  "comparison_experience",
  "comparison_certifications",
  "link_github",
  "link_linkedin",
  "link_portfolio",
  "link_leetcode",
  "link_codeforces",
  "flag_has_measurable_impact",
  "flag_has_section_clarity",
  "flag_has_proof_link",
  "flag_has_generic_projects",
  "flag_is_placeholder_text",
] as const;
const PAIR_EVIDENCE_ROW_KEYS = PAIR_ROW_KEYS.slice(4);
const PAGE_ROW_KEYS = [
  "id",
  "user_id",
  "file_name",
  "created_at",
] as const;
const COMPARISON_IDENTITY_MESSAGES = {
  unauthenticated: "Sign in to compare saved resume analyses.",
  accountChanged:
    "Your account changed while saved resume analyses were loading.",
} as const;

export type ResumeComparisonRepositoryErrorCode =
  | "unauthenticated"
  | "invalid_pair"
  | "duplicate_source"
  | "invalid_cursor"
  | "source_missing"
  | "malformed_source"
  | "owner_changed"
  | "repository_failure";

export type ResumeComparisonRepositoryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      code: ResumeComparisonRepositoryErrorCode;
      error: string;
    };

export type ResumeComparisonAnalysisPair = {
  sourceA: ValidatedResumeComparisonEvidence;
  sourceB: ValidatedResumeComparisonEvidence;
};

export type ResumeAnalysisPageCursor = {
  createdAt: string;
  id: string;
};

export type ResumeAnalysisPageItem = {
  id: string;
  fileName: string;
  savedAt: string;
  versionStatus: "not_recorded";
};

export type ResumeAnalysisPage = {
  items: ResumeAnalysisPageItem[];
  hasNext: boolean;
  nextCursor: ResumeAnalysisPageCursor | null;
};

export async function resolveCurrentUserResumeAnalysisPair(
  sourceIds: readonly string[],
  options: ResumeAnalysisRepositoryOptions = {},
): Promise<
  ResumeComparisonRepositoryResult<ResumeComparisonAnalysisPair>
> {
  if (!Array.isArray(sourceIds) || sourceIds.length !== 2) {
    return comparisonFailure(
      "invalid_pair",
      "Choose exactly two saved resume analyses.",
    );
  }

  const [sourceAId, sourceBId] = sourceIds;
  if (!isUuid(sourceAId) || !isUuid(sourceBId)) {
    return comparisonFailure(
      "invalid_pair",
      "One or more saved resume analysis identifiers are invalid.",
    );
  }
  if (normalizeUuid(sourceAId) === normalizeUuid(sourceBId)) {
    return comparisonFailure(
      "duplicate_source",
      "Choose two different saved resume analyses.",
    );
  }

  const authResult = await authenticateResumeOwner(
    options.expectedUserId,
    COMPARISON_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return mapIdentityFailure(authResult);
  }

  const { supabase, user } = authResult.data;
  let response: Awaited<ReturnType<typeof executePairRead>>;
  try {
    response = await executePairRead(
      supabase,
      user.id,
      [sourceAId, sourceBId],
    );
  } catch {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      "Could not load the selected saved resume analyses.",
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    COMPARISON_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return mapIdentityFailure(finalIdentity);
  }

  if (response.error) {
    return comparisonFailure(
      "repository_failure",
      "Could not load the selected saved resume analyses.",
    );
  }
  if (!Array.isArray(response.data)) {
    return comparisonFailure(
      "malformed_source",
      "Saved resume analyses returned an invalid response.",
    );
  }
  if (response.data.length < 2) {
    return comparisonFailure(
      "source_missing",
      "One or more selected saved resume analyses are unavailable.",
    );
  }
  if (response.data.length > 2) {
    return comparisonFailure(
      "malformed_source",
      "Saved resume analyses returned an invalid response.",
    );
  }

  const requestedIds = new Set([
    normalizeUuid(sourceAId),
    normalizeUuid(sourceBId),
  ]);
  const analysesById = new Map<
    string,
    ValidatedResumeComparisonEvidence
  >();

  for (const row of response.data) {
    const analysis = parseResumeComparisonPairRow(row);
    if (!analysis || analysis.ownerId !== user.id) {
      return comparisonFailure(
        "malformed_source",
        "Saved resume analyses returned invalid account-owned sources.",
      );
    }

    const normalizedId = normalizeUuid(analysis.id);
    if (
      !requestedIds.has(normalizedId) ||
      analysesById.has(normalizedId)
    ) {
      return comparisonFailure(
        "malformed_source",
        "Saved resume analyses returned unexpected sources.",
      );
    }
    analysesById.set(
      normalizedId,
      validateResumeComparisonEvidence(toEvidenceInput(analysis)),
    );
  }

  const sourceA = analysesById.get(normalizeUuid(sourceAId));
  const sourceB = analysesById.get(normalizeUuid(sourceBId));
  if (!sourceA || !sourceB) {
    return comparisonFailure(
      "source_missing",
      "One or more selected saved resume analyses are unavailable.",
    );
  }

  return {
    ok: true,
    data: {
      sourceA,
      sourceB,
    },
  };
}

export async function listCurrentUserResumeAnalysisPage(
  cursor: ResumeAnalysisPageCursor | null = null,
  options: ResumeAnalysisRepositoryOptions = {},
): Promise<ResumeComparisonRepositoryResult<ResumeAnalysisPage>> {
  if (cursor !== null && !isValidPageCursor(cursor)) {
    return comparisonFailure(
      "invalid_cursor",
      "The saved resume history cursor is invalid.",
    );
  }

  const authResult = await authenticateResumeOwner(
    options.expectedUserId,
    COMPARISON_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return mapIdentityFailure(authResult);
  }

  const { supabase, user } = authResult.data;
  let response: Awaited<ReturnType<typeof executePageRead>>;
  try {
    response = await executePageRead(
      supabase,
      user.id,
      cursor,
    );
  } catch {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      "Could not load saved resume history.",
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    COMPARISON_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return mapIdentityFailure(finalIdentity);
  }

  if (response.error) {
    return comparisonFailure(
      "repository_failure",
      "Could not load saved resume history.",
    );
  }
  if (
    !Array.isArray(response.data) ||
    response.data.length > RESUME_COMPARISON_PAGE_QUERY_LIMIT
  ) {
    return comparisonFailure(
      "malformed_source",
      "Saved resume history returned an invalid response.",
    );
  }

  const analyses: ResumeComparisonPageRow[] = [];
  const seenIds = new Set<string>();

  for (const row of response.data) {
    const analysis = parseResumeComparisonPageRow(row);
    if (!analysis || analysis.ownerId !== user.id) {
      return comparisonFailure(
        "malformed_source",
        "Saved resume history returned invalid account-owned sources.",
      );
    }

    const normalizedId = normalizeUuid(analysis.id);
    if (seenIds.has(normalizedId)) {
      return comparisonFailure(
        "malformed_source",
        "Saved resume history returned duplicate sources.",
      );
    }
    if (
      cursor &&
      !isStrictlyAfterCursor(analysis, cursor)
    ) {
      return comparisonFailure(
        "malformed_source",
        "Saved resume history returned sources outside the requested page.",
      );
    }

    const previous = analyses[analyses.length - 1];
    if (previous && compareHistoryOrder(previous, analysis) >= 0) {
      return comparisonFailure(
        "malformed_source",
        "Saved resume history returned sources in an invalid order.",
      );
    }

    seenIds.add(normalizedId);
    analyses.push(analysis);
  }

  const hasNext =
    analyses.length === RESUME_COMPARISON_PAGE_QUERY_LIMIT;
  const pageAnalyses = analyses.slice(0, RESUME_COMPARISON_PAGE_SIZE);
  const lastPageAnalysis = pageAnalyses[pageAnalyses.length - 1];

  return {
    ok: true,
    data: {
      items: pageAnalyses.map(toPageItem),
      hasNext,
      nextCursor: hasNext && lastPageAnalysis
        ? {
            createdAt: lastPageAnalysis.createdAt,
            id: lastPageAnalysis.id,
          }
        : null,
    },
  };
}

async function executePairRead(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  sourceIds: readonly [string, string],
) {
  return supabase
    .from("resume_analyses")
    .select(RESUME_COMPARISON_PAIR_COLUMNS)
    .eq("user_id", ownerId)
    .in("id", [...sourceIds])
    .limit(PAIR_QUERY_LIMIT);
}

async function executePageRead(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  cursor: ResumeAnalysisPageCursor | null,
) {
  let query = supabase
    .from("resume_analyses")
    .select(RESUME_COMPARISON_PAGE_COLUMNS)
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(RESUME_COMPARISON_PAGE_QUERY_LIMIT);

  if (cursor) {
    query = query.or(
      `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.gt.${cursor.id})`,
    );
  }

  return query;
}

function isValidPageCursor(
  value: unknown,
): value is ResumeAnalysisPageCursor {
  return isRecord(value) &&
    hasExactKeys(value, CURSOR_KEYS) &&
    timestampOrderKey(value.createdAt) !== null &&
    isUuid(value.id);
}

function isStrictlyAfterCursor(
  analysis: ResumeComparisonPageRow,
  cursor: ResumeAnalysisPageCursor,
): boolean {
  const cursorOrder = timestampOrderKey(cursor.createdAt);
  if (cursorOrder === null) {
    return false;
  }

  return analysis.createdAtOrder < cursorOrder ||
    (
      analysis.createdAtOrder === cursorOrder &&
      normalizeUuid(analysis.id) > normalizeUuid(cursor.id)
    );
}

function compareHistoryOrder(
  left: ResumeComparisonPageRow,
  right: ResumeComparisonPageRow,
): number {
  if (left.createdAtOrder !== right.createdAtOrder) {
    return left.createdAtOrder > right.createdAtOrder ? -1 : 1;
  }

  return compareStrings(
    normalizeUuid(left.id),
    normalizeUuid(right.id),
  );
}

function toPageItem(
  analysis: ResumeComparisonPageRow,
): ResumeAnalysisPageItem {
  return {
    id: analysis.id,
    fileName: analysis.fileName,
    savedAt: analysis.createdAt,
    versionStatus: "not_recorded",
  };
}

type ResumeComparisonPairRow = {
  id: string;
  ownerId: string;
  fileName: string;
  createdAt: string;
  skills: unknown;
  projects: unknown;
  experience: unknown;
  certifications: unknown;
  linkGithub: unknown;
  linkLinkedin: unknown;
  linkPortfolio: unknown;
  linkLeetcode: unknown;
  linkCodeforces: unknown;
  flagHasMeasurableImpact: unknown;
  flagHasSectionClarity: unknown;
  flagHasProofLink: unknown;
  flagHasGenericProjects: unknown;
  flagIsPlaceholderText: unknown;
};

type ResumeComparisonPageRow = {
  id: string;
  ownerId: string;
  fileName: string;
  createdAt: string;
  createdAtOrder: bigint;
};

function parseResumeComparisonPairRow(
  value: unknown,
): ResumeComparisonPairRow | null {
  const createdAtOrder = isRecord(value)
    ? timestampOrderKey(value.created_at)
    : null;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, PAIR_ROW_KEYS) ||
    !isUuid(value.id) ||
    !isUuid(value.user_id) ||
    typeof value.file_name !== "string" ||
    !isValidTimestamp(value.created_at) ||
    createdAtOrder === null ||
    PAIR_EVIDENCE_ROW_KEYS.some((key) => value[key] === undefined)
  ) {
    return null;
  }

  return {
    id: value.id,
    ownerId: value.user_id,
    fileName: value.file_name,
    createdAt: value.created_at,
    skills: value.comparison_skills,
    projects: value.comparison_projects,
    experience: value.comparison_experience,
    certifications: value.comparison_certifications,
    linkGithub: value.link_github,
    linkLinkedin: value.link_linkedin,
    linkPortfolio: value.link_portfolio,
    linkLeetcode: value.link_leetcode,
    linkCodeforces: value.link_codeforces,
    flagHasMeasurableImpact: value.flag_has_measurable_impact,
    flagHasSectionClarity: value.flag_has_section_clarity,
    flagHasProofLink: value.flag_has_proof_link,
    flagHasGenericProjects: value.flag_has_generic_projects,
    flagIsPlaceholderText: value.flag_is_placeholder_text,
  };
}

function parseResumeComparisonPageRow(
  value: unknown,
): ResumeComparisonPageRow | null {
  const createdAtOrder = isRecord(value)
    ? timestampOrderKey(value.created_at)
    : null;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, PAGE_ROW_KEYS) ||
    !isUuid(value.id) ||
    !isUuid(value.user_id) ||
    typeof value.file_name !== "string" ||
    !isValidTimestamp(value.created_at) ||
    createdAtOrder === null
  ) {
    return null;
  }

  return {
    id: value.id,
    ownerId: value.user_id,
    fileName: value.file_name,
    createdAt: value.created_at,
    createdAtOrder,
  };
}

function toEvidenceInput(
  row: ResumeComparisonPairRow,
): ResumeComparisonEvidenceInput {
  return {
    id: row.id,
    fileName: row.fileName,
    savedAt: row.createdAt,
    skills: row.skills,
    projects: row.projects,
    experience: row.experience,
    certifications: row.certifications,
    links: {
      [RESUME_COMPARISON_LINK_TYPES[0]]: row.linkGithub,
      [RESUME_COMPARISON_LINK_TYPES[1]]: row.linkLinkedin,
      [RESUME_COMPARISON_LINK_TYPES[2]]: row.linkPortfolio,
      [RESUME_COMPARISON_LINK_TYPES[3]]: row.linkLeetcode,
      [RESUME_COMPARISON_LINK_TYPES[4]]: row.linkCodeforces,
    },
    flags: {
      [RESUME_COMPARISON_FLAG_TYPES[0]]: row.flagHasMeasurableImpact,
      [RESUME_COMPARISON_FLAG_TYPES[1]]: row.flagHasSectionClarity,
      [RESUME_COMPARISON_FLAG_TYPES[2]]: row.flagHasProofLink,
      [RESUME_COMPARISON_FLAG_TYPES[3]]: row.flagHasGenericProjects,
    },
    placeholderText: row.flagIsPlaceholderText,
  };
}

function timestampOrderKey(value: unknown): bigint | null {
  if (!isValidTimestamp(value)) {
    return null;
  }

  const fractionMatch =
    /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  const fraction = fractionMatch?.[1] ?? "";
  if (fraction.length > 6) {
    return null;
  }

  const parsedMilliseconds = Date.parse(value);
  if (!Number.isFinite(parsedMilliseconds)) {
    return null;
  }

  const subMillisecondFraction = fraction.length > 3
    ? BigInt(fraction.slice(3).padEnd(3, "0"))
    : BigInt(0);
  return BigInt(parsedMilliseconds) * BigInt(1000) +
    subMillisecondFraction;
}

async function failureAfterIdentityConfirmation<T>(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  message: string,
): Promise<ResumeComparisonRepositoryResult<T>> {
  const identity = await confirmResumeOwner(
    supabase,
    ownerId,
    COMPARISON_IDENTITY_MESSAGES,
  );
  return identity.ok
    ? comparisonFailure("repository_failure", message)
    : mapIdentityFailure(identity);
}

function mapIdentityFailure<T>(
  failure: {
    ok: false;
    error: string;
    reason:
      | "account_changed"
      | "invalid_response"
      | "not_authenticated"
      | "not_configured"
      | "provider_error";
  },
): ResumeComparisonRepositoryResult<T> {
  if (failure.reason === "account_changed") {
    return comparisonFailure("owner_changed", failure.error);
  }
  if (failure.reason === "not_authenticated") {
    return comparisonFailure("unauthenticated", failure.error);
  }

  return comparisonFailure(
    "repository_failure",
    "Could not verify the current account.",
  );
}

function comparisonFailure<T>(
  code: ResumeComparisonRepositoryErrorCode,
  error: string,
): ResumeComparisonRepositoryResult<T> {
  return {
    ok: false,
    code,
    error,
  };
}

function normalizeUuid(value: string): string {
  return value.toLowerCase();
}

function compareStrings(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}
