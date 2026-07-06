"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import {
  getTargetRoleSetup,
  TARGET_ROLE_SETUP_STORAGE_KEY,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import type { TargetRoleSetup } from "@/modules/onboarding/types";

export default function CareerDirectionSummaryCard() {
  const storedSetupVersion = useSyncExternalStore(
    subscribeToSkillMintWorkspaceUpdates,
    readStoredSetupVersion,
    getServerSnapshot,
  );
  const setup = storedSetupVersion ? getTargetRoleSetup() : null;
  const signals = getCareerDirectionSignals(setup);

  return (
    <article className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            Career Direction
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">
            {setup?.targetRole || "Choose your direction"}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Setup owns your role, field, goal, and weekly pace. Profile keeps it
            visible so SkillMint can frame guidance without editing your resume.
          </p>
        </div>

        <Link
          href="/setup"
          className="w-fit rounded-xl border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-white"
        >
          Edit in Setup
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {signals.map((signal) => (
          <div
            key={signal.label}
            className="rounded-2xl border border-white/10 bg-black/25 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              {signal.label}
            </p>

            <p className="mt-2 break-words text-sm font-bold text-white">
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

function formatOptionLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
