import "server-only";

import { parseGreenhouseSourceKey } from "@/modules/jobs/candidateJobLifecycle";

const GREENHOUSE_API_ROOT = "https://boards-api.greenhouse.io/v1/boards";
const TRUSTED_GREENHOUSE_SOURCES = [
  { boardToken: "airbnb", companyName: "Airbnb" },
  { boardToken: "figma", companyName: "Figma" },
  { boardToken: "stripe", companyName: "Stripe" },
] as const;
const REQUEST_TIMEOUT_MS = 8_000;

type GreenhouseJob = {
  id?: number;
  title?: string;
  absolute_url?: string;
  updated_at?: string;
  location?: { name?: string } | null;
};

export type TrustedGreenhousePosting = {
  readonly provider: "greenhouse";
  readonly providerAccountId: string;
  readonly sourceNativeId: string;
  readonly sourceKey: string;
  readonly originalApplyUrl: string;
  readonly roleTitle: string;
  readonly companyName: string;
  readonly location: string | null;
  readonly sourceUpdatedAt: string | null;
  readonly sourceFetchedAt: string;
};

export type TrustedGreenhousePostingResolution =
  | { readonly status: "live"; readonly posting: TrustedGreenhousePosting }
  | { readonly status: "closed" };

export class GreenhousePostingResolutionError extends Error {
  constructor(
    readonly code: "invalid_source" | "untrusted_source" | "upstream_unavailable",
  ) {
    super(code);
    this.name = "GreenhousePostingResolutionError";
  }
}

export async function resolveTrustedGreenhousePosting(
  sourceKey: string,
): Promise<TrustedGreenhousePostingResolution> {
  const identity = parseGreenhouseSourceKey(sourceKey);
  if (!identity) throw new GreenhousePostingResolutionError("invalid_source");
  const source = TRUSTED_GREENHOUSE_SOURCES.find(
    (candidate) => candidate.boardToken === identity.providerAccountId,
  );
  if (!source) throw new GreenhousePostingResolutionError("untrusted_source");

  let response: Response;
  try {
    response = await fetch(
      `${GREENHOUSE_API_ROOT}/${encodeURIComponent(source.boardToken)}/jobs`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    throw new GreenhousePostingResolutionError("upstream_unavailable");
  }
  if (!response.ok) {
    throw new GreenhousePostingResolutionError("upstream_unavailable");
  }

  let payload: { jobs?: GreenhouseJob[] };
  try {
    payload = await response.json() as { jobs?: GreenhouseJob[] };
  } catch {
    throw new GreenhousePostingResolutionError("upstream_unavailable");
  }
  if (!Array.isArray(payload.jobs)) {
    throw new GreenhousePostingResolutionError("upstream_unavailable");
  }

  const rawPosting = payload.jobs.find(
    (candidate) => Number.isSafeInteger(candidate.id) &&
      String(candidate.id) === identity.sourceNativeId,
  );
  if (!rawPosting) return { status: "closed" };

  const roleTitle = normalizeText(rawPosting.title);
  const originalApplyUrl = normalizeHttpUrl(rawPosting.absolute_url);
  if (!roleTitle || !originalApplyUrl) {
    throw new GreenhousePostingResolutionError("upstream_unavailable");
  }

  return {
    status: "live",
    posting: {
      provider: "greenhouse",
      providerAccountId: identity.providerAccountId,
      sourceNativeId: identity.sourceNativeId,
      sourceKey: identity.sourceKey,
      originalApplyUrl,
      roleTitle,
      companyName: source.companyName,
      location: normalizeText(rawPosting.location?.name) || null,
      sourceUpdatedAt: normalizeIsoTimestamp(rawPosting.updated_at),
      sourceFetchedAt: new Date().toISOString(),
    },
  };
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
}

function normalizeHttpUrl(value: unknown): string | null {
  const text = normalizeText(value);
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
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
