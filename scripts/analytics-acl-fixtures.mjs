import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "supabase/migrations/manifest.json"), "utf8"),
);

const API_ROLES = ["public", "anon", "authenticated", "service_role"];
const TABLE_PRIVILEGES = [
  "select",
  "insert",
  "update",
  "delete",
  "truncate",
  "references",
  "trigger",
];
const COLUMN_PRIVILEGES = ["select", "insert", "update", "references"];
const ANALYTICS_COLUMNS = [
  "event_id",
  "event_name",
  "event_version",
  "occurred_at",
  "received_at",
  "environment",
  "build_id",
  "source_screen",
  "owner_mode",
  "properties",
];
const SUMMARY_FUNCTION = "get_founder_analytics_summary(text,text)";
const PURGE_FUNCTION = "purge_expired_analytics_events()";

function normalizeWhitespace(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeFunctionIdentity(name, argumentsText = "") {
  return `${name.toLowerCase()}${argumentsText.toLowerCase().replace(/\s+/g, "")}`;
}

function rolesFrom(value) {
  return value
    .split(",")
    .map((role) => normalizeWhitespace(role))
    .filter(Boolean);
}

function directTableStateWithWorstCaseAcl() {
  return new Map(
    API_ROLES.map((role) => [role, new Set(TABLE_PRIVILEGES)]),
  );
}

function columnStateWithWorstCaseAcl() {
  return new Map(
    API_ROLES.map((role) => [
      role,
      new Map(
        ANALYTICS_COLUMNS.map((column) => [
          column,
          new Set(COLUMN_PRIVILEGES),
        ]),
      ),
    ]),
  );
}

function functionStateWithPostgresDefaultExecute() {
  return new Map(
    [SUMMARY_FUNCTION, PURGE_FUNCTION].map((identity) => [
      identity,
      new Map(API_ROLES.map((role) => [role, role === "public"])),
    ]),
  );
}

const tableState = directTableStateWithWorstCaseAcl();
const columnState = columnStateWithWorstCaseAcl();
const functionState = functionStateWithPostgresDefaultExecute();
const aclStatements = [];
const migrationSql = manifest.ordered_migrations.map((entry, migrationIndex) => {
  const sql = fs.readFileSync(path.join(repoRoot, entry.migration_path), "utf8");
  const statementPattern =
    /\b(grant|revoke)\s+([\s\S]*?)\s+on\s+(table|function)\s+public\.([a-z_][a-z0-9_]*)(\s*\([^;]*?\))?\s+(to|from)\s+([^;]+);/gi;

  for (const match of sql.matchAll(statementPattern)) {
    const [, action, rawPrivilege, objectType, objectName, rawArguments, direction, rawRoles] =
      match;
    const statement = {
      action: action.toLowerCase(),
      privilege: normalizeWhitespace(rawPrivilege),
      objectType: objectType.toLowerCase(),
      objectName: objectName.toLowerCase(),
      functionIdentity: normalizeFunctionIdentity(objectName, rawArguments),
      direction: direction.toLowerCase(),
      roles: rolesFrom(rawRoles),
      migrationIndex,
      migrationPath: entry.migration_path,
    };
    aclStatements.push(statement);

    assert.equal(
      statement.direction,
      statement.action === "grant" ? "to" : "from",
      `malformed ACL direction in ${entry.migration_path}`,
    );

    if (
      statement.objectType === "table" &&
      statement.objectName === "analytics_events"
    ) {
      const columnPrivilege = statement.privilege.match(
        /^(select|insert|update|references)\s*\(([\s\S]+)\)$/,
      );
      if (columnPrivilege) {
        const [, privilege, rawColumns] = columnPrivilege;
        const columns = rawColumns
          .split(",")
          .map((column) => normalizeWhitespace(column));
        assert.deepEqual(
          [...columns].sort(),
          [...ANALYTICS_COLUMNS].sort(),
          `${entry.migration_path} must revoke the exact analytics column set`,
        );
        assert.equal(
          statement.action,
          "revoke",
          `${entry.migration_path} must not grant analytics column privileges`,
        );
        for (const role of statement.roles) {
          assert.ok(API_ROLES.includes(role), `unexpected analytics ACL role: ${role}`);
          for (const column of columns) {
            columnState.get(role).get(column).delete(privilege);
          }
        }
        continue;
      }

      const privileges =
        statement.privilege === "all" ||
        statement.privilege === "all privileges"
          ? TABLE_PRIVILEGES
          : statement.privilege.split(",").map(normalizeWhitespace);
      for (const privilege of privileges) {
        assert.ok(
          TABLE_PRIVILEGES.includes(privilege),
          `unknown analytics table privilege in ${entry.migration_path}: ${privilege}`,
        );
      }
      for (const role of statement.roles) {
        assert.ok(API_ROLES.includes(role), `unexpected analytics ACL role: ${role}`);
        for (const privilege of privileges) {
          if (statement.action === "grant") tableState.get(role).add(privilege);
          else tableState.get(role).delete(privilege);
        }
      }
      continue;
    }

    if (statement.objectType === "function") {
      const state = functionState.get(statement.functionIdentity);
      if (!state) continue;
      assert.ok(
        statement.privilege === "all" ||
          statement.privilege === "all privileges" ||
          statement.privilege === "execute",
        `unknown function privilege in ${entry.migration_path}`,
      );
      for (const role of statement.roles) {
        assert.ok(API_ROLES.includes(role), `unexpected function ACL role: ${role}`);
        state.set(role, statement.action === "grant");
      }
    }
  }

  return sql;
});

function effectiveTablePrivileges(role) {
  return new Set([...tableState.get("public"), ...tableState.get(role)]);
}

function hasAnyColumnPrivilege(role, privilege) {
  for (const column of ANALYTICS_COLUMNS) {
    if (columnState.get("public").get(column).has(privilege)) return true;
    if (columnState.get(role).get(column).has(privilege)) return true;
  }
  return false;
}

function hasFunctionExecute(role, identity) {
  const grants = functionState.get(identity);
  return grants.get("public") || grants.get(role);
}

for (const role of ["public", "anon", "authenticated"]) {
  assert.deepEqual(
    [...effectiveTablePrivileges(role)],
    [],
    `${role} must have no effective analytics table privilege`,
  );
}
assert.deepEqual(
  [...effectiveTablePrivileges("service_role")].sort(),
  ["insert"],
  "service_role must have effective INSERT only",
);
for (const privilege of [
  "select",
  "update",
  "delete",
  "truncate",
  "references",
  "trigger",
]) {
  assert.equal(
    effectiveTablePrivileges("service_role").has(privilege),
    false,
    `service_role must not have ${privilege.toUpperCase()}`,
  );
}
for (const role of API_ROLES) {
  assert.equal(
    hasAnyColumnPrivilege(role, "select"),
    false,
    `${role} must not retain column-level SELECT`,
  );
}

assert.equal(hasFunctionExecute("service_role", SUMMARY_FUNCTION), true);
for (const role of ["public", "anon", "authenticated"]) {
  assert.equal(hasFunctionExecute(role, SUMMARY_FUNCTION), false);
}
for (const role of API_ROLES) {
  assert.equal(hasFunctionExecute(role, PURGE_FUNCTION), false);
}

const v7Index = manifest.ordered_migrations.findIndex(
  (entry) => entry.version === "20260723000700",
);
assert.equal(v7Index, manifest.ordered_migrations.length - 1, "V7 must be the latest tracked migration");
for (const statement of aclStatements) {
  if (
    statement.migrationIndex < v7Index ||
    statement.objectType !== "table" ||
    statement.objectName !== "analytics_events" ||
    statement.action !== "grant"
  ) {
    continue;
  }
  assert.equal(statement.privilege, "insert", "V7 or a later migration grants broader table access");
  assert.deepEqual(statement.roles, ["service_role"], "analytics INSERT must be service_role-only");
}

const purgeFunctionRevokes = aclStatements.filter(
  (statement) =>
    statement.objectType === "function" &&
    statement.functionIdentity === PURGE_FUNCTION &&
    statement.action === "revoke",
);
assert.equal(purgeFunctionRevokes.length, 4, "purge ACL revokes must stay function-scoped");
assert.equal(
  purgeFunctionRevokes.some(
    (statement) =>
      statement.objectType === "table" ||
      statement.objectName === "analytics_events",
  ),
  false,
  "function ACL statements must not be classified as analytics table ACLs",
);

const v7Sql = migrationSql[v7Index].toLowerCase();
assert.match(
  v7Sql,
  /revoke all privileges\s+on table public\.analytics_events\s+from public, anon, authenticated, service_role;/,
);
assert.match(
  v7Sql,
  /grant insert\s+on table public\.analytics_events\s+to service_role;/,
);
assert.doesNotMatch(
  v7Sql,
  /\b(?:alter|create|drop|truncate)\s+(?:table|function|policy|index)|\b(?:insert into|update|delete from)\s+public\.analytics_events|\bcron\./,
);

const allMigrationSql = migrationSql.join("\n").toLowerCase();
assert.doesNotMatch(
  allMigrationSql,
  /create policy[\s\S]{0,240}\bon\s+public\.analytics_events/,
  "analytics_events must not gain an RLS policy",
);

const repositorySource = fs.readFileSync(
  path.join(
    repoRoot,
    "src/modules/analytics/services/analyticsEventRepository.ts",
  ),
  "utf8",
);
assert.match(
  repositorySource,
  /\.from\("analytics_events"\)\.insert\(/,
  "analytics repository must retain its insert-only write",
);
assert.doesNotMatch(
  repositorySource,
  /\.from\(["']analytics_events["']\)[\s\S]{0,600}\.(?:select|update|delete)\s*\(/,
  "analytics repository must not require raw reads or returned-row selection",
);
assert.doesNotMatch(
  repositorySource,
  /\bdata\s*[:=]/,
  "analytics repository must not consume returned row data",
);

const catalogVerification = fs.readFileSync(
  path.join(repoRoot, "scripts/analytics-acl-catalog-verify.sql"),
  "utf8",
).toLowerCase();
assert.match(catalogVerification, /\bhas_table_privilege\s*\(/);
assert.match(catalogVerification, /\bhas_any_column_privilege\s*\(/);
assert.match(catalogVerification, /\bhas_function_privilege\s*\(/);
assert.match(
  catalogVerification,
  /get_founder_analytics_summary\(text,text\)/,
);
assert.match(catalogVerification, /purge_expired_analytics_events\(\)/);
assert.doesNotMatch(
  catalogVerification,
  /information_schema\.role_table_grants/,
  "effective ACL verification must not rely on role_table_grants",
);

console.log("PASS analytics ACL fixtures");
console.log("Effective intent: API roles have no raw access; service_role has INSERT only.");
console.log("Object-aware proof: table and function ACL statements were evaluated separately in migration order.");
