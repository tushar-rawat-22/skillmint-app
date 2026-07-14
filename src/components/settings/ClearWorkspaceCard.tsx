"use client";

import { useState } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  premiumDangerCta,
} from "@/components/ui/premium";
import { clearSkillMintWorkspace } from "@/lib/storage/clearSkillMintWorkspace";

export default function ClearWorkspaceCard() {
  const [message, setMessage] = useState("");
  const [hasClearError, setHasClearError] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  function handleClearWorkspace() {
    setIsClearing(true);
    const result = clearSkillMintWorkspace();
    setHasClearError(result.failedKeys.length > 0);
    setMessage(result.failedKeys.length
      ? `Removed ${result.removed} browser item(s), but ${result.failedKeys.length} item(s) could not be cleared. Your account was not deleted.`
      : "SkillMint data cleared from this browser. Your account and synced records were not deleted.");

    setIsClearing(false);
    setIsDialogOpen(false);
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
        Removes the current local workspace, signed-out or unassigned
        SkillMint workspace data, and other SkillMint account workspaces stored
        in this browser.
        This does not delete your account or account-synced records.
      </p>

      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={isClearing}
        className={`${premiumDangerCta} mt-5`}
      >
        {isClearing ? "Clearing..." : "Clear browser data"}
      </button>

      {message && (
        <p
          role={hasClearError ? "alert" : "status"}
          className={hasClearError
            ? "mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
            : "mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"}
        >
          {message}
        </p>
      )}

      <ConfirmDialog
        isOpen={isDialogOpen}
        title="Clear SkillMint data from this browser"
        confirmLabel="Clear browser data"
        isProcessing={isClearing}
        onConfirm={handleClearWorkspace}
        onClose={() => setIsDialogOpen(false)}
      >
        <p>
          This removes the current local workspace, signed-out or unassigned
          SkillMint workspace data, and other SkillMint account workspaces
          stored in this browser. It does not delete your SkillMint account or
          account-synced records.
        </p>
      </ConfirmDialog>
    </article>
  );
}
