"use client";

import { useSyncExternalStore } from "react";

import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { readVisibleStorageValue } from "@/lib/storage/ownedSkillMintStorage";
import {
  getTargetRoleSetup,
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";

export default function ProfileIdentityCard() {
  const { user, isConfigured, isLoading } = useAuthSession();
  const currentUserId = isLoading ? undefined : user?.id ?? null;
  const storedSetupVersion = useSyncExternalStore(
    subscribeToSkillMintWorkspaceUpdates,
    () => readStoredSetupVersion(currentUserId),
    getServerSnapshot,
  );
  const setup = storedSetupVersion
    ? getTargetRoleSetup({
        currentUserId,
      })
    : null;
  const displayName = user?.fullName || getEmailName(user?.email) ||
    "SkillMint User";
  const displayEmail = user?.email ?? "Works in this browser";
  const targetRole = setup?.targetRole ?? "Career direction not set";
  const careerField = setup?.careerField
    ? formatOptionLabel(setup.careerField)
    : "Choose a field in Setup";

  return (
    <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-white text-xl font-black text-emerald-800 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            {getInitials(displayName, user?.email)}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Profile Identity
            </p>

            <h2 className="mt-2 truncate text-2xl font-black text-slate-950">
              {displayName}
            </h2>

            <p className="mt-1 break-words text-sm text-slate-600">
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
    <div className="rounded-2xl border border-emerald-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function readStoredSetupVersion(
  currentUserId: string | null | undefined,
): string | null {
  return readVisibleStorageValue(TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR, {
    currentUserId,
  });
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
