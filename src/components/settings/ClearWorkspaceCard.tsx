"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  premiumDangerCta,
} from "@/components/ui/premium";
import { clearSkillMintWorkspace } from "@/lib/storage/clearSkillMintWorkspace";

const CONFIRM_CLEAR_WORKSPACE_MESSAGE =
  "This clears SkillMint data from this browser only. Your account and synced records are not deleted. Continue?";

export default function ClearWorkspaceCard() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  function handleClearWorkspace() {
    if (!window.confirm(CONFIRM_CLEAR_WORKSPACE_MESSAGE)) {
      return;
    }

    setIsClearing(true);
    const result = clearSkillMintWorkspace();
    setMessage(result.failedKeys.length
      ? `Removed ${result.removed} browser item(s), but ${result.failedKeys.length} item(s) could not be cleared. Your account was not deleted.`
      : "SkillMint data cleared from this browser. Your account and synced records were not deleted.");

    window.setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  }

  return (
    <article className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-950">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
        Browser workspace
      </p>

      <h2 className="mt-3 text-xl font-bold">
        Clear SkillMint data from this browser
      </h2>

      <p className="mt-3 text-sm leading-6">
        Removes registered SkillMint browser data: active resume analysis, JD
        matches, Active Target, roadmap state, beta feedback, and preferences
        saved in this browser. This does not delete your account or synced
        records.
      </p>

      <button
        type="button"
        onClick={handleClearWorkspace}
        disabled={isClearing}
        className={`${premiumDangerCta} mt-5`}
      >
        {isClearing ? "Clearing..." : "Clear browser data"}
      </button>

      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
          {message}
        </p>
      )}
    </article>
  );
}
