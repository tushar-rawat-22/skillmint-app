"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createSupabaseInviteClient } from "@/lib/supabase/client";
import { isNewPasswordAllowed } from "@/modules/auth/services/passwordPolicy";

const INVITE_PATH = "/auth/invite";
const MAX_FRAGMENT_LENGTH = 20_000;
const MAX_TOKEN_LENGTH = 10_000;
const ALLOWED_FRAGMENT_KEYS = new Set([
  "access_token",
  "expires_at",
  "expires_in",
  "refresh_token",
  "token_type",
  "type",
]);

type InviteStatus = "checking" | "ready" | "invalid";
type UpdatePasswordResult = "success" | "failure" | "ignored";
type InviteClient = NonNullable<
  ReturnType<typeof createSupabaseInviteClient>
>;

type InviteInitialization =
  | {
      status: "ready";
      client: InviteClient;
      userId: string;
    }
  | {
      status: "invalid";
    };

type UseInviteCredentialSetupResult = {
  status: InviteStatus;
  isSubmitting: boolean;
  updatePassword: (
    newPassword: string,
  ) => Promise<UpdatePasswordResult>;
};

export function useInviteCredentialSetup(): UseInviteCredentialSetupResult {
  const [status, setStatus] = useState<InviteStatus>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializationRef = useRef<Promise<InviteInitialization> | null>(null);
  const clientRef = useRef<InviteClient | null>(null);
  const authorizedUserIdRef = useRef<string | null>(null);
  const submissionLockRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    isMountedRef.current = true;

    if (!initializationRef.current) {
      initializationRef.current = initializeInvite();
    }

    initializationRef.current.then((result) => {
      if (!isActive) {
        return;
      }

      if (result.status === "ready") {
        clientRef.current = result.client;
        authorizedUserIdRef.current = result.userId;
        setStatus("ready");
        return;
      }

      clientRef.current = null;
      authorizedUserIdRef.current = null;
      setStatus("invalid");
    });

    return () => {
      isActive = false;
      isMountedRef.current = false;
    };
  }, []);

  const updatePassword = useCallback(async (
    newPassword: string,
  ): Promise<UpdatePasswordResult> => {
    const client = clientRef.current;
    const authorizedUserId = authorizedUserIdRef.current;

    if (
      status !== "ready" ||
      !client ||
      !authorizedUserId ||
      submissionLockRef.current
    ) {
      return "ignored";
    }

    if (!isNewPasswordAllowed(newPassword)) {
      return "failure";
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);

    try {
      const { data, error } = await client.auth.updateUser({
        password: newPassword,
      });

      if (!isMountedRef.current) {
        return "ignored";
      }

      if (
        error ||
        !data.user?.id ||
        data.user.id !== authorizedUserId
      ) {
        return "failure";
      }

      return "success";
    } catch {
      return isMountedRef.current ? "failure" : "ignored";
    } finally {
      submissionLockRef.current = false;

      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [status]);

  return {
    status,
    isSubmitting,
    updatePassword,
  };
}

async function initializeInvite(): Promise<InviteInitialization> {
  const callback = readInviteCallbackSnapshot();
  sanitizeVisibleUrl();

  if (!callback.tokens || callback.isInvalid) {
    return { status: "invalid" };
  }

  const client = createSupabaseInviteClient();
  if (!client) {
    return { status: "invalid" };
  }

  try {
    const { data: sessionData, error: sessionError } =
      await client.auth.setSession(callback.tokens);
    const sessionUserId = sessionData.session?.user?.id;

    if (sessionError || !sessionUserId) {
      await clearInviteSession(client);
      return { status: "invalid" };
    }

    const { data: userData, error: userError } =
      await client.auth.getUser();
    const verifiedUserId = userData.user?.id;

    if (
      userError ||
      !verifiedUserId ||
      verifiedUserId !== sessionUserId
    ) {
      await clearInviteSession(client);
      return { status: "invalid" };
    }

    return {
      status: "ready",
      client,
      userId: verifiedUserId,
    };
  } catch {
    await clearInviteSession(client);
    return { status: "invalid" };
  }
}

function readInviteCallbackSnapshot(): {
  tokens: { access_token: string; refresh_token: string } | null;
  isInvalid: boolean;
} {
  const url = new URL(window.location.href);
  const fragment = url.hash.startsWith("#")
    ? url.hash.slice(1)
    : "";
  const params = new URLSearchParams(fragment);
  const keys = Array.from(params.keys());
  const accessTokens = params.getAll("access_token");
  const refreshTokens = params.getAll("refresh_token");
  const expiresInValues = params.getAll("expires_in");
  const expiresAtValues = params.getAll("expires_at");
  const tokenTypes = params.getAll("token_type");
  const types = params.getAll("type");
  const accessToken = accessTokens.length === 1
    ? accessTokens[0].trim()
    : "";
  const refreshToken = refreshTokens.length === 1
    ? refreshTokens[0].trim()
    : "";
  const expiresIn = expiresInValues.length === 1
    ? expiresInValues[0].trim()
    : "";
  const expiresAt = expiresAtValues.length === 1
    ? expiresAtValues[0].trim()
    : "";

  const isInvalid =
    url.search.length > 0 ||
    fragment.length === 0 ||
    fragment.length > MAX_FRAGMENT_LENGTH ||
    keys.some((key) => !ALLOWED_FRAGMENT_KEYS.has(key)) ||
    new Set(keys).size !== keys.length ||
    accessTokens.length !== 1 ||
    refreshTokens.length !== 1 ||
    expiresInValues.length !== 1 ||
    expiresAtValues.length > 1 ||
    tokenTypes.length !== 1 ||
    types.length !== 1 ||
    !accessToken ||
    !refreshToken ||
    accessToken.length > MAX_TOKEN_LENGTH ||
    refreshToken.length > MAX_TOKEN_LENGTH ||
    !/^\d{1,10}$/.test(expiresIn) ||
    Number(expiresIn) <= 0 ||
    (expiresAtValues.length === 1 && !/^\d{1,12}$/.test(expiresAt)) ||
    tokenTypes[0] !== "bearer" ||
    types[0] !== "invite";

  return {
    tokens: isInvalid
      ? null
      : {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
    isInvalid,
  };
}

function sanitizeVisibleUrl(): void {
  window.history.replaceState(
    window.history.state,
    "",
    INVITE_PATH,
  );
}

async function clearInviteSession(client: InviteClient): Promise<void> {
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // The callback still fails closed when provider cleanup is unavailable.
  }
}
