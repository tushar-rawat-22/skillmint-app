import { createHash } from "node:crypto";

const GREENHOUSE_API_ROOT = "https://boards-api.greenhouse.io/v1/boards";

export async function fetchGreenhouseJobs({ boardToken, fetchImpl = fetch, fetchedAt = new Date().toISOString() }) {
  const normalizedBoardToken = normalizeRequiredString(boardToken);
  if (!normalizedBoardToken) {
    return { ok: false, error: { kind: "invalid_board_token", message: "Greenhouse board token is required." } };
  }

  const url = `${GREENHOUSE_API_ROOT}/${encodeURIComponent(normalizedBoardToken)}/jobs?content=true`;
  let response;

  try {
    response = await fetchImpl(url, { headers: { accept: "application/json" } });
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: "network_error",
        message: error instanceof Error ? error.message : "Greenhouse request failed.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        kind: response.status === 404 ? "source_unavailable" : "http_error",
        status: response.status,
        message: `Greenhouse returned HTTP ${response.status}.`,
      },
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: { kind: "invalid_json", message: "Greenhouse returned invalid JSON." } };
  }

  if (!payload || !Array.isArray(payload.jobs)) {
    return { ok: false, error: { kind: "invalid_payload", message: "Greenhouse payload is missing jobs[]." } };
  }

  const seen = new Set();
  const jobs = [];
  const duplicates = [];

  for (const rawJob of payload.jobs) {
    const normalized = normalizeGreenhouseJob({ boardToken: normalizedBoardToken, rawJob, fetchedAt });
    if (!normalized.ok) {
      jobs.push(normalized);
      continue;
    }

    if (seen.has(normalized.job.sourceKey)) {
      duplicates.push(normalized.job.sourceKey);
      continue;
    }

    seen.add(normalized.job.sourceKey);
    jobs.push(normalized);
  }

  return {
    ok: true,
    source: "greenhouse",
    boardToken: normalizedBoardToken,
    fetchedAt: normalizeTimestamp(fetchedAt),
    jobs,
    duplicateSourceKeys: duplicates,
  };
}

export function normalizeGreenhouseJob({ boardToken, rawJob, fetchedAt }) {
  const postingId = normalizePostingId(rawJob?.id);
  const title = normalizeRequiredString(rawJob?.title);
  const applyUrl = normalizeUrl(rawJob?.absolute_url);

  if (!postingId || !title || !applyUrl) {
    return {
      ok: false,
      error: {
        kind: "invalid_job",
        postingId,
        missing: [
          !postingId ? "id" : null,
          !title ? "title" : null,
          !applyUrl ? "absolute_url" : null,
        ].filter(Boolean),
      },
    };
  }

  const normalizedBoardToken = normalizeRequiredString(boardToken);
  if (!normalizedBoardToken) {
    return { ok: false, error: { kind: "invalid_board_token", postingId } };
  }

  const normalized = {
    source: "greenhouse",
    sourceKey: `greenhouse:${normalizedBoardToken}:${postingId}`,
    boardToken: normalizedBoardToken,
    postingId,
    companyName: normalizeOptionalString(rawJob?.company_name),
    title,
    originalApplyUrl: applyUrl,
    sourceUpdatedAt: normalizeTimestamp(rawJob?.updated_at),
    sourcePublishedAt: normalizeTimestamp(rawJob?.first_published),
    fetchedAt: normalizeTimestamp(fetchedAt),
    firstSeenAt: null,
    location: normalizeOptionalString(rawJob?.location?.name),
    remote: null,
    commitment: null,
    departments: normalizeNamedCollection(rawJob?.departments),
    offices: normalizeNamedCollection(rawJob?.offices),
    salary: null,
    availability: "available",
    stale: false,
    closedAt: null,
    sourceLocator: `${GREENHOUSE_API_ROOT}/${encodeURIComponent(normalizedBoardToken)}/jobs/${postingId}`,
    dedupeKey: `greenhouse:${normalizedBoardToken}:${postingId}`,
    contentHash: hashNormalizedJob(rawJob),
    missingFields: [],
  };

  normalized.missingFields = [
    ["companyName", normalized.companyName],
    ["sourceUpdatedAt", normalized.sourceUpdatedAt],
    ["sourcePublishedAt", normalized.sourcePublishedAt],
    ["location", normalized.location],
    ["remote", normalized.remote],
    ["commitment", normalized.commitment],
    ["salary", normalized.salary],
  ].filter(([, value]) => value === null).map(([field]) => field);

  return { ok: true, job: normalized };
}

function normalizePostingId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim();
  return null;
}

function normalizeRequiredString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalString(value) {
  return normalizeRequiredString(value);
}

function normalizeTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function normalizeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeNamedCollection(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeOptionalString(entry?.name)).filter(Boolean);
}

function hashNormalizedJob(rawJob) {
  const stablePayload = JSON.stringify(sortObject(rawJob ?? null));
  return createHash("sha256").update(stablePayload).digest("hex");
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
}
