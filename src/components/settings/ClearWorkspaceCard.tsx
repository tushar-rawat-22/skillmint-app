"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  premiumDangerCta,
} from "@/components/ui/premium";
import { clearSkillMintWorkspace } from "@/lib/storage/clearSkillMintWorkspace";

const CONFIRM_CLEAR_WORKSPACE_MESSAGE =
  "This clears the active browser workspace only. Your account and synced history are not deleted. Continue?";

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
    <article className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-950">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
        Browser workspace
      </p>

      <h2 className="mt-3 text-xl font-bold">
        Clear active workspace
      </h2>

      <p className="mt-3 text-sm leading-6">
        Clears the active browser workspace: active resume analysis, JD
        matches, roadmap state, beta feedback, and upgrade interest saved in
        this browser. This does not delete your account or synced history.
      </p>

      <button
        type="button"
        onClick={handleClearWorkspace}
        disabled={isClearing}
        className={`${premiumDangerCta} mt-5`}
      >
        {isClearing ? "Clearing..." : "Clear active workspace"}
      </button>

      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
          {message}
        </p>
      )}
    </article>
  );
}
