type AdminAuthBoundary = {
  deleteUser: (
    userId: string,
    shouldSoftDelete: false,
  ) => Promise<{ error: unknown | null }>;
  getUserById: (userId: string) => Promise<unknown>;
};

type Wait = (delayMs: number) => Promise<void>;

// The first check is immediate. Two short follow-ups allow a competing server
// process to finish deleting the Auth identity without extending the request
// indefinitely. The total additional wait is capped at 150 ms.
const AUTH_ABSENCE_VERIFICATION_DELAYS_MS = [0, 50, 100] as const;

export async function deleteAuthUserWithVerifiedConvergence(
  adminAuth: AdminAuthBoundary,
  validatedUserId: string,
  wait: Wait = sleep,
): Promise<{ ok: true; deleted: true } | { ok: false }> {
  const deletion = await adminAuth.deleteUser(validatedUserId, false);
  if (!deletion.error) return { ok: true, deleted: true };

  for (const delayMs of AUTH_ABSENCE_VERIFICATION_DELAYS_MS) {
    if (delayMs > 0) await wait(delayMs);

    let verification: unknown;
    try {
      verification = await adminAuth.getUserById(validatedUserId);
    } catch {
      continue;
    }
    if (isVerifiedAbsent(verification)) {
      return { ok: true, deleted: true };
    }
  }

  return { ok: false };
}

function isVerifiedAbsent(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.error)) return false;
  if (Number(value.error.status) !== 404 || !isRecord(value.data)) return false;
  return Object.prototype.hasOwnProperty.call(value.data, "user") &&
    value.data.user == null;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
