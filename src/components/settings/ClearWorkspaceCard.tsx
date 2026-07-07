"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clearSkillMintWorkspace } from "@/lib/storage/clearSkillMintWorkspace";

const CONFIRM_CLEAR_WORKSPACE_MESSAGE =
  "This clears the active SkillMint workspace from this browser. Your account is not deleted. Continue?";

export default function ClearWorkspaceCard() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  function handleClearWorkspace() {
    if (!window.confirm(CONFIRM_CLEAR_WORKSPACE_MESSAGE)) {
      return;
    }

    setIsClearing(true);
    clearSkillMintWorkspace();
    setMessage(
      "Active workspace cleared from this browser. Your account and synced history were not deleted.",
    );

    window.setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  }

  return (
    <article className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-200/70">
        Browser workspace
      </p>

      <h2 className="mt-3 text-xl font-bold text-white">
        Clear active workspace
      </h2>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        Clears the active resume analysis, JD matches, roadmap state, beta
        feedback, and upgrade interest saved in this browser. This does not
        delete your account or synced history.
      </p>

      <button
        type="button"
        onClick={handleClearWorkspace}
        disabled={isClearing}
        className="mt-5 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-100 transition hover:border-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isClearing ? "Clearing..." : "Clear active workspace"}
      </button>

      {message && (
        <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-100">
          {message}
        </p>
      )}
    </article>
  );
}
