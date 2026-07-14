"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { readVisibleStorageValue } from "@/lib/storage/ownedSkillMintStorage";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  getTargetRoleSetup,
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import type { TargetRoleSetup } from "@/modules/onboarding/types";

export default function CareerDirectionSummaryCard() {
  const {
    user,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
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
  const signals = getCareerDirectionSignals(setup);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Career Direction
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            {setup?.targetRole || "Choose your direction"}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Setup owns your role, field, goal, and weekly pace. Profile keeps it
            visible so SkillMint can frame guidance without editing your resume.
          </p>
        </div>

        <Link
          href="/setup"
          className="w-fit rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          Edit in Setup
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {signals.map((signal) => (
          <div
            key={signal.label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {signal.label}
            </p>

            <p className="mt-2 break-words text-sm font-bold text-slate-950">
              {signal.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function getCareerDirectionSignals(setup: TargetRoleSetup | null): Array<{
  label: string;
  value: string;
}> {
  return [
    {
      label: "Career field",
      value: setup?.careerField
        ? formatOptionLabel(setup.careerField)
        : "Not selected yet",
    },
    {
      label: "Experience level",
      value: setup?.experienceLevel
        ? formatOptionLabel(setup.experienceLevel)
        : "Not selected yet",
    },
    {
      label: "Goal",
      value: setup?.primaryGoal
        ? formatOptionLabel(setup.primaryGoal)
        : "Not selected yet",
    },
    {
      label: "Weekly pace",
      value: setup?.weeklyTimeCommitment
        ? formatOptionLabel(setup.weeklyTimeCommitment)
        : "Not selected yet",
    },
  ];
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

function formatOptionLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
