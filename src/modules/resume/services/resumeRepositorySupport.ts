"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";
import type { PersistentResumeAnalysis } from "@/modules/resume/types";

export const RESUME_ANALYSIS_COLUMNS =
  "id, user_id, file_name, file_type, extracted_text, parsed_profile, user_profile, created_at";

const RESUME_ANALYSIS_ROW_KEYS = [
  "id",
  "user_id",
  "file_name",
  "file_type",
  "extracted_text",
  "parsed_profile",
  "user_profile",
  "created_at",
] as const;

export type ResumeSupabaseClient = NonNullable<
  ReturnType<typeof createSupabaseBrowserClient>
>;

export type ResumeIdentityFailure = {
  ok: false;
  error: string;
  reason: ResumeIdentityErrorReason;
};

type ResumeIdentityErrorReason =
  | "account_changed"
  | "invalid_response"
  | "not_authenticated"
  | "not_configured"
  | "provider_error";

type ResumeIdentityMessages = {
  unauthenticated: string;
  accountChanged: string;
};

export async function authenticateResumeOwner(
  expectedUserId: string | null | undefined,
  messages: ResumeIdentityMessages,
): Promise<
  | {
      ok: true;
      data: {
        supabase: ResumeSupabaseClient;
        user: User;
      };
    }
  | ResumeIdentityFailure
> {
  const normalizedExpectedUserId = expectedUserId === undefined
    ? undefined
    : normalizeUserId(expectedUserId);

  if (expectedUserId !== undefined && !normalizedExpectedUserId) {
    return identityFailure("not_authenticated", messages.unauthenticated);
  }

  const configStatus = getSupabaseConfigStatus();
  if (!configStatus.isConfigured) {
    return identityFailure("not_configured", configStatus.message);
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return identityFailure(
      "not_configured",
      "Supabase auth client is unavailable.",
    );
  }

  let response: Awaited<ReturnType<ResumeSupabaseClient["auth"]["getUser"]>>;
  try {
    response = await supabase.auth.getUser();
  } catch {
    return identityFailure(
      "provider_error",
      "Could not verify the current account.",
    );
  }

  if (response.error || !response.data.user) {
    return identityFailure("not_authenticated", messages.unauthenticated);
  }

  const authenticatedUserId = normalizeUserId(response.data.user.id);
  if (!authenticatedUserId) {
    return identityFailure(
      "invalid_response",
      "Authentication returned an invalid account identifier.",
    );
  }

  if (
    normalizedExpectedUserId !== undefined &&
    normalizedExpectedUserId !== authenticatedUserId
  ) {
    return identityFailure("account_changed", messages.accountChanged);
  }

  return {
    ok: true,
    data: {
      supabase,
      user: response.data.user,
    },
  };
}

export async function confirmResumeOwner(
  supabase: ResumeSupabaseClient,
  expectedUserId: string,
  messages: ResumeIdentityMessages,
): Promise<{ ok: true; data: true } | ResumeIdentityFailure> {
  let response: Awaited<ReturnType<ResumeSupabaseClient["auth"]["getUser"]>>;
  try {
    response = await supabase.auth.getUser();
  } catch {
    return identityFailure(
      "provider_error",
      "Could not confirm the current account.",
    );
  }

  if (response.error || !response.data.user) {
    return identityFailure("not_authenticated", messages.unauthenticated);
  }

  const currentUserId = normalizeUserId(response.data.user.id);
  if (!currentUserId) {
    return identityFailure(
      "invalid_response",
      "Authentication returned an invalid account identifier.",
    );
  }

  if (currentUserId !== expectedUserId) {
    return identityFailure("account_changed", messages.accountChanged);
  }

  return {
    ok: true,
    data: true,
  };
}

export function parsePersistentResumeAnalysis(
  value: unknown,
): PersistentResumeAnalysis | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, RESUME_ANALYSIS_ROW_KEYS) ||
    !isUuid(value.id) ||
    !isUuid(value.user_id) ||
    typeof value.file_name !== "string" ||
    typeof value.file_type !== "string" ||
    (value.extracted_text !== null &&
      typeof value.extracted_text !== "string") ||
    !isJson(value.parsed_profile) ||
    !isJson(value.user_profile) ||
    !isValidTimestamp(value.created_at)
  ) {
    return null;
  }

  return {
    id: value.id,
    userId: value.user_id,
    fileName: value.file_name,
    fileType: value.file_type,
    extractedText: value.extracted_text,
    parsedProfile: value.parsed_profile,
    userProfile: value.user_profile,
    createdAt: value.created_at,
  };
}

export function normalizeUserId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return isUuid(normalized) ? normalized : null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

export function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/
      .exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);

  return year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59;
}

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index]);
}

function identityFailure(
  reason: ResumeIdentityErrorReason,
  error: string,
): ResumeIdentityFailure {
  return {
    ok: false,
    error,
    reason,
  };
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leapYear = year % 4 === 0 &&
      (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isJson(value: unknown): value is Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJson);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((item) =>
    item === undefined || isJson(item)
  );
}
