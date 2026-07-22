"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const RESET_PASSWORD_PATH = "/reset-password";

type RecoveryStatus = "checking" | "ready" | "invalid";
type UpdatePasswordResult = "success" | "failure" | "ignored";
type RecoveryClient = NonNullable<
  ReturnType<typeof createSupabaseBrowserClient>
>;

type RecoveryInitialization =
  | {
      status: "ready";
      client: RecoveryClient;
      userId: string;
    }
  | {
      status: "invalid";
    };

type UsePasswordRecoveryResult = {
  status: RecoveryStatus;
  isSubmitting: boolean;
  updatePassword: (
    newPassword: string,
  ) => Promise<UpdatePasswordResult>;
};

export function usePasswordRecovery(): UsePasswordRecoveryResult {
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializationRef = useRef<
    Promise<RecoveryInitialization> | null
  >(null);
  const clientRef = useRef<RecoveryClient | null>(null);
  const authorizedUserIdRef = useRef<string | null>(null);
  const submissionLockRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    isMountedRef.current = true;

    if (!initializationRef.current) {
      initializationRef.current = initializeRecovery();
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

async function initializeRecovery(): Promise<RecoveryInitialization> {
  const callback = readCallbackSnapshot();
  sanitizeVisibleUrl();

  if (!callback.code || callback.isInvalid) {
    return { status: "invalid" };
  }

  const client = createSupabaseBrowserClient();

  if (!client) {
    return { status: "invalid" };
  }

  try {
    const { data: exchangeData, error: exchangeError } =
      await client.auth.exchangeCodeForSession(callback.code);
    const sessionUserId = exchangeData.session?.user?.id;

    if (exchangeError || !sessionUserId) {
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
      return { status: "invalid" };
    }

    return {
      status: "ready",
      client,
      userId: verifiedUserId,
    };
  } catch {
    return { status: "invalid" };
  }
}

function readCallbackSnapshot(): {
  code: string | null;
  isInvalid: boolean;
} {
  const url = new URL(window.location.href);
  const codes = url.searchParams.getAll("code");
  const code = codes.length === 1 ? codes[0].trim() : "";
  const queryKeys = Array.from(url.searchParams.keys());

  return {
    code: code || null,
    isInvalid:
      codes.length !== 1 ||
      !code ||
      url.hash.length > 0 ||
      queryKeys.some((key) => key !== "code"),
  };
}

function sanitizeVisibleUrl(): void {
  window.history.replaceState(
    window.history.state,
    "",
    RESET_PASSWORD_PATH,
  );
}
