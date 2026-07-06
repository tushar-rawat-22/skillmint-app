"use client";

import { useSyncExternalStore } from "react";

import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  getTargetRoleSetup,
  TARGET_ROLE_SETUP_STORAGE_KEY,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";

export default function ProfileIdentityCard() {
  const { user, isConfigured, isLoading } = useAuthSession();
  const storedSetupVersion = useSyncExternalStore(
    subscribeToSkillMintWorkspaceUpdates,
    readStoredSetupVersion,
    getServerSnapshot,
  );
  const setup = storedSetupVersion ? getTargetRoleSetup() : null;
  const displayName = user?.fullName || getEmailName(user?.email) ||
    "SkillMint User";
  const displayEmail = user?.email ?? "Works in this browser";
  const targetRole = setup?.targetRole ?? "Career direction not set";
  const careerField = setup?.careerField
    ? formatOptionLabel(setup.careerField)
    : "Choose a field in Setup";

  return (
    <article className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-xl font-black text-emerald-100 shadow-[0_0_34px_rgba(16,185,129,0.12)]">
            {getInitials(displayName, user?.email)}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
              Profile Identity
            </p>

            <h2 className="mt-2 truncate text-2xl font-black text-white">
              {displayName}
            </h2>

            <p className="mt-1 break-words text-sm text-gray-400">
              {isLoading
                ? "Checking account..."
                : isConfigured
                  ? displayEmail
                  : "Account sync unavailable"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:min-w-72">
          <IdentitySignal
            label="Career direction"
            value={targetRole}
          />

          <IdentitySignal
            label="Career field"
            value={careerField}
          />
        </div>
      </div>
    </article>
  );
}

type IdentitySignalProps = {
  label: string;
  value: string;
};

function IdentitySignal({ label, value }: IdentitySignalProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function readStoredSetupVersion(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(TARGET_ROLE_SETUP_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): null {
  return null;
}

function getEmailName(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const [name] = email.split("@");

  return name || null;
}

function getInitials(name: string, email: string | null | undefined): string {
  const source = name === "SkillMint User" ? getEmailName(email) ?? name : name;
  const words = source
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean);

  if (!words.length) {
    return "SM";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "SM";
}

function formatOptionLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
