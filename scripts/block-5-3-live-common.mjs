import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import pg from "pg";

export const LIVE_ARTIFACT_MAX_AGE_MS = 30 * 60 * 1000;
export const SECURITY_CONFIRMATION = "SKILLMINT BLOCK 5.3 DISPOSABLE SECURITY";
export const AUTHORIZED_PROJECT_REF_SHA256 =
  "ff15e0b7e0699288a6e0d171f6e751cf8ef215e7a3c2980b7d57e4a24ba1229b";
export const FORBIDDEN_PROJECT_REF_SHA256 =
  "c84507eaec854938ead288cde83dc20ab34fd75a339df1efe16bc61c1ef9ad30";
export const ACCOUNT_TABLES = [
  "profiles",
  "resume_analyses",
  "job_matches",
  "career_snapshots",
  "beta_feedback",
];
export const OPERATION_MATRIX = Object.freeze({
  profiles: Object.freeze(["select", "insert", "update"]),
  resume_analyses: Object.freeze(["select", "insert", "delete"]),
  job_matches: Object.freeze(["select", "insert", "update", "delete"]),
  career_snapshots: Object.freeze(["select"]),
  beta_feedback: Object.freeze(["select", "insert"]),
});

const EXPECTED_REF_ENV = "SKILLMINT_EXPECTED_SUPABASE_PROJECT_REF";
const FORBIDDEN_REF_ENV = "SKILLMINT_FORBIDDEN_PRODUCTION_PROJECT_REF";
const FORBIDDEN_ARTIFACT_KEY = /(?:url|origin|host|username|connection|string|password|secret|token|cookie|authorization|email|raw.?id|user.?id|account.?id|row.?data|publishable.?key)$/i;
const FORBIDDEN_ARTIFACT_VALUE = /(?:https?:\/\/|postgres(?:ql)?:\/\/|\bBearer\s+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b)/i;
const FORBIDDEN_PROVIDER_ARTIFACT_KEYS = new Set(
  ["response", "payload", "error", "headers", "body", "request"].flatMap(
    (family) => [`provider${family}`, `rawprovider${family}`],
  ),
);

export function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) refuse("malformed_argument");
    const separator = raw.indexOf("=");
    const key = separator < 0 ? raw.slice(2) : raw.slice(2, separator);
    const value = separator < 0 ? true : raw.slice(separator + 1);
    if (!key || Object.hasOwn(args, key)) refuse("duplicate_or_empty_argument");
    args[key] = value;
  }
  return args;
}

export function rejectArbitraryTargets(args) {
  for (const key of [
    "user-id",
    "target-user-id",
    "account-id",
    "target-email",
    "email",
  ]) {
    if (Object.hasOwn(args, key)) refuse("arbitrary_target_rejected");
  }
}

export function requireString(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) refuse(`missing_${key}`);
  return value.trim();
}

export function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function resolveSafeTarget(environment = process.env) {
  const expectedRef = (environment[EXPECTED_REF_ENV] ?? "").trim();
  const forbiddenRef = (environment[FORBIDDEN_REF_ENV] ?? "").trim();
  const projectUrl = (environment.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const publishableKey = (
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  ).trim();
  const secretKey = (environment.SUPABASE_SECRET_KEY ?? "").trim();
  const databaseUrl = (environment.SUPABASE_DB_URL ?? "").trim();

  if (
    sha256(expectedRef) !== AUTHORIZED_PROJECT_REF_SHA256 ||
    sha256(forbiddenRef) !== FORBIDDEN_PROJECT_REF_SHA256 ||
    expectedRef === forbiddenRef
  ) refuse("target_authority_mismatch");
  if (!projectUrl || !publishableKey || !secretKey || !databaseUrl) {
    refuse("malformed_configuration");
  }

  let project;
  let database;
  try {
    project = new URL(projectUrl);
    database = new URL(databaseUrl);
  } catch {
    refuse("malformed_configuration");
  }
  if (
    project.protocol !== "https:" ||
    project.hostname !== `${expectedRef}.supabase.co` ||
    project.username ||
    project.password ||
    project.pathname !== "/" ||
    project.search ||
    project.hash
  ) refuse("target_mismatch");
  if (!`${database.hostname}|${decodeURIComponent(database.username)}`.includes(expectedRef)) {
    refuse("database_target_mismatch");
  }
  const connectionValues = [
    projectUrl,
    databaseUrl,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    environment.SUPABASE_SERVICE_ROLE_KEY ?? "",
    environment.DATABASE_URL ?? "",
    environment.POSTGRES_URL ?? "",
  ];
  if (connectionValues.some((value) => String(value).includes(forbiddenRef))) {
    refuse("production_target_blocked");
  }

  return Object.freeze({
    projectOrigin: project.origin,
    projectReferenceSha256: AUTHORIZED_PROJECT_REF_SHA256,
    publishableKey,
    secretKey,
    databaseUrl,
    expectedRef,
    forbiddenRef,
  });
}

export function buildSanitizedChildEnv(target, overrides = {}) {
  const safe = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    SHELL: process.env.SHELL ?? "/bin/sh",
    NODE_ENV: overrides.NODE_ENV ?? "test",
    NEXT_TELEMETRY_DISABLED: "1",
    FORCE_COLOR: "0",
    [EXPECTED_REF_ENV]: target.expectedRef,
    [FORBIDDEN_REF_ENV]: target.forbiddenRef,
    NEXT_PUBLIC_SUPABASE_URL: target.projectOrigin,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: target.publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: target.publishableKey,
    SUPABASE_SECRET_KEY: target.secretKey,
    SUPABASE_SERVICE_ROLE_KEY: target.secretKey,
    SUPABASE_DB_URL: target.databaseUrl,
    DATABASE_URL: target.databaseUrl,
    POSTGRES_URL: target.databaseUrl,
    ...overrides,
  };
  resolveSafeTarget(safe);
  return safe;
}

export function createDatabaseClient(target, options = {}) {
  resolveSafeTarget(buildSanitizedChildEnv(target));
  return new pg.Client({
    connectionString: target.databaseUrl,
    application_name: options.applicationName ?? "skillmint_block5_verifier",
    statement_timeout: options.statementTimeout ?? 20_000,
    query_timeout: options.queryTimeout ?? 30_000,
    ssl: { rejectUnauthorized: false },
  });
}

export function assertSafeRunId(value) {
  if (!/^[a-z0-9][a-z0-9-]{7,47}$/.test(value)) refuse("malformed_run_id");
  return value;
}

export function assertSafeArtifactPath(value) {
  const resolved = path.resolve(value);
  if (!resolved.startsWith("/tmp/skillmint-block5-")) {
    refuse("unsafe_artifact_path");
  }
  return resolved;
}

export function readFreshArtifact(file, expected) {
  let value;
  try {
    value = JSON.parse(
      fs.readFileSync(assertSafeArtifactPath(file), "utf8"),
    );
  } catch {
    refuse("missing_or_malformed_artifact");
  }
  validateSecretFreeArtifact(value);
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== 2 ||
    value.kind !== expected.kind ||
    value.ok !== true ||
    value.projectReferenceSha256 !== expected.projectReferenceSha256 ||
    value.runId !== expected.runId ||
    typeof value.createdAt !== "string"
  ) refuse("artifact_contract_mismatch");
  const createdAt = Date.parse(value.createdAt);
  const age = Date.now() - createdAt;
  if (!Number.isFinite(createdAt) || age < 0 || age > LIVE_ARTIFACT_MAX_AGE_MS) {
    refuse("stale_preflight");
  }
  return value;
}

export function validateSecretFreeArtifact(value) {
  visitArtifact(value, []);
  const encoded = JSON.stringify(value);
  for (const secret of [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_DB_URL,
    process.env.DATABASE_URL,
  ]) {
    if (typeof secret === "string" && secret.length >= 8 && encoded.includes(secret)) {
      refuse("forbidden_artifact_content");
    }
  }
  return true;
}

export function writeSecretFreeArtifact(file, value) {
  validateSecretFreeArtifact(value);
  fs.writeFileSync(
    assertSafeArtifactPath(file),
    `${JSON.stringify(value, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
}

export function writeRunState(file, value) {
  validateSecretFreeArtifact(value);
  const target = assertSafeArtifactPath(file);
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  fs.renameSync(temporary, target);
  fs.chmodSync(target, 0o600);
}

export function refuse(code) {
  process.stdout.write(`${JSON.stringify({ ok: false, refused: true, code })}\n`);
  process.exit(2);
}

export function fail(code) {
  process.stdout.write(`${JSON.stringify({ ok: false, code })}\n`);
  process.exit(1);
}

function visitArtifact(value, pathParts) {
  if (typeof value === "string") {
    if (FORBIDDEN_ARTIFACT_VALUE.test(value)) refuse("forbidden_artifact_content");
    return;
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => visitArtifact(entry, [...pathParts, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") refuse("forbidden_artifact_content");
  for (const [key, entry] of Object.entries(value)) {
    const artifactPath = [...pathParts, key];
    if (isForbiddenArtifactKey(artifactPath)) refuse("forbidden_artifact_content");
    visitArtifact(entry, artifactPath);
  }
}

function isForbiddenArtifactKey(pathParts) {
  const key = pathParts.at(-1);
  if (typeof key !== "string") return true;
  const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
  return FORBIDDEN_PROVIDER_ARTIFACT_KEYS.has(normalizedKey) ||
    normalizedKey.endsWith("secretkey") ||
    FORBIDDEN_ARTIFACT_KEY.test(key);
}
