import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const GREENHOUSE_API_ROOT = "https://boards-api.greenhouse.io/v1/boards";
const SOURCE_CATALOG = [
  { boardToken: "airbnb", companyName: "Airbnb" },
  { boardToken: "figma", companyName: "Figma" },
  { boardToken: "stripe", companyName: "Stripe" },
] as const;
const MAX_RESULTS = 6;
const MAX_REQUIREMENTS = 8;
const REQUEST_TIMEOUT_MS = 8_000;

const REQUIREMENT_CUES = /\b(required|requirements?|must|experience|experienced|proficien|knowledge|familiar|ability|expertise|skills?|you have|we are looking|we're looking)\b/iu;
const EVIDENCE_TERMS = [
  "accessibility",
  "api",
  "apis",
  "aws",
  "azure",
  "c#",
  "c++",
  "css",
  "docker",
  "figma",
  "gcp",
  "git",
  "graphql",
  "html",
  "java",
  "javascript",
  "jest",
  "kubernetes",
  "machine learning",
  "mysql",
  "next.js",
  "node.js",
  "playwright",
  "postgresql",
  "python",
  "react",
  "rest",
  "rust",
  "security",
  "sql",
  "testing",
  "typescript",
] as const;

type GreenhouseJob = {
  id?: number;
  title?: string;
  absolute_url?: string;
  updated_at?: string;
  location?: { name?: string } | null;
  content?: string;
};

type GreenhouseBoardResponse = {
  jobs?: GreenhouseJob[];
};

type Requirement = {
  id: string;
  text: string;
  evidenceTerms: string[];
  importance: "required";
};

type CandidateSourceJob = {
  source: "greenhouse";
  sourceKey: string;
  boardToken: string;
  title: string;
  companyName: string;
  location: string | null;
  originalApplyUrl: string;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  availability: "available";
  stale: false;
  titleMatchReason: string;
  requirements: Requirement[];
};

export async function GET(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) return jsonError("not_authenticated", 401);

  const publicConfig = getSupabasePublicConfig();
  if (!publicConfig) return jsonError("not_configured", 503);

  const requestUrl = new URL(request.url);
  const targetRole = normalizeText(requestUrl.searchParams.get("targetRole"));
  if (!targetRole || targetRole.length > 100) {
    return jsonError("invalid_target_role", 400);
  }

  try {
    const authClient = createClient<Database>(
      publicConfig.url,
      publicConfig.publishableKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return jsonError("not_authenticated", 401);

    const targetTerms = getTargetTerms(targetRole);
    if (targetTerms.length === 0) return jsonError("invalid_target_role", 400);

    const fetchedAt = new Date().toISOString();
    const settled = await Promise.allSettled(
      SOURCE_CATALOG.map((source) => fetchBoard(source, fetchedAt)),
    );
    const successfulBoards = settled
      .filter((entry): entry is PromiseFulfilledResult<CandidateSourceJob[]> => entry.status === "fulfilled")
      .flatMap((entry) => entry.value);
    const failedSourceCount = settled.filter((entry) => entry.status === "rejected").length;

    if (successfulBoards.length === 0 && failedSourceCount === SOURCE_CATALOG.length) {
      return jsonError("upstream_unavailable", 503);
    }

    const jobs = successfulBoards
      .map((job) => ({ job, matchedTerms: getMatchedTargetTerms(job.title, targetTerms) }))
      .filter((entry) => entry.matchedTerms.length > 0 && entry.job.requirements.length > 0)
      .map(({ job, matchedTerms }) => ({
        ...job,
        titleMatchReason: `Shown because the job title explicitly overlaps your target role on: ${matchedTerms.join(", ")}.`,
      }))
      .sort((left, right) =>
        `${left.companyName}\0${left.title}`.localeCompare(`${right.companyName}\0${right.title}`),
      )
      .slice(0, MAX_RESULTS);

    return NextResponse.json(
      {
        ok: true,
        targetRole,
        jobs,
        sourceStatus: {
          provider: "greenhouse",
          configuredSources: SOURCE_CATALOG.length,
          failedSources: failedSourceCount,
          fetchedAt,
          staleResultsServed: false,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError("temporarily_unavailable", 503);
  }
}

async function fetchBoard(
  source: (typeof SOURCE_CATALOG)[number],
  fetchedAt: string,
): Promise<CandidateSourceJob[]> {
  const response = await fetch(
    `${GREENHOUSE_API_ROOT}/${encodeURIComponent(source.boardToken)}/jobs?content=true`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`greenhouse_${response.status}`);

  const payload = await response.json() as GreenhouseBoardResponse;
  if (!Array.isArray(payload.jobs)) throw new Error("greenhouse_invalid_payload");

  return payload.jobs.flatMap((posting) => {
    const id = Number.isSafeInteger(posting.id) ? String(posting.id) : "";
    const title = normalizeText(posting.title);
    const originalApplyUrl = normalizeHttpUrl(posting.absolute_url);
    if (!id || !title || !originalApplyUrl) return [];

    const requirements = extractRequirements(posting.content ?? "", `${source.boardToken}:${id}`);
    return [{
      source: "greenhouse" as const,
      sourceKey: `greenhouse:${source.boardToken}:${id}`,
      boardToken: source.boardToken,
      title,
      companyName: source.companyName,
      location: normalizeText(posting.location?.name) || null,
      originalApplyUrl,
      sourceUpdatedAt: normalizeIsoTimestamp(posting.updated_at),
      fetchedAt,
      availability: "available" as const,
      stale: false as const,
      titleMatchReason: "",
      requirements,
    }];
  });
}

function extractRequirements(content: string, sourceKey: string): Requirement[] {
  const lines = htmlToLines(content);
  const seen = new Set<string>();
  const requirements: Requirement[] = [];

  for (const line of lines) {
    if (!REQUIREMENT_CUES.test(line)) continue;
    const normalizedLine = line.toLowerCase();
    const evidenceTerms = EVIDENCE_TERMS.filter((term) =>
      containsTerm(normalizedLine, term),
    );
    if (evidenceTerms.length === 0) continue;

    const dedupeKey = `${line.toLowerCase()}\0${evidenceTerms.join("\0")}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    requirements.push({
      id: `${sourceKey}:requirement:${requirements.length + 1}`,
      text: line,
      evidenceTerms: [...evidenceTerms],
      importance: "required",
    });
    if (requirements.length >= MAX_REQUIREMENTS) break;
  }

  return requirements;
}

function htmlToLines(value: string): string[] {
  return value
    .replace(/<(br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/giu, "\n")
    .replace(/<li[^>]*>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .split(/\n+/u)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter((line) => line.length >= 20 && line.length <= 360);
}

function containsTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "iu").test(haystack);
}

function getTargetTerms(targetRole: string): string[] {
  const stopWords = new Set(["and", "the", "for", "with", "role", "position", "senior", "junior"]);
  return [...new Set(
    targetRole
      .toLowerCase()
      .replace(/[^a-z0-9+#.]+/gu, " ")
      .split(/\s+/u)
      .filter((term) => term.length >= 3 && !stopWords.has(term)),
  )];
}

function getMatchedTargetTerms(title: string, targetTerms: string[]): string[] {
  const normalizedTitle = title.toLowerCase();
  return targetTerms.filter((term) => containsTerm(normalizedTitle, term));
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
}

function normalizeHttpUrl(value: unknown): string | null {
  const text = normalizeText(value);
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeIsoTimestamp(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/iu.exec(value.trim());
  return match?.[1]?.trim() || null;
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, error: code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
