const MAX_EVIDENCE_ITEMS = 500;
const MAX_SKILL_LABEL_LENGTH = 120;
const MAX_SKILL_OUTPUT_ITEMS = 100;

export const RESUME_COMPARISON_LINK_TYPES = [
  "github",
  "linkedin",
  "portfolio",
  "leetcode",
  "codeforces",
] as const;

export const RESUME_COMPARISON_FLAG_TYPES = [
  "hasMeasurableImpact",
  "hasSectionClarity",
  "hasProofLink",
  "hasGenericProjects",
] as const;

export type ResumeComparisonLinkType =
  typeof RESUME_COMPARISON_LINK_TYPES[number];

export type ResumeComparisonFlagType =
  typeof RESUME_COMPARISON_FLAG_TYPES[number];

export type ResumeComparisonEvidenceState =
  | "detected"
  | "not_detected"
  | "unavailable";

export type ResumeComparisonVersionStatus = "not_recorded";

export type ResumeComparisonEvidenceInput = {
  id: string;
  fileName: string;
  savedAt: string;
  skills: unknown;
  projects: unknown;
  experience: unknown;
  certifications: unknown;
  links: Record<ResumeComparisonLinkType, unknown>;
  flags: Record<ResumeComparisonFlagType, unknown>;
  placeholderText: unknown;
};

export type ResumeComparisonSourceContext = {
  id: string;
  fileName: string;
  savedAt: string;
  versionStatus: ResumeComparisonVersionStatus;
};

export type ResumeComparisonAvailableValue<T> = {
  status: "available";
  value: T;
};

export type ResumeComparisonUnavailableValue = {
  status: "unavailable";
};

export type ResumeComparisonEvidenceValue<T> =
  | ResumeComparisonAvailableValue<T>
  | ResumeComparisonUnavailableValue;

type CanonicalSkill = {
  key: string;
  label: string;
};

export type ValidatedResumeComparisonEvidence = {
  context: ResumeComparisonSourceContext;
  skills: ResumeComparisonEvidenceValue<readonly CanonicalSkill[]>;
  projectCount: ResumeComparisonEvidenceValue<number>;
  experienceCount: ResumeComparisonEvidenceValue<number>;
  certificationCount: ResumeComparisonEvidenceValue<number>;
  links: Record<
    ResumeComparisonLinkType,
    ResumeComparisonEvidenceState
  >;
  flags: Record<
    ResumeComparisonFlagType,
    ResumeComparisonEvidenceState
  >;
  placeholderText: ResumeComparisonEvidenceState;
};

export type ResumeComparisonSkillDifference =
  | {
      status: "available";
      retained: string[];
      onlyInSourceA: string[];
      onlyInSourceB: string[];
      truncated: boolean;
    }
  | {
      status: "unavailable";
      sourceA: "available" | "unavailable";
      sourceB: "available" | "unavailable";
    };

export type ResumeComparisonCountDifference =
  | {
      status: "available";
      sourceA: number;
      sourceB: number;
      delta: number;
    }
  | {
      status: "unavailable";
      sourceA: ResumeComparisonEvidenceValue<number>;
      sourceB: ResumeComparisonEvidenceValue<number>;
    };

export type ResumeComparisonSignalDifference = {
  sourceA: ResumeComparisonEvidenceState;
  sourceB: ResumeComparisonEvidenceState;
  change:
    | "retained"
    | "absent_in_both"
    | "only_in_source_a"
    | "only_in_source_b"
    | "unavailable";
};

export type ResumeEvidenceComparison =
  | {
      status: "comparable";
      sourceA: ResumeComparisonSourceContext;
      sourceB: ResumeComparisonSourceContext;
      skills: ResumeComparisonSkillDifference;
      counts: {
        projects: ResumeComparisonCountDifference;
        experience: ResumeComparisonCountDifference;
        certifications: ResumeComparisonCountDifference;
      };
      links: Record<
        ResumeComparisonLinkType,
        ResumeComparisonSignalDifference
      >;
      flags: Record<
        ResumeComparisonFlagType,
        ResumeComparisonSignalDifference
      >;
    }
  | {
      status: "unusable_evidence";
      sourceA: ResumeComparisonSourceContext;
      sourceB: ResumeComparisonSourceContext;
      unusableSources: Array<"sourceA" | "sourceB">;
      reason: "placeholder_text";
    };

export function validateResumeComparisonEvidence(
  source: ResumeComparisonEvidenceInput,
): ValidatedResumeComparisonEvidence {
  return {
    context: {
      id: source.id,
      fileName: source.fileName,
      savedAt: source.savedAt,
      versionStatus: "not_recorded",
    },
    skills: readSkills(source.skills),
    projectCount: readStringArrayCount(source.projects),
    experienceCount: readStringArrayCount(source.experience),
    certificationCount: readStringArrayCount(source.certifications),
    links: readLinkStates(source.links),
    flags: readFlagStates(source.flags),
    placeholderText: readBooleanState(source.placeholderText),
  };
}

export function compareResumeEvidence(
  evidenceA: ValidatedResumeComparisonEvidence,
  evidenceB: ValidatedResumeComparisonEvidence,
): ResumeEvidenceComparison {
  const unusableSources: Array<"sourceA" | "sourceB"> = [];

  if (evidenceA.placeholderText === "detected") {
    unusableSources.push("sourceA");
  }
  if (evidenceB.placeholderText === "detected") {
    unusableSources.push("sourceB");
  }

  if (unusableSources.length > 0) {
    return {
      status: "unusable_evidence",
      sourceA: evidenceA.context,
      sourceB: evidenceB.context,
      unusableSources,
      reason: "placeholder_text",
    };
  }

  return {
    status: "comparable",
    sourceA: evidenceA.context,
    sourceB: evidenceB.context,
    skills: compareSkills(evidenceA.skills, evidenceB.skills),
    counts: {
      projects: compareCounts(
        evidenceA.projectCount,
        evidenceB.projectCount,
      ),
      experience: compareCounts(
        evidenceA.experienceCount,
        evidenceB.experienceCount,
      ),
      certifications: compareCounts(
        evidenceA.certificationCount,
        evidenceB.certificationCount,
      ),
    },
    links: mapSignalComparisons(
      RESUME_COMPARISON_LINK_TYPES,
      evidenceA.links,
      evidenceB.links,
    ),
    flags: mapSignalComparisons(
      RESUME_COMPARISON_FLAG_TYPES,
      evidenceA.flags,
      evidenceB.flags,
    ),
  };
}

function readSkills(
  value: unknown,
): ResumeComparisonEvidenceValue<readonly CanonicalSkill[]> {
  const values = readValidatedStringArray(
    value,
    MAX_SKILL_LABEL_LENGTH,
  );
  if (!values) {
    return unavailable();
  }

  const byKey = new Map<string, string>();
  for (const label of values) {
    const key = label.toLocaleLowerCase("en-US");
    const existing = byKey.get(key);
    if (!existing || compareReadableLabels(label, existing) < 0) {
      byKey.set(key, label);
    }
  }

  const skills = [...byKey.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([key, label]) => ({ key, label }));

  return available(skills);
}

function readStringArrayCount(
  value: unknown,
): ResumeComparisonEvidenceValue<number> {
  const values = readValidatedStringArray(value);
  return values ? available(values.length) : unavailable();
}

function readValidatedStringArray(
  value: unknown,
  maximumLabelLength?: number,
): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length > MAX_EVIDENCE_ITEMS
  ) {
    return null;
  }

  const normalizedValues: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }

    const normalizedValue = normalizeEvidenceText(item);
    if (
      !normalizedValue ||
      (
        maximumLabelLength !== undefined &&
        normalizedValue.length > maximumLabelLength
      )
    ) {
      return null;
    }
    normalizedValues.push(normalizedValue);
  }

  return normalizedValues;
}

function readLinkStates(
  links: Record<ResumeComparisonLinkType, unknown>,
): Record<ResumeComparisonLinkType, ResumeComparisonEvidenceState> {
  return Object.fromEntries(
    RESUME_COMPARISON_LINK_TYPES.map((key) => [
      key,
      readStringPresence(links[key]),
    ]),
  ) as Record<
    ResumeComparisonLinkType,
    ResumeComparisonEvidenceState
  >;
}

function readFlagStates(
  flags: Record<ResumeComparisonFlagType, unknown>,
): Record<ResumeComparisonFlagType, ResumeComparisonEvidenceState> {
  return Object.fromEntries(
    RESUME_COMPARISON_FLAG_TYPES.map((key) => [
      key,
      readBooleanState(flags[key]),
    ]),
  ) as Record<
    ResumeComparisonFlagType,
    ResumeComparisonEvidenceState
  >;
}

function readStringPresence(
  value: unknown,
): ResumeComparisonEvidenceState {
  if (value === null) {
    return "not_detected";
  }

  if (typeof value !== "string") {
    return "unavailable";
  }

  return value.trim() ? "detected" : "not_detected";
}

function readBooleanState(
  value: unknown,
): ResumeComparisonEvidenceState {
  if (typeof value !== "boolean") {
    return "unavailable";
  }

  return value ? "detected" : "not_detected";
}

function compareSkills(
  sourceA: ResumeComparisonEvidenceValue<readonly CanonicalSkill[]>,
  sourceB: ResumeComparisonEvidenceValue<readonly CanonicalSkill[]>,
): ResumeComparisonSkillDifference {
  if (sourceA.status !== "available" || sourceB.status !== "available") {
    return {
      status: "unavailable",
      sourceA: sourceA.status,
      sourceB: sourceB.status,
    };
  }

  const sourceAMap = new Map(
    sourceA.value.map((skill) => [skill.key, skill.label]),
  );
  const sourceBMap = new Map(
    sourceB.value.map((skill) => [skill.key, skill.label]),
  );
  const retained: string[] = [];
  const onlyInSourceA: string[] = [];
  const onlyInSourceB: string[] = [];

  for (const [key, label] of sourceAMap) {
    const sourceBLabel = sourceBMap.get(key);
    if (sourceBLabel === undefined) {
      onlyInSourceA.push(label);
    } else {
      retained.push(label);
    }
  }

  for (const [key, label] of sourceBMap) {
    if (!sourceAMap.has(key)) {
      onlyInSourceB.push(label);
    }
  }

  retained.sort(compareReadableLabels);
  onlyInSourceA.sort(compareReadableLabels);
  onlyInSourceB.sort(compareReadableLabels);

  const truncated =
    retained.length > MAX_SKILL_OUTPUT_ITEMS ||
    onlyInSourceA.length > MAX_SKILL_OUTPUT_ITEMS ||
    onlyInSourceB.length > MAX_SKILL_OUTPUT_ITEMS;

  return {
    status: "available",
    retained: retained.slice(0, MAX_SKILL_OUTPUT_ITEMS),
    onlyInSourceA: onlyInSourceA.slice(0, MAX_SKILL_OUTPUT_ITEMS),
    onlyInSourceB: onlyInSourceB.slice(0, MAX_SKILL_OUTPUT_ITEMS),
    truncated,
  };
}

function compareCounts(
  sourceA: ResumeComparisonEvidenceValue<number>,
  sourceB: ResumeComparisonEvidenceValue<number>,
): ResumeComparisonCountDifference {
  if (sourceA.status !== "available" || sourceB.status !== "available") {
    return {
      status: "unavailable",
      sourceA,
      sourceB,
    };
  }

  return {
    status: "available",
    sourceA: sourceA.value,
    sourceB: sourceB.value,
    delta: sourceB.value - sourceA.value,
  };
}

function mapSignalComparisons<T extends string>(
  keys: readonly T[],
  sourceA: Record<T, ResumeComparisonEvidenceState>,
  sourceB: Record<T, ResumeComparisonEvidenceState>,
): Record<T, ResumeComparisonSignalDifference> {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      compareSignal(sourceA[key], sourceB[key]),
    ]),
  ) as Record<T, ResumeComparisonSignalDifference>;
}

function compareSignal(
  sourceA: ResumeComparisonEvidenceState,
  sourceB: ResumeComparisonEvidenceState,
): ResumeComparisonSignalDifference {
  if (sourceA === "unavailable" || sourceB === "unavailable") {
    return {
      sourceA,
      sourceB,
      change: "unavailable",
    };
  }

  if (sourceA === "detected" && sourceB === "detected") {
    return {
      sourceA,
      sourceB,
      change: "retained",
    };
  }

  if (sourceA === "not_detected" && sourceB === "not_detected") {
    return {
      sourceA,
      sourceB,
      change: "absent_in_both",
    };
  }

  return {
    sourceA,
    sourceB,
    change: sourceA === "detected"
      ? "only_in_source_a"
      : "only_in_source_b",
  };
}

function normalizeEvidenceText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function compareReadableLabels(left: string, right: string): number {
  const normalizedLeft = left.toLocaleLowerCase("en-US");
  const normalizedRight = right.toLocaleLowerCase("en-US");
  const normalizedComparison = compareStrings(
    normalizedLeft,
    normalizedRight,
  );
  return normalizedComparison || compareStrings(left, right);
}

function compareStrings(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function available<T>(value: T): ResumeComparisonAvailableValue<T> {
  return {
    status: "available",
    value,
  };
}

function unavailable(): ResumeComparisonUnavailableValue {
  return {
    status: "unavailable",
  };
}
