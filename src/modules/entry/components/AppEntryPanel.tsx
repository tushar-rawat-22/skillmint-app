"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { ROUTES } from "@/constants/routes";
import {
  readCurrentJobMatchSnapshot,
} from "@/lib/storage/jdMatchCurrentStorage";
import { readVisibleStorageValue } from "@/lib/storage/ownedSkillMintStorage";
import {
  subscribeToSkillMintWorkspaceUpdates,
} from "@/lib/storage/skillMintStorageEvents";
import {
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import {
  readActiveResumeReportSnapshot,
} from "@/modules/resume/services/activeResumeReportStorage";

type EntryState = {
  hasSetup: boolean;
  hasResumeAnalysis: boolean;
  hasJobMatch: boolean;
};

type EntrySuggestion = {
  href: string;
  label: string;
  title: string;
  body: string;
};

export default function AppEntryPanel() {
  const storedSetup = useSyncExternalStore(
    subscribeToStoredData,
    readStoredSetup,
    getServerSnapshot,
  );
  const storedResume = useSyncExternalStore(
    subscribeToStoredData,
    readStoredResume,
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    readStoredJobMatch,
    getServerSnapshot,
  );
  const entryState = useMemo<EntryState>(() => ({
    hasSetup: hasValidSetup(storedSetup),
    hasResumeAnalysis: hasValidResume(storedResume),
    hasJobMatch: hasValidJobMatch(storedJobMatch),
  }), [storedJobMatch, storedResume, storedSetup]);
  const suggestion = getEntrySuggestion(entryState);

  return (
    <section className="border-y border-gray-800 bg-black px-6 py-10">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-green-400">
            Continue where you left off
          </p>

          <h2 className="mt-3 text-2xl font-bold text-white">
            {suggestion.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            {suggestion.body}
          </p>

          <p className="mt-3 max-w-3xl text-xs leading-5 text-gray-500">
            SkillMint works in this browser first. Sign in later to sync your resume
            analyses, job matches, and roadmap.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href={suggestion.href}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
          >
            {suggestion.label}
          </Link>

          <Link
            href={ROUTES.DASHBOARD}
            className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

function getEntrySuggestion(state: EntryState): EntrySuggestion {
  if (!state.hasSetup) {
    return {
      href: ROUTES.SETUP,
      label: "Start Career Setup",
      title: "Start with a career direction.",
      body:
        "Choose your target role, goal, and weekly pace before SkillMint turns your resume into next steps.",
    };
  }

  if (!state.hasResumeAnalysis) {
    return {
      href: ROUTES.UPLOAD,
      label: "Upload Resume",
      title: "Your direction is set. Upload your resume next.",
      body:
        "Resume intelligence gives SkillMint the evidence it needs before ATS matching or roadmap planning.",
    };
  }

  if (!state.hasJobMatch) {
    return {
      href: ROUTES.ATS,
      label: "Match a Job Description",
      title: "You have resume intelligence. Match a real job next.",
      body:
        "Paste a job description to see where you are competitive and what proof is still missing.",
    };
  }

  return {
    href: ROUTES.ROADMAP,
    label: "Open Roadmap",
    title: "Your job match is ready. Build the roadmap.",
    body:
      "Turn your resume and latest job match into a practical 30/60/90-day plan.",
  };
}

function subscribeToStoredData(onStoreChange: () => void): () => void {
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredSetup(): string | null {
  return readVisibleStorageValue(TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR, {
    currentUserId: null,
  });
}

function readStoredResume(): string | null {
  return readActiveResumeReportSnapshot({
    currentUserId: null,
  });
}

function readStoredJobMatch(): string | null {
  return readCurrentJobMatchSnapshot({
    currentUserId: null,
  });
}

function getServerSnapshot(): null {
  return null;
}
function hasValidSetup(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      typeof parsedValue.targetRole === "string" &&
      parsedValue.targetRole.trim().length > 0,
  );
}

function hasValidResume(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      (
        typeof parsedValue.extractedText === "string" ||
        isRecord(parsedValue.userProfile) ||
        isRecord(parsedValue.parsedProfile)
      ),
  );
}

function hasValidJobMatch(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      isRecord(parsedValue.result) &&
      typeof parsedValue.result.matchScore === "number",
  );
}

function parseRecord(storedValue: string | null): Record<string, unknown> | null {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return isRecord(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
