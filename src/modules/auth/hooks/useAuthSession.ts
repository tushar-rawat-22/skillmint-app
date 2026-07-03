"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SkillMintUser } from "@/lib/supabase/types";

type UseAuthSessionResult = {
  user: SkillMintUser | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
};

export function useAuthSession(): UseAuthSessionResult {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(configStatus.isConfigured);
  const [error, setError] = useState<string | null>(
    configStatus.isConfigured ? null : configStatus.message,
  );

  const refreshSession = useCallback(async () => {
    if (!configStatus.isConfigured) {
      setSession(null);
      setIsLoading(false);
      setError(configStatus.message);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setSession(null);
      setIsLoading(false);
      setError("Supabase auth client is unavailable.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setSession(null);
      setError(sessionError.message);
    } else {
      setSession(data.session);
    }

    setIsLoading(false);
  }, [configStatus.isConfigured, configStatus.message]);

  useEffect(() => {
    if (!configStatus.isConfigured) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      const timeoutId = window.setTimeout(() => {
        setIsLoading(false);
        setError("Supabase auth client is unavailable.");
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isMounted) {
        return;
      }

      if (sessionError) {
        setSession(null);
        setError(sessionError.message);
      } else {
        setSession(data.session);
        setError(null);
      }

      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setError(null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configStatus.isConfigured]);

  return {
    user: mapSessionToUser(session),
    session,
    isLoading,
    isConfigured: configStatus.isConfigured,
    error,
    refreshSession,
  };
}

function mapSessionToUser(session: Session | null): SkillMintUser | null {
  const user = session?.user;

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: getFullName(user.user_metadata),
  };
}

function getFullName(metadata: unknown): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    "full_name" in metadata &&
    typeof metadata.full_name === "string"
  ) {
    return metadata.full_name;
  }

  return null;
}
