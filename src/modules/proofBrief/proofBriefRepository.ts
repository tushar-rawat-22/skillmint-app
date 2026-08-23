"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import {
  isValidProofBriefShareToken,
  parseCandidateProofBriefRow,
} from "@/modules/proofBrief/proofBriefContract";
import type {
  CandidateProofBrief,
} from "@/modules/proofBrief/types";

export type ProofBriefRepositoryError =
  | "not_configured"
  | "not_authenticated"
  | "account_changed"
  | "invalid_input"
  | "not_found"
  | "permission_denied"
  | "schema_unavailable"
  | "network_failure"
  | "invalid_response"
  | "unknown";

export type ProofBriefRepositoryResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly code: ProofBriefRepositoryError; readonly message: string };

type ProviderResponse = {
  readonly data: unknown;
  readonly error?: unknown;
  readonly shareToken?: unknown;
};

export type ProofBriefRepositoryAdapter = {
  getCurrentUserId: () => Promise<{ readonly userId: string | null; readonly error?: unknown }>;
  getBySource: (userId: string, sourceResumeAnalysisId: string) => Promise<ProviderResponse>;
  insertPrivate: (input: {
    readonly userId: string;
    readonly sourceResumeAnalysisId: string;
  }) => Promise<ProviderResponse>;
  refreshPrivate: (input: {
    readonly id: string;
    readonly userId: string;
    readonly sourceResumeAnalysisId: string;
  }) => Promise<ProviderResponse>;
  publish: (input: {
    readonly id: string;
    readonly userId: string;
  }) => Promise<ProviderResponse>;
  revoke: (input: {
    readonly id: string;
    readonly userId: string;
  }) => Promise<ProviderResponse>;
};

export async function getProofBriefForSource(
  sourceResumeAnalysisId: string,
  expectedUserId: string,
): Promise<ProofBriefRepositoryResult<CandidateProofBrief | null>> {
  const adapter = createAdapter();
  if (!adapter) return failure("not_configured");
  return getProofBriefForSourceWithAdapter(
    sourceResumeAnalysisId,
    expectedUserId,
    adapter,
  );
}

export async function getProofBriefForSourceWithAdapter(
  sourceResumeAnalysisId: unknown,
  expectedUserId: unknown,
  adapter: ProofBriefRepositoryAdapter,
): Promise<ProofBriefRepositoryResult<CandidateProofBrief | null>> {
  if (!isUuid(sourceResumeAnalysisId) || !isUuid(expectedUserId)) {
    return failure("invalid_input");
  }
  const auth = await confirmIdentity(adapter, expectedUserId);
  if (!auth.ok) return auth;
  try {
    const response = await adapter.getBySource(expectedUserId, sourceResumeAnalysisId);
    if (response.error) return providerFailure(response.error);
    if (!Array.isArray(response.data) || response.data.length > 1) {
      return failure("invalid_response");
    }
    const brief = response.data.length === 0
      ? null
      : parseCandidateProofBriefRow(response.data[0], {
          userId: expectedUserId,
          sourceResumeAnalysisId,
        });
    if (response.data.length === 1 && !brief) return failure("invalid_response");
    const finalIdentity = await confirmIdentity(adapter, expectedUserId);
    return finalIdentity.ok ? { ok: true, data: brief } : finalIdentity;
  } catch (error) {
    return providerFailure(error);
  }
}

export async function createOrRefreshPrivateProofBrief(
  sourceResumeAnalysisId: string,
  expectedUserId: string,
): Promise<ProofBriefRepositoryResult<CandidateProofBrief>> {
  const adapter = createAdapter();
  if (!adapter) return failure("not_configured");
  return createOrRefreshPrivateProofBriefWithAdapter(
    sourceResumeAnalysisId,
    expectedUserId,
    adapter,
  );
}

export async function createOrRefreshPrivateProofBriefWithAdapter(
  sourceResumeAnalysisId: unknown,
  expectedUserId: unknown,
  adapter: ProofBriefRepositoryAdapter,
): Promise<ProofBriefRepositoryResult<CandidateProofBrief>> {
  if (!isUuid(sourceResumeAnalysisId) || !isUuid(expectedUserId)) {
    return failure("invalid_input");
  }
  const current = await getProofBriefForSourceWithAdapter(
    sourceResumeAnalysisId,
    expectedUserId,
    adapter,
  );
  if (!current.ok) return current;

  try {
    const response = current.data
      ? await adapter.refreshPrivate({
          id: current.data.id,
          userId: expectedUserId,
          sourceResumeAnalysisId,
        })
      : await adapter.insertPrivate({
          userId: expectedUserId,
          sourceResumeAnalysisId,
        });
    if (response.error) return providerFailure(response.error);
    const brief = parseSingleOwnedBrief(response.data, {
      userId: expectedUserId,
      sourceResumeAnalysisId,
      ...(current.data ? { briefId: current.data.id } : {}),
    });
    if (!brief || brief.visibility !== "PRIVATE") return failure("invalid_response");
    const finalIdentity = await confirmIdentity(adapter, expectedUserId);
    return finalIdentity.ok ? { ok: true, data: brief } : finalIdentity;
  } catch (error) {
    return providerFailure(error);
  }
}

export async function publishProofBrief(
  briefId: string,
  expectedUserId: string,
): Promise<ProofBriefRepositoryResult<{
  readonly brief: CandidateProofBrief;
  readonly shareToken: string;
}>> {
  const adapter = createAdapter();
  if (!adapter) return failure("not_configured");
  return publishProofBriefWithAdapter(briefId, expectedUserId, adapter);
}

export async function publishProofBriefWithAdapter(
  briefId: unknown,
  expectedUserId: unknown,
  adapter: ProofBriefRepositoryAdapter,
): Promise<ProofBriefRepositoryResult<{
  readonly brief: CandidateProofBrief;
  readonly shareToken: string;
}>> {
  if (!isUuid(briefId) || !isUuid(expectedUserId)) return failure("invalid_input");
  const auth = await confirmIdentity(adapter, expectedUserId);
  if (!auth.ok) return auth;

  try {
    const response = await adapter.publish({
      id: briefId,
      userId: expectedUserId,
    });
    if (response.error) return providerFailure(response.error);
    const brief = parseSingleOwnedBrief(response.data, {
      userId: expectedUserId,
      briefId,
    });
    if (
      !brief ||
      brief.visibility !== "LINK_ONLY" ||
      typeof response.shareToken !== "string" ||
      !isValidProofBriefShareToken(response.shareToken)
    ) {
      return failure("invalid_response");
    }
    const finalIdentity = await confirmIdentity(adapter, expectedUserId);
    return finalIdentity.ok
      ? { ok: true, data: { brief, shareToken: response.shareToken } }
      : finalIdentity;
  } catch (error) {
    return providerFailure(error);
  }
}

export async function revokeProofBrief(
  briefId: string,
  expectedUserId: string,
): Promise<ProofBriefRepositoryResult<CandidateProofBrief>> {
  const adapter = createAdapter();
  if (!adapter) return failure("not_configured");
  return revokeProofBriefWithAdapter(briefId, expectedUserId, adapter);
}

export async function revokeProofBriefWithAdapter(
  briefId: unknown,
  expectedUserId: unknown,
  adapter: ProofBriefRepositoryAdapter,
): Promise<ProofBriefRepositoryResult<CandidateProofBrief>> {
  if (!isUuid(briefId) || !isUuid(expectedUserId)) return failure("invalid_input");
  const auth = await confirmIdentity(adapter, expectedUserId);
  if (!auth.ok) return auth;
  try {
    const response = await adapter.revoke({
      id: briefId,
      userId: expectedUserId,
    });
    if (response.error) return providerFailure(response.error);
    const brief = parseSingleOwnedBrief(response.data, {
      userId: expectedUserId,
      briefId,
    });
    if (!brief || brief.visibility !== "PRIVATE" || !brief.revokedAt) {
      return failure("invalid_response");
    }
    const finalIdentity = await confirmIdentity(adapter, expectedUserId);
    return finalIdentity.ok ? { ok: true, data: brief } : finalIdentity;
  } catch (error) {
    return providerFailure(error);
  }
}

function createAdapter(): ProofBriefRepositoryAdapter | null {
  if (!getSupabaseConfigStatus().isConfigured) return null;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  return {
    async getCurrentUserId() {
      const result = await supabase.auth.getUser();
      return { userId: result.data.user?.id ?? null, ...(result.error ? { error: result.error } : {}) };
    },
    async getBySource(userId, sourceResumeAnalysisId) {
      const response = await callProofBriefApi(
        `/api/proof-brief?source=${encodeURIComponent(sourceResumeAnalysisId)}`,
        { method: "GET" },
      );
      if (response.error) return response;
      if (!isRecord(response.data) || !("brief" in response.data)) {
        return { data: null, error: { message: "invalid response" } };
      }
      return {
        data: response.data.brief === null ? [] : [response.data.brief],
      };
    },
    async insertPrivate(input) {
      return callMutation({
        action: "create_or_refresh",
        sourceResumeAnalysisId: input.sourceResumeAnalysisId,
      });
    },
    async refreshPrivate(input) {
      return callMutation({
        action: "create_or_refresh",
        sourceResumeAnalysisId: input.sourceResumeAnalysisId,
      });
    },
    async publish(input) {
      return callMutation({ action: "publish", briefId: input.id });
    },
    async revoke(input) {
      return callMutation({ action: "revoke", briefId: input.id });
    },
  };
}

async function callMutation(body: Record<string, string>): Promise<ProviderResponse> {
  const response = await callProofBriefApi("/api/proof-brief", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.error) return response;
  if (!isRecord(response.data) || !("brief" in response.data)) {
    return { data: null, error: { message: "invalid response" } };
  }
  return {
    data: response.data.brief,
    ...(Object.prototype.hasOwnProperty.call(response.data, "shareToken")
      ? { shareToken: response.data.shareToken }
      : {}),
  };
}

async function callProofBriefApi(
  url: string,
  init: RequestInit,
): Promise<ProviderResponse> {
  try {
    const response = await fetch(url, { ...init, credentials: "same-origin" });
    const data: unknown = await response.json();
    return response.ok
      ? { data }
      : { data: null, error: { status: response.status } };
  } catch (error) {
    return { data: null, error };
  }
}

async function confirmIdentity(
  adapter: ProofBriefRepositoryAdapter,
  expectedUserId: string,
): Promise<ProofBriefRepositoryResult<true>> {
  try {
    const auth = await adapter.getCurrentUserId();
    if (auth.error) return providerFailure(auth.error);
    if (!auth.userId) return failure("not_authenticated");
    return auth.userId === expectedUserId
      ? { ok: true, data: true }
      : failure("account_changed");
  } catch (error) {
    return providerFailure(error);
  }
}

function parseSingleOwnedBrief(
  data: unknown,
  expected: Parameters<typeof parseCandidateProofBriefRow>[1],
): CandidateProofBrief | null {
  const row = Array.isArray(data) ? data.length === 1 ? data[0] : null : data;
  return parseCandidateProofBriefRow(row, expected);
}

function providerFailure(error: unknown): ProofBriefRepositoryResult<never> {
  const record = isRecord(error) ? error : {};
  const text = [record.message, record.code, typeof error === "string" ? error : ""]
    .filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
  if (/row-level security|permission denied|42501|forbidden/u.test(text)) return failure("permission_denied");
  if (/relation|schema cache|does not exist|42p01|pgrst2/u.test(text)) return failure("schema_unavailable");
  if (/network|fetch|timeout|connection|abort|429|50[0-9]/u.test(text)) return failure("network_failure");
  return failure("unknown");
}

function failure(code: ProofBriefRepositoryError): ProofBriefRepositoryResult<never> {
  const messages: Record<ProofBriefRepositoryError, string> = {
    not_configured: "Proof Brief sharing is not configured yet.",
    not_authenticated: "Log in to manage a Proof Brief.",
    account_changed: "Your account changed while the Proof Brief request was running.",
    invalid_input: "The Proof Brief request was not accepted.",
    not_found: "The Proof Brief was not found.",
    permission_denied: "Proof Brief access was not authorized.",
    schema_unavailable: "Proof Brief sharing is not available in this environment yet.",
    network_failure: "The Proof Brief request could not reach the account service.",
    invalid_response: "The Proof Brief service returned an unexpected response.",
    unknown: "The Proof Brief request could not be completed.",
  };
  return { ok: false, code, message: messages[code] };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
