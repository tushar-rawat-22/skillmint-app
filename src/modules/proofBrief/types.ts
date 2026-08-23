export type ProofBriefVisibility = "PRIVATE" | "LINK_ONLY";
export type ProofBriefSupportState = "STRONG" | "WEAK" | "UNCLEAR";

export type ProofBriefEvidenceSignal = {
  readonly state: ProofBriefSupportState;
  readonly label: string;
  readonly detail: string;
};

export type ProofBriefPayload = {
  readonly schemaVersion: 1;
  readonly direction: string;
  readonly currentSupport: string;
  readonly strongestSupport: string;
  readonly mainEvidenceGap: string;
  readonly bestNextMove: string;
  readonly evidenceSignals: readonly ProofBriefEvidenceSignal[];
  readonly sourceSummary: {
    readonly projectEntries: number;
    readonly experienceEntries: number;
    readonly evidenceCandidateLinks: number;
  };
};

export type CandidateProofBrief = {
  readonly id: string;
  readonly userId: string;
  readonly sourceResumeAnalysisId: string;
  readonly payload: ProofBriefPayload;
  readonly visibility: ProofBriefVisibility;
  readonly sharedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SharedProofBrief = {
  readonly payload: ProofBriefPayload;
  readonly sharedAt: string;
};
