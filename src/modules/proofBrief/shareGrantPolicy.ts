export const PROOF_BRIEF_SHARE_LIFETIME_DAYS = 14;
export const PROOF_BRIEF_SHARE_LIFETIME_MS =
  PROOF_BRIEF_SHARE_LIFETIME_DAYS * 24 * 60 * 60 * 1_000;

export function proofBriefShareExpiresAt(sharedAt: string): string | null {
  const sharedAtMs = Date.parse(sharedAt);
  if (!Number.isFinite(sharedAtMs)) return null;
  return new Date(sharedAtMs + PROOF_BRIEF_SHARE_LIFETIME_MS).toISOString();
}

export function isProofBriefShareActive(
  sharedAt: string | null,
  nowMs = Date.now(),
): boolean {
  if (sharedAt === null || !Number.isFinite(nowMs)) return false;
  const sharedAtMs = Date.parse(sharedAt);
  return Number.isFinite(sharedAtMs) &&
    sharedAtMs + PROOF_BRIEF_SHARE_LIFETIME_MS > nowMs;
}
