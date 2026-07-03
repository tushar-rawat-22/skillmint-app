"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";

type SignOutButtonProps = {
  className?: string;
};

export default function SignOutButton({
  className,
}: SignOutButtonProps) {
  const router = useRouter();
  const { user, isConfigured, isLoading } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  if (!isConfigured || isLoading || !user) {
    return null;
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase auth client is unavailable.");
      return;
    }

    setIsSigningOut(true);
    setError("");

    const { error: signOutError } = await supabase.auth.signOut();

    setIsSigningOut(false);

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={className ?? "rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-red-500/60 hover:text-red-200 disabled:cursor-not-allowed disabled:text-gray-500"}
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
