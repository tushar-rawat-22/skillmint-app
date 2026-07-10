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
        className={className ?? "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-400"}
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
