export const ANALYTICS_EVENT_VERSION = 1 as const;
export const MAX_ANALYTICS_EVENT_BYTES = 1024;

export const ANALYTICS_EVENT_NAMES = Object.freeze([
  "career_setup_started",
  "resume_analysis_started",
  "resume_analysis_failed",
  "active_target_selected",
  "active_target_cleared",
  "jd_match_started",
  "jd_match_completed",
  "roadmap_reached",
  "mission_started",
  "mission_marked_done",
  "analysis_restored",
  "feedback_persisted",
  "product_operation_failed",
] as const);

export const ANALYTICS_ENVIRONMENTS = Object.freeze([
  "development",
  "test",
  "preview",
  "production",
] as const);

export const ANALYTICS_SOURCE_SCREENS = Object.freeze([
  "home",
  "login",
  "signup",
  "forgot_password",
  "reset_password",
  "career_setup",
  "resume_upload",
  "resume_report",
  "dashboard",
  "jd_match",
  "roadmap",
  "profile",
  "settings",
  "data_controls",
  "privacy",
] as const);

export const ANALYTICS_OWNER_MODES = Object.freeze([
  "anonymous",
  "account",
] as const);
export const ANALYTICS_FILE_TYPES = Object.freeze([
  "pdf",
  "docx",
  "txt",
  "unknown",
] as const);
export const ANALYTICS_DURATION_BUCKETS = Object.freeze([
  "under_1s",
  "1s_to_5s",
  "5s_to_15s",
  "15s_to_60s",
  "over_60s",
] as const);
export const ANALYTICS_TARGET_SOURCES = Object.freeze([
  "latest_jd",
  "profile_fit",
  "ultimate_goal",
  "manual",
] as const);
export const ANALYTICS_PATH_SOURCES = Object.freeze([
  "profile_fit",
  "latest_jd",
  "ultimate_goal",
  "global",
] as const);
export const ANALYTICS_MISSION_CATEGORIES = Object.freeze([
  "proof",
  "skill_backing",
  "project",
  "resume",
  "ats",
  "jd_match",
  "profile_fit",
  "goal_alignment",
  "impact",
  "portfolio",
] as const);
export const ANALYTICS_FEEDBACK_TYPES = Object.freeze([
  "bug",
  "confusion",
  "ui",
  "idea",
  "other",
] as const);
export const ANALYTICS_FEEDBACK_PERSISTENCE_PATHS = Object.freeze([
  "account",
  "browser",
  "browser_fallback",
] as const);
export const ANALYTICS_RESUME_ERROR_CODES = Object.freeze([
  "invalid_file_type",
  "file_too_large",
  "file_read_failed",
  "text_extraction_failed",
  "empty_resume",
  "analysis_failed",
  "storage_failed",
  "unknown",
] as const);
export const ANALYTICS_OPERATION_ERROR_CODES = Object.freeze([
  "invalid_input",
  "not_configured",
  "not_authenticated",
  "account_changed",
  "network_failure",
  "permission_denied",
  "schema_unavailable",
  "invalid_response",
  "owner_unresolved",
  "storage_unavailable",
  "storage_read_failed",
  "storage_corrupted",
  "storage_write_failed",
  "stale_context",
  "operation_unavailable",
  "unknown",
] as const);
export const ANALYTICS_PRODUCT_OPERATIONS = Object.freeze([
  "career_setup",
  "resume_analysis",
  "active_target_selection",
  "active_target_clear",
  "jd_match",
  "roadmap_load",
  "mission_status",
  "analysis_restore",
  "feedback_persistence",
] as const);

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];
export type AnalyticsEnvironment = typeof ANALYTICS_ENVIRONMENTS[number];
export type AnalyticsSourceScreen = typeof ANALYTICS_SOURCE_SCREENS[number];
export type AnalyticsOwnerMode = typeof ANALYTICS_OWNER_MODES[number];
export type AnalyticsFileType = typeof ANALYTICS_FILE_TYPES[number];
export type AnalyticsDurationBucket = typeof ANALYTICS_DURATION_BUCKETS[number];
export type AnalyticsTargetSource = typeof ANALYTICS_TARGET_SOURCES[number];
export type AnalyticsPathSource = typeof ANALYTICS_PATH_SOURCES[number];
export type AnalyticsMissionCategory = typeof ANALYTICS_MISSION_CATEGORIES[number];
export type AnalyticsFeedbackType = typeof ANALYTICS_FEEDBACK_TYPES[number];
export type AnalyticsFeedbackPersistencePath =
  typeof ANALYTICS_FEEDBACK_PERSISTENCE_PATHS[number];
export type AnalyticsResumeErrorCode =
  typeof ANALYTICS_RESUME_ERROR_CODES[number];
export type AnalyticsOperationErrorCode =
  typeof ANALYTICS_OPERATION_ERROR_CODES[number];
export type AnalyticsProductOperation =
  typeof ANALYTICS_PRODUCT_OPERATIONS[number];

export interface CareerSetupStartedProperties {
  readonly setup_mode: "create" | "edit";
}

export interface ResumeAnalysisStartedProperties {
  readonly file_type: AnalyticsFileType;
}

export interface ResumeAnalysisFailedProperties {
  readonly file_type: AnalyticsFileType;
  readonly error_code: AnalyticsResumeErrorCode;
  readonly duration_bucket?: AnalyticsDurationBucket;
}

export interface ActiveTargetSelectedProperties {
  readonly target_source: AnalyticsTargetSource;
  readonly selection_kind: "created" | "replaced";
}

export interface ActiveTargetClearedProperties {
  readonly prior_target_source: AnalyticsTargetSource;
}

export interface JdMatchStartedProperties {
  readonly [key: string]: never;
}

export interface JdMatchCompletedProperties {
  readonly duration_bucket?: AnalyticsDurationBucket;
}

export interface RoadmapReachedProperties {
  readonly path_source: AnalyticsPathSource;
}

export interface MissionStartedProperties {
  readonly mission_category: AnalyticsMissionCategory;
  readonly path_source: AnalyticsPathSource;
}

export interface MissionMarkedDoneProperties {
  readonly mission_category: AnalyticsMissionCategory;
  readonly path_source: AnalyticsPathSource;
}

export interface AnalysisRestoredProperties {
  readonly restore_kind: "latest" | "selected";
}

export interface FeedbackPersistedProperties {
  readonly persistence_path: AnalyticsFeedbackPersistencePath;
  readonly feedback_type: AnalyticsFeedbackType;
}

export interface ProductOperationFailedProperties {
  readonly operation: AnalyticsProductOperation;
  readonly error_code: AnalyticsOperationErrorCode;
  readonly duration_bucket?: AnalyticsDurationBucket;
}

export interface AnalyticsEventPropertiesByName {
  readonly career_setup_started: CareerSetupStartedProperties;
  readonly resume_analysis_started: ResumeAnalysisStartedProperties;
  readonly resume_analysis_failed: ResumeAnalysisFailedProperties;
  readonly active_target_selected: ActiveTargetSelectedProperties;
  readonly active_target_cleared: ActiveTargetClearedProperties;
  readonly jd_match_started: JdMatchStartedProperties;
  readonly jd_match_completed: JdMatchCompletedProperties;
  readonly roadmap_reached: RoadmapReachedProperties;
  readonly mission_started: MissionStartedProperties;
  readonly mission_marked_done: MissionMarkedDoneProperties;
  readonly analysis_restored: AnalysisRestoredProperties;
  readonly feedback_persisted: FeedbackPersistedProperties;
  readonly product_operation_failed: ProductOperationFailedProperties;
}

export interface AnalyticsEventEnvelope<Name extends AnalyticsEventName> {
  readonly event_id: string;
  readonly event_name: Name;
  readonly event_version: typeof ANALYTICS_EVENT_VERSION;
  readonly occurred_at: string;
  readonly environment: AnalyticsEnvironment;
  readonly build_id: string;
  readonly source_screen: AnalyticsSourceScreen;
  readonly owner_mode: AnalyticsOwnerMode;
  readonly properties: AnalyticsEventPropertiesByName[Name];
}

export type AnalyticsEvent = {
  readonly [Name in AnalyticsEventName]: AnalyticsEventEnvelope<Name>;
}[AnalyticsEventName];

export type AnalyticsEmitInput = {
  readonly [Name in AnalyticsEventName]: {
    readonly eventId: string;
    readonly eventName: Name;
    readonly sourceScreen: AnalyticsSourceScreen;
    readonly ownerMode: AnalyticsOwnerMode;
    readonly properties: AnalyticsEventPropertiesByName[Name];
  };
}[AnalyticsEventName];
