const SAFE_ACCOUNT_DELETION_MESSAGES: Record<string, string> = {
  invalid_request: "The deletion request was not accepted. Reopen the dialog and try again.",
  request_too_large: "The deletion request was not accepted. Reopen the dialog and try again.",
  not_authenticated: "Sign in again before deleting your account.",
  recent_authentication_required: "Reauthenticate with your current password before deleting your account.",
  unsupported_authentication_method: "Account deletion is not available for this sign-in method yet.",
  not_configured: "Account deletion is not configured on this server.",
  account_data_cleanup_failed: "Account deletion did not finish. Please try again.",
  storage_deletion_failed: "Account deletion did not finish. Please try again.",
  auth_deletion_failed: "Account deletion did not finish. Please try again.",
  temporarily_unavailable: "Account deletion is temporarily unavailable. Please try again.",
};

export function parseAccountDeletionResponse(
  responseOk: boolean,
  payload: unknown,
): { ok: true } | { ok: false; message: string } {
  if (
    responseOk &&
    isRecord(payload) &&
    Object.keys(payload).length === 2 &&
    payload.ok === true &&
    payload.deleted === true
  ) return { ok: true };

  const code = isRecord(payload) && typeof payload.code === "string"
    ? payload.code
    : "";
  return {
    ok: false,
    message: SAFE_ACCOUNT_DELETION_MESSAGES[code] ??
      "Account deletion did not finish. Please try again.",
  };
}

export function isConfirmedAccountDeletionResponse(
  responseOk: boolean,
  payload: unknown,
): boolean {
  return parseAccountDeletionResponse(responseOk, payload).ok;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
