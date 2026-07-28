"use client";

import type { Database } from "@/lib/supabase/database.types";
import {
  authenticateResumeOwner,
  confirmResumeOwner,
  hasExactKeys,
  isRecord,
  isUuid,
  isValidTimestamp,
  parsePersistentResumeAnalysis,
  RESUME_ANALYSIS_COLUMNS,
  type ResumeSupabaseClient,
} from "@/modules/resume/services/resumeRepositorySupport";
import type {
  ClearWorkspaceResumeSelectionResult,
  PersistentResumeAnalysis,
  WorkspaceResumeRepositoryErrorReason,
  WorkspaceResumeRepositoryResult,
  WorkspaceResumeResolution,
  WorkspaceResumeSelection,
} from "@/modules/resume/types";

const SELECTION_COLUMNS = "user_id, resume_analysis_id, selected_at";
const SELECTION_ROW_KEYS = [
  "user_id",
  "resume_analysis_id",
  "selected_at",
] as const;
type WorkspaceSelectionInsert =
  Database["public"]["Tables"]["active_resume_selections"]["Insert"];
type WorkspaceSelectionUpdate =
  Database["public"]["Tables"]["active_resume_selections"]["Update"];
const WORKSPACE_IDENTITY_MESSAGES = {
  unauthenticated: "Sign in to manage your Workspace resume.",
  accountChanged:
    "Your account changed while the Workspace resume request was running.",
} as const;

export async function getCurrentUserWorkspaceResumeSelection(
  expectedUserId: string | null,
): Promise<
  WorkspaceResumeRepositoryResult<WorkspaceResumeSelection | null>
> {
  const authResult = await authenticateResumeOwner(
    expectedUserId,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const selectionResult = await readOwnedSelection(supabase, user.id);
  if (!selectionResult.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      selectionResult,
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return finalIdentity;
  }

  return selectionResult;
}

export async function resolveCurrentUserWorkspaceResume(
  expectedUserId: string | null,
): Promise<WorkspaceResumeRepositoryResult<WorkspaceResumeResolution>> {
  const authResult = await authenticateResumeOwner(
    expectedUserId,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const firstSelection = await readOwnedSelection(supabase, user.id);
  if (!firstSelection.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      firstSelection,
    );
  }

  if (!firstSelection.data) {
    const finalIdentity = await confirmResumeOwner(
      supabase,
      user.id,
      WORKSPACE_IDENTITY_MESSAGES,
    );
    return finalIdentity.ok
      ? {
          ok: true,
          data: {
            status: "none",
            selection: null,
            analysis: null,
          },
        }
      : finalIdentity;
  }

  const analysisResult = await readExactOwnedAnalysis(
    supabase,
    user.id,
    firstSelection.data.resumeAnalysisId,
  );
  if (!analysisResult.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      analysisResult,
    );
  }

  if (!analysisResult.data) {
    const confirmedSelection = await readOwnedSelection(
      supabase,
      user.id,
    );
    if (!confirmedSelection.ok) {
      return failureAfterIdentityConfirmation(
        supabase,
        user.id,
        confirmedSelection,
      );
    }

    const finalIdentity = await confirmResumeOwner(
      supabase,
      user.id,
      WORKSPACE_IDENTITY_MESSAGES,
    );
    if (!finalIdentity.ok) {
      return finalIdentity;
    }

    if (!confirmedSelection.data) {
      return {
        ok: true,
        data: {
          status: "none",
          selection: null,
          analysis: null,
        },
      };
    }

    if (
      confirmedSelection.data.resumeAnalysisId !==
        firstSelection.data.resumeAnalysisId ||
      confirmedSelection.data.selectedAt !== firstSelection.data.selectedAt
    ) {
      return workspaceFailure(
        "selection_conflict",
        "The Workspace resume changed while it was loading. Refresh and try again.",
      );
    }

    return {
      ok: true,
      data: {
        status: "source_deleted",
        selection: confirmedSelection.data,
        analysis: null,
      },
    };
  }

  const confirmedSelection = await readOwnedSelection(supabase, user.id);
  if (!confirmedSelection.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      confirmedSelection,
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return finalIdentity;
  }

  if (!confirmedSelection.data) {
    return {
      ok: true,
      data: {
        status: "none",
        selection: null,
        analysis: null,
      },
    };
  }

  if (
    confirmedSelection.data.resumeAnalysisId !==
      firstSelection.data.resumeAnalysisId ||
    confirmedSelection.data.selectedAt !== firstSelection.data.selectedAt
  ) {
    return workspaceFailure(
      "selection_conflict",
      "The Workspace resume changed while it was loading. Refresh and try again.",
    );
  }

  return {
    ok: true,
    data: {
      status: "selected",
      selection: confirmedSelection.data,
      analysis: analysisResult.data,
    },
  };
}

export async function setCurrentUserWorkspaceResumeSelection(
  resumeAnalysisId: string,
  expectedUserId: string | null,
): Promise<WorkspaceResumeRepositoryResult<WorkspaceResumeSelection>> {
  if (!isUuid(resumeAnalysisId)) {
    return workspaceFailure(
      "invalid_input",
      "The saved resume analysis identifier is invalid.",
    );
  }

  const authResult = await authenticateResumeOwner(
    expectedUserId,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const analysisResult = await readExactOwnedAnalysis(
    supabase,
    user.id,
    resumeAnalysisId,
  );
  if (!analysisResult.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      analysisResult,
    );
  }
  if (!analysisResult.data) {
    const finalIdentity = await confirmResumeOwner(
      supabase,
      user.id,
      WORKSPACE_IDENTITY_MESSAGES,
    );
    return finalIdentity.ok
      ? workspaceFailure(
          "source_missing",
          "This saved resume analysis no longer exists in your account.",
        )
      : finalIdentity;
  }

  const updateInput: WorkspaceSelectionUpdate = {
    resume_analysis_id: resumeAnalysisId,
  };

  // Direct update-then-insert matches the table's column privileges. The
  // primary key rejects competing initial inserts; replacements are
  // last-writer-wins. The final owner-qualified read below prevents this
  // request from reporting success if a competing request has already won.
  let updateResponse: Awaited<ReturnType<typeof executeSelectionUpdate>>;
  try {
    updateResponse = await executeSelectionUpdate(
      supabase,
      user.id,
      updateInput,
    );
  } catch {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      workspaceFailure(
        "provider_error",
        "Could not update the Workspace resume selection.",
      ),
    );
  }

  if (updateResponse.error) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      workspaceFailure(
        "provider_error",
        "Could not update the Workspace resume selection.",
      ),
    );
  }

  const updatedSelection = parseSingleSelectionResponse(
    updateResponse.data,
    user.id,
  );
  if (!updatedSelection.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      updatedSelection,
    );
  }

  let selection = updatedSelection.data;

  if (!selection) {
    const insertIdentity = await confirmResumeOwner(
      supabase,
      user.id,
      WORKSPACE_IDENTITY_MESSAGES,
    );
    if (!insertIdentity.ok) {
      return insertIdentity;
    }

    const insertInput: WorkspaceSelectionInsert = {
      user_id: user.id,
      resume_analysis_id: resumeAnalysisId,
    };

    let insertResponse: Awaited<ReturnType<typeof executeSelectionInsert>>;
    try {
      insertResponse = await executeSelectionInsert(supabase, insertInput);
    } catch {
      return failureAfterIdentityConfirmation(
        supabase,
        user.id,
        workspaceFailure(
          "provider_error",
          "Could not set the Workspace resume selection.",
        ),
      );
    }

    if (insertResponse.error) {
      const reason = insertResponse.error.code === "23505"
        ? "selection_conflict"
        : "provider_error";
      return failureAfterIdentityConfirmation(
        supabase,
        user.id,
        workspaceFailure(
          reason,
          reason === "selection_conflict"
            ? "The Workspace resume changed in another request. Refresh and try again."
            : "Could not set the Workspace resume selection.",
        ),
      );
    }

    const insertedSelection = parseSingleSelectionResponse(
      insertResponse.data,
      user.id,
    );
    if (!insertedSelection.ok) {
      return failureAfterIdentityConfirmation(
        supabase,
        user.id,
        insertedSelection,
      );
    }
    if (!insertedSelection.data) {
      return failureAfterIdentityConfirmation(
        supabase,
        user.id,
        workspaceFailure(
          "invalid_response",
          "Workspace resume selection returned no saved row.",
        ),
      );
    }

    selection = insertedSelection.data;
  }

  const confirmedSelection = await readOwnedSelection(supabase, user.id);
  if (!confirmedSelection.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      confirmedSelection,
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return finalIdentity;
  }

  if (
    selection.resumeAnalysisId !== resumeAnalysisId ||
    !confirmedSelection.data ||
    confirmedSelection.data.resumeAnalysisId !== resumeAnalysisId
  ) {
    return workspaceFailure(
      "selection_conflict",
      "The Workspace resume changed in another request. Refresh and try again.",
    );
  }

  return {
    ok: true,
    data: confirmedSelection.data,
  };
}

export async function clearCurrentUserWorkspaceResumeSelection(
  expectedUserId: string | null,
): Promise<
  WorkspaceResumeRepositoryResult<ClearWorkspaceResumeSelectionResult>
> {
  const authResult = await authenticateResumeOwner(
    expectedUserId,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;

  let response: Awaited<ReturnType<typeof executeSelectionDelete>>;
  try {
    response = await executeSelectionDelete(supabase, user.id);
  } catch {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      workspaceFailure(
        "provider_error",
        "Could not clear the Workspace resume selection.",
      ),
    );
  }

  if (response.error) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      workspaceFailure(
        "provider_error",
        "Could not clear the Workspace resume selection.",
      ),
    );
  }

  const deletedSelection = parseSingleSelectionResponse(
    response.data,
    user.id,
  );
  if (!deletedSelection.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      deletedSelection,
    );
  }

  // Clear is also verified with an owner-qualified reread so a concurrent
  // replacement cannot be reported as an unqualified successful clear.
  const remainingSelection = await readOwnedSelection(supabase, user.id);
  if (!remainingSelection.ok) {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      remainingSelection,
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return finalIdentity;
  }
  if (remainingSelection.data) {
    return workspaceFailure(
      "selection_conflict",
      "The Workspace resume changed in another request. Refresh and try again.",
    );
  }

  return {
    ok: true,
    data: {
      cleared: deletedSelection.data !== null,
      previousSelection: deletedSelection.data,
    },
  };
}

async function executeSelectionUpdate(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  input: WorkspaceSelectionUpdate,
) {
  return supabase
    .from("active_resume_selections")
    .update(input)
    .eq("user_id", ownerId)
    .select(SELECTION_COLUMNS)
    .limit(2);
}

async function executeSelectionInsert(
  supabase: ResumeSupabaseClient,
  input: WorkspaceSelectionInsert,
) {
  return supabase
    .from("active_resume_selections")
    .insert(input)
    .select(SELECTION_COLUMNS)
    .limit(2);
}

async function executeSelectionDelete(
  supabase: ResumeSupabaseClient,
  ownerId: string,
) {
  return supabase
    .from("active_resume_selections")
    .delete()
    .eq("user_id", ownerId)
    .select(SELECTION_COLUMNS)
    .limit(2);
}

async function readOwnedSelection(
  supabase: ResumeSupabaseClient,
  ownerId: string,
): Promise<
  WorkspaceResumeRepositoryResult<WorkspaceResumeSelection | null>
> {
  let response: Awaited<ReturnType<typeof executeSelectionRead>>;
  try {
    response = await executeSelectionRead(supabase, ownerId);
  } catch {
    return workspaceFailure(
      "provider_error",
      "Could not load the Workspace resume selection.",
    );
  }

  if (response.error) {
    return workspaceFailure(
      "provider_error",
      "Could not load the Workspace resume selection.",
    );
  }

  return parseSingleSelectionResponse(response.data, ownerId);
}

async function executeSelectionRead(
  supabase: ResumeSupabaseClient,
  ownerId: string,
) {
  return supabase
    .from("active_resume_selections")
    .select(SELECTION_COLUMNS)
    .eq("user_id", ownerId)
    .limit(2);
}

async function readExactOwnedAnalysis(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  analysisId: string,
): Promise<
  WorkspaceResumeRepositoryResult<PersistentResumeAnalysis | null>
> {
  let response: Awaited<ReturnType<typeof executeExactAnalysisRead>>;
  try {
    response = await executeExactAnalysisRead(
      supabase,
      ownerId,
      analysisId,
    );
  } catch {
    return workspaceFailure(
      "provider_error",
      "Could not resolve the selected saved resume analysis.",
    );
  }

  if (response.error) {
    return workspaceFailure(
      "provider_error",
      "Could not resolve the selected saved resume analysis.",
    );
  }

  if (!Array.isArray(response.data) || response.data.length > 1) {
    return workspaceFailure(
      "invalid_response",
      "Selected saved resume analysis returned an invalid response.",
    );
  }

  if (response.data.length === 0) {
    return {
      ok: true,
      data: null,
    };
  }

  const analysis = parsePersistentResumeAnalysis(response.data[0]);
  if (
    !analysis ||
    analysis.userId !== ownerId ||
    analysis.id !== analysisId
  ) {
    return workspaceFailure(
      "invalid_response",
      "Selected saved resume analysis returned an unexpected account owner.",
    );
  }

  return {
    ok: true,
    data: analysis,
  };
}

async function executeExactAnalysisRead(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  analysisId: string,
) {
  return supabase
    .from("resume_analyses")
    .select(RESUME_ANALYSIS_COLUMNS)
    .eq("user_id", ownerId)
    .eq("id", analysisId)
    .limit(2);
}

function parseSingleSelectionResponse(
  data: unknown,
  expectedOwnerId: string,
): WorkspaceResumeRepositoryResult<WorkspaceResumeSelection | null> {
  if (!Array.isArray(data) || data.length > 1) {
    return workspaceFailure(
      "invalid_response",
      "Workspace resume selection returned an invalid response.",
    );
  }

  if (data.length === 0) {
    return {
      ok: true,
      data: null,
    };
  }

  const selection = parseWorkspaceResumeSelection(data[0]);
  if (!selection || selection.userId !== expectedOwnerId) {
    return workspaceFailure(
      "invalid_response",
      "Workspace resume selection returned an unexpected account owner.",
    );
  }

  return {
    ok: true,
    data: selection,
  };
}

function parseWorkspaceResumeSelection(
  value: unknown,
): WorkspaceResumeSelection | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, SELECTION_ROW_KEYS) ||
    !isUuid(value.user_id) ||
    !isUuid(value.resume_analysis_id) ||
    !isValidTimestamp(value.selected_at)
  ) {
    return null;
  }

  return {
    userId: value.user_id,
    resumeAnalysisId: value.resume_analysis_id,
    selectedAt: value.selected_at,
  };
}

async function failureAfterIdentityConfirmation<T>(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  fallback: WorkspaceResumeRepositoryResult<T>,
): Promise<WorkspaceResumeRepositoryResult<T>> {
  const identity = await confirmResumeOwner(
    supabase,
    ownerId,
    WORKSPACE_IDENTITY_MESSAGES,
  );
  return identity.ok ? fallback : identity;
}

function workspaceFailure<T>(
  reason: WorkspaceResumeRepositoryErrorReason,
  error: string,
): WorkspaceResumeRepositoryResult<T> {
  return {
    ok: false,
    error,
    reason,
  };
}
