import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(repoRoot, "src");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(this, path.join(srcRoot, request.slice(2)), parent, isMain, options)
    : originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  parseCandidateJobLifecycleMutation,
  parseCandidateJobLifecycleRecord,
  parseGreenhouseSourceKey,
} = require("../src/modules/jobs/candidateJobLifecycle.ts");

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-10-03T10:00:00.000Z";
const SOURCE_KEY = "greenhouse:figma:123";

const row = {
  id: "abababab-abab-4bab-8bab-abababababab",
  user_id: USER_A,
  provider: "greenhouse",
  provider_account_id: "figma",
  source_native_id: "123",
  source_key: SOURCE_KEY,
  original_apply_url: "https://boards.greenhouse.io/figma/jobs/123",
  role_title: "Frontend Engineer",
  company_name: "Figma",
  location: "Remote",
  source_updated_at: NOW,
  source_fetched_at: NOW,
  provider_availability: "live",
  workflow_state: "saved",
  applied_at: null,
  follow_up_at: null,
  follow_up_completed_at: null,
  created_at: NOW,
  updated_at: NOW,
};

assert.deepEqual(parseGreenhouseSourceKey(SOURCE_KEY), {
  providerAccountId: "figma",
  sourceNativeId: "123",
  sourceKey: SOURCE_KEY,
});
for (const invalid of ["", "stripe:figma:123", "greenhouse:Figma:123", "greenhouse:figma:a:b", `greenhouse:figma:${"x".repeat(161)}`]) {
  assert.equal(parseGreenhouseSourceKey(invalid), null, invalid);
}

for (const action of ["save", "mark_applied", "complete_follow_up", "withdraw", "archive", "refresh_provider"]) {
  assert.deepEqual(parseCandidateJobLifecycleMutation({ action }), { action });
}
assert.deepEqual(
  parseCandidateJobLifecycleMutation({ action: "set_follow_up", followUpAt: NOW }),
  { action: "set_follow_up", followUpAt: NOW },
);
assert.equal(parseCandidateJobLifecycleMutation({ action: "save", userId: USER_B }), null, "the browser must not choose lifecycle ownership");
assert.equal(parseCandidateJobLifecycleMutation({ action: "set_follow_up", followUpAt: "tomorrow" }), null);

assert.equal(parseCandidateJobLifecycleRecord(row, USER_A)?.sourceKey, SOURCE_KEY);

const postgrestTimestamp = "2026-10-03T15:38:10.755425+00:00";
const postgrestRow = {
  ...row,
  source_updated_at: "2026-09-30T00:00:54+00:00",
  source_fetched_at: "2026-10-03T15:38:10.704+00:00",
  created_at: postgrestTimestamp,
  updated_at: postgrestTimestamp,
};
assert.equal(
  parseCandidateJobLifecycleRecord(postgrestRow, USER_A)?.sourceFetchedAt,
  "2026-10-03T15:38:10.704+00:00",
  "PostgREST timestamptz offsets and microseconds must reconstruct as valid lifecycle timestamps",
);
for (const invalidTimestamp of [
  "2026-10-03",
  "2026-10-03T15:38:10",
  "2026-10-03T15:38:10.704",
  "not-a-timestamp",
]) {
  assert.equal(
    parseCandidateJobLifecycleRecord({ ...row, source_fetched_at: invalidTimestamp }, USER_A),
    null,
    `timezone-aware lifecycle timestamp required: ${invalidTimestamp}`,
  );
}

assert.equal(parseCandidateJobLifecycleRecord(row, USER_B), null, "Account A lifecycle rows must fail closed for Account B");
assert.equal(parseCandidateJobLifecycleRecord({ ...row, source_key: "greenhouse:figma:999" }, USER_A), null);
assert.equal(parseCandidateJobLifecycleRecord({ ...row, workflow_state: "rejected" }, USER_A), null, "employer outcomes are outside the candidate workflow contract");

const listRoute = read("src/app/api/candidate/jobs/route.ts");
const mutationRoute = read("src/app/api/candidate/jobs/[sourceKey]/route.ts");
const resolver = read("src/modules/jobs/greenhousePostingResolver.ts");
const liveRoute = read("src/app/api/jobs/greenhouse/route.ts");
const jobsPage = read("src/app/jobs/page.tsx");
const v14 = read("supabase/migrations/20260912001400_schema_v14_candidate_job_lifecycle.sql");

assert.match(listRoute, /getServerAuthorization\(\)/u);
assert.match(listRoute, /requireCandidatePersona\(authorization\.userId\)/u);
assert.match(listRoute, /\.eq\("user_id", authorization\.userId\)/u);
assert.match(mutationRoute, /isAllowedMutationOrigin\(request\)/u);
assert.match(mutationRoute, /parseCandidateJobLifecycleMutation\(rawMutation\)/u);
assert.match(mutationRoute, /authorization\.userId/u);
assert.match(mutationRoute, /\.eq\("user_id", userId\)/u);
assert.match(mutationRoute, /resolveTrustedGreenhousePosting\(sourceIdentity\.sourceKey\)/u);
assert.doesNotMatch(mutationRoute, /rawMutation\.userId|mutation\.userId/u);
assert.doesNotMatch(mutationRoute, /resume(?:Text|_text|Content|_content)/iu);

for (const token of ["airbnb", "figma", "stripe"]) {
  assert.match(resolver, new RegExp(`boardToken: ["']${token}["']`));
  assert.match(liveRoute, new RegExp(`boardToken: ["']${token}["']`));
}
assert.doesNotMatch(resolver, /requirements|resume/iu, "provider provenance resolution must not receive resume evidence");

assert.match(v14, /delete from public\.candidate_job_lifecycle where user_id = current_user_id;/iu, "saved-data deletion must remove lifecycle state");
assert.match(v14, /delete from public\.candidate_job_lifecycle where user_id = target_user_id;/iu, "account deletion preparation must remove lifecycle state");
assert.match(v14, /union all select 1 from public\.candidate_job_lifecycle where user_id = current_user_id/iu, "saved-data deletion must verify lifecycle absence");
assert.match(v14, /union all select 1 from public\.candidate_job_lifecycle where user_id = target_user_id/iu, "account deletion must verify lifecycle absence");

for (const copy of ["Career Decision Workspace", "Strongest evidence", "Biggest gap", "One next action", "Application progression", "Provider unavailable; saved candidate state preserved"]) {
  assert.ok(jobsPage.includes(copy), `missing decision-workspace contract: ${copy}`);
}
assert.doesNotMatch(jobsPage, /hire probability|hiring probability[^.<]*(?:%|score)/iu);
assert.doesNotMatch(jobsPage, /posthog|analytics/u, "lifecycle correctness must remain independent of analytics");

console.log("PASS candidate job lifecycle fixtures");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}
