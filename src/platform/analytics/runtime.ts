import {
  type AnalyticsDurationBucket,
  type AnalyticsFeedbackPersistencePath,
  type AnalyticsFeedbackType,
  type AnalyticsFileType,
  type AnalyticsMissionCategory,
  type AnalyticsOperationErrorCode,
  type AnalyticsPathSource,
  type AnalyticsProductOperation,
  type AnalyticsResumeErrorCode,
  type AnalyticsSourceScreen,
  type AnalyticsTargetSource,
} from "./eventContract";
import {
  createAnalyticsEmitter,
  type AnalyticsClock,
  type AnalyticsEmitter,
} from "./emitter";
import { createHttpAnalyticsSink } from "./httpSink";
import { noOpAnalyticsSink, type AnalyticsSink } from "./sink";

type AnalyticsIdFactory = () => string;

export interface AnalyticsRuntimeConfiguration {
  readonly isAuthResolved: boolean;
  readonly hasAccount: boolean;
  readonly isBrowser: boolean;
  readonly environment: "development" | "test" | "preview" | "production";
  readonly buildId: string;
  readonly clock: AnalyticsClock;
  readonly createId: AnalyticsIdFactory;
  readonly sink: AnalyticsSink;
}

export interface BrowserAnalyticsContext {
  readonly isAuthResolved: boolean;
  readonly hasAccount: boolean;
}

export interface AnalyticsRuntime {
  careerSetupStarted(properties: { setup_mode: "create" | "edit" }): Promise<void>;
  resumeAnalysisStarted(properties: { file_type: AnalyticsFileType }): Promise<void>;
  resumeAnalysisFailed(properties: {
    file_type: AnalyticsFileType;
    error_code: AnalyticsResumeErrorCode;
    duration_bucket?: AnalyticsDurationBucket;
  }): Promise<void>;
  activeTargetSelected(properties: {
    target_source: AnalyticsTargetSource;
    selection_kind: "created" | "replaced";
  }): Promise<void>;
  activeTargetCleared(properties: { prior_target_source: AnalyticsTargetSource }): Promise<void>;
  jdMatchStarted(): Promise<void>;
  jdMatchCompleted(properties: { duration_bucket?: AnalyticsDurationBucket }): Promise<void>;
  roadmapReached(properties: { path_source: AnalyticsPathSource }): Promise<void>;
  missionStarted(properties: {
    mission_category: AnalyticsMissionCategory;
    path_source: AnalyticsPathSource;
  }): Promise<void>;
  missionMarkedDone(properties: {
    mission_category: AnalyticsMissionCategory;
    path_source: AnalyticsPathSource;
  }): Promise<void>;
  analysisRestored(
    sourceScreen: "dashboard" | "resume_report",
    properties: { restore_kind: "latest" | "selected" },
  ): Promise<void>;
  feedbackPersisted(
    sourceScreen: AnalyticsSourceScreen,
    properties: {
      persistence_path: AnalyticsFeedbackPersistencePath;
      feedback_type: AnalyticsFeedbackType;
    },
  ): Promise<void>;
  productOperationFailed(
    sourceScreen: AnalyticsSourceScreen,
    properties: {
      operation: AnalyticsProductOperation;
      error_code: AnalyticsOperationErrorCode;
      duration_bucket?: AnalyticsDurationBucket;
    },
  ): Promise<void>;
}

const browserRuntimes = new Map<"anonymous" | "account", AnalyticsRuntime>();
const disabledRuntime = createRuntimeMethods(null, () => "");
const browserAnalyticsCollectionEnabled =
  process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED === "true";

export function isBrowserAnalyticsCollectionEnabled(
  value: string | undefined,
): boolean {
  return value === "true";
}

export function createAnalyticsRuntime(
  configuration: AnalyticsRuntimeConfiguration,
): AnalyticsRuntime {
  if (!configuration.isBrowser || !configuration.isAuthResolved) {
    return disabledRuntime;
  }

  const emitter = createAnalyticsEmitter({
    environment: configuration.environment,
    buildId: configuration.buildId,
    clock: configuration.clock,
    sink: configuration.sink,
  });

  return createRuntimeMethods(emitter, configuration.createId, configuration.hasAccount);
}

export function getBrowserAnalyticsRuntime(
  context: BrowserAnalyticsContext,
): AnalyticsRuntime {
  if (!browserAnalyticsCollectionEnabled) {
    return disabledRuntime;
  }

  if (typeof window === "undefined" || !context.isAuthResolved) {
    return disabledRuntime;
  }

  const ownerMode = context.hasAccount ? "account" : "anonymous";
  const cached = browserRuntimes.get(ownerMode);
  if (cached) return cached;

  const runtime = createAnalyticsRuntime({
    isAuthResolved: true,
    hasAccount: context.hasAccount,
    isBrowser: true,
    environment: getBrowserEnvironment(),
    buildId: "browser-envelope",
    clock: () => new Date(),
    createId: () => globalThis.crypto.randomUUID(),
    sink: typeof globalThis.fetch === "function"
      ? createHttpAnalyticsSink()
      : noOpAnalyticsSink,
  });
  browserRuntimes.set(ownerMode, runtime);
  return runtime;
}

export function fireAndForgetAnalytics(action: () => Promise<void>): void {
  try {
    void action().catch(() => undefined);
  } catch {
    // Analytics is observational and must never affect the product action.
  }
}

function createRuntimeMethods(
  emitter: AnalyticsEmitter | null,
  createId: AnalyticsIdFactory,
  hasAccount = false,
): AnalyticsRuntime {
  const emit = async (
    eventName: Parameters<AnalyticsEmitter["emit"]>[0]["eventName"],
    sourceScreen: AnalyticsSourceScreen,
    properties: object,
  ): Promise<void> => {
    if (!emitter) return;
    try {
      await emitter.emit({
        eventId: createId(),
        eventName,
        sourceScreen,
        ownerMode: hasAccount ? "account" : "anonymous",
        properties,
      } as Parameters<AnalyticsEmitter["emit"]>[0]);
    } catch {
      // The emitter already contains failures; this also protects bad test adapters.
    }
  };

  const runtime: AnalyticsRuntime = {
    careerSetupStarted: (properties) => emit("career_setup_started", "career_setup", properties),
    resumeAnalysisStarted: (properties) => emit("resume_analysis_started", "resume_upload", properties),
    resumeAnalysisFailed: (properties) => emit("resume_analysis_failed", "resume_upload", properties),
    activeTargetSelected: (properties) => emit("active_target_selected", "jd_match", properties),
    activeTargetCleared: (properties) => emit("active_target_cleared", "jd_match", properties),
    jdMatchStarted: () => emit("jd_match_started", "jd_match", {}),
    jdMatchCompleted: (properties) => emit("jd_match_completed", "jd_match", properties),
    roadmapReached: (properties) => emit("roadmap_reached", "roadmap", properties),
    missionStarted: (properties) => emit("mission_started", "roadmap", properties),
    missionMarkedDone: (properties) => emit("mission_marked_done", "roadmap", properties),
    analysisRestored: (sourceScreen, properties) => emit("analysis_restored", sourceScreen, properties),
    feedbackPersisted: (sourceScreen, properties) => emit("feedback_persisted", sourceScreen, properties),
    productOperationFailed: (sourceScreen, properties) => emit("product_operation_failed", sourceScreen, properties),
  };
  return Object.freeze(runtime);
}

function getBrowserEnvironment(): "development" | "test" | "production" {
  if (process.env.NODE_ENV === "test") return "test";
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}
