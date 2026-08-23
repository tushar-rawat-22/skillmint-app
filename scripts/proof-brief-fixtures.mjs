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
    ? originalResolveFilename.call(
        this,
        path.join(srcRoot, request.slice(2)),
        parent,
        isMain,
        options,
      )
    : originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  deriveProofBriefPayload,
  isValidProofBriefShareToken,
  parseProofBriefPayload,
  parseProofBriefSourceAnalysis,
  parseSharedProofBrief,
} = require("../src/modules/proofBrief/proofBriefContract.ts");
const {
  createOrRefreshPrivateProofBriefWithAdapter,
  getProofBriefForSourceWithAdapter,
  publishProofBriefWithAdapter,
  revokeProofBriefWithAdapter,
} = require("../src/modules/proofBrief/proofBriefRepository.ts");

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SOURCE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BRIEF_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const NOW = "2026-08-23T12:00:00.000Z";
const TOKEN = "A".repeat(43);

const tests = [];
function test(name, callback) {
  tests.push({ name, callback });
}

test("derived brief is deterministic and excludes raw candidate content", () => {
  const input = fixtureAnalysisInput();
  const first = deriveProofBriefPayload(input);
  const second = deriveProofBriefPayload(input);
  assert.deepEqual(first, second);
  assert.equal(first.evidenceSignals.length, 3);
  assert.deepEqual(first.evidenceSignals.map((item) => item.state), [
    "STRONG",
    "WEAK",
    "UNCLEAR",
  ]);
  const serialized = JSON.stringify(first);
  for (const forbidden of [
    "candidate@example.test",
    "+1 555",
    "https://",
    "Synthetic University",
    "Synthetic Employer",
    "raw private project sentence",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.equal(serialized.includes("TypeScript"), true);
});

test("unsafe skill labels and directions cannot enter a brief", () => {
  const input = fixtureAnalysisInput();
  input.direction = "candidate@example.test";
  input.proof.skillClassifications.unshift(
    ...[
      "candidate@example.test",
      "Jane Doe",
      "Acme Corp",
      "12 Main Street London",
      "+1 (555) 123-4567",
      "Synthetic University",
    ].map((skill) => ({
      skill,
      status: "Evidence-backed",
      reason: "fixture",
    })),
  );
  const payload = deriveProofBriefPayload(input);
  assert.equal(payload.direction, "Direction still being clarified");
  assert.deepEqual(
    payload.evidenceSignals.map((signal) => signal.label),
    ["TypeScript", "React", "PostgreSQL"],
  );
});

test("payload parser is exact, bounded, and rejects hidden fields", () => {
  const payload = deriveProofBriefPayload(fixtureAnalysisInput());
  assert.deepEqual(parseProofBriefPayload(payload), payload);
  assert.equal(parseProofBriefPayload({ ...payload, rawResume: "secret" }), null);
  assert.equal(parseProofBriefPayload({ ...payload, direction: "" }), null);
  assert.equal(parseProofBriefPayload({
    ...payload,
    evidenceSignals: [{ ...payload.evidenceSignals[0], sourceUrl: "https://example.test" }],
  }), null);
});

test("server source parser binds the exact saved analysis and owner", () => {
  const source = fixtureSourceAnalysis();
  assert.equal(parseProofBriefSourceAnalysis(source, {
    userId: USER_A,
    sourceResumeAnalysisId: SOURCE_ID,
  })?.id, SOURCE_ID);
  assert.equal(parseProofBriefSourceAnalysis(source, {
    userId: USER_B,
    sourceResumeAnalysisId: SOURCE_ID,
  }), null);
  assert.equal(parseProofBriefSourceAnalysis(source, {
    userId: USER_A,
    sourceResumeAnalysisId: BRIEF_ID,
  }), null);
  assert.equal(parseProofBriefSourceAnalysis({ ...source, raw_resume: "hidden" }, {
    userId: USER_A,
    sourceResumeAnalysisId: SOURCE_ID,
  }), null);
  assert.equal(parseProofBriefSourceAnalysis({
    ...source,
    extracted_text: "x".repeat(250_001),
  }, {
    userId: USER_A,
    sourceResumeAnalysisId: SOURCE_ID,
  }), null);
  assert.equal(parseProofBriefSourceAnalysis({
    ...source,
    user_profile: { ...source.user_profile, skills: Array(501).fill("TypeScript") },
  }, {
    userId: USER_A,
    sourceResumeAnalysisId: SOURCE_ID,
  }), null);
});

test("shared response parser exposes only exact payload and shared timestamp", () => {
  const payload = deriveProofBriefPayload(fixtureAnalysisInput());
  assert.deepEqual(parseSharedProofBrief({ payload, shared_at: NOW }), {
    payload,
    sharedAt: NOW,
  });
  assert.equal(parseSharedProofBrief({ payload, shared_at: NOW, user_id: USER_A }), null);
});

test("share token contract accepts only exact 32-byte base64url shape", () => {
  assert.equal(isValidProofBriefShareToken(TOKEN), true);
  for (const token of ["", "A".repeat(42), "A".repeat(44), `${"A".repeat(42)}=`, "A".repeat(42) + "+"]) {
    assert.equal(isValidProofBriefShareToken(token), false);
  }
});

test("new briefs are private and checked against the same account twice", async () => {
  const adapter = createAdapter();
  const result = await createOrRefreshPrivateProofBriefWithAdapter(
    SOURCE_ID,
    USER_A,
    adapter,
  );
  assert.equal(result.ok, true);
  assert.equal(result.data.visibility, "PRIVATE");
  assert.equal(result.data.sharedAt, null);
  assert.equal(adapter.observed.insert.userId, USER_A);
  assert.equal(adapter.observed.identityChecks, 3);
});

test("account changes fail closed without returning another owner brief", async () => {
  const adapter = createAdapter({ identities: [USER_A, USER_B] });
  const result = await getProofBriefForSourceWithAdapter(SOURCE_ID, USER_A, adapter);
  assert.equal(result.ok, false);
  assert.equal(result.code, "account_changed");
  assert.equal("data" in result, false);
});

test("publishing accepts only the server-returned exact raw token", async () => {
  const adapter = createAdapter();
  const result = await publishProofBriefWithAdapter(BRIEF_ID, USER_A, adapter);
  assert.equal(result.ok, true);
  assert.equal(result.data.shareToken, TOKEN);
  assert.deepEqual(adapter.observed.publish, { id: BRIEF_ID, userId: USER_A });
  assert.equal(result.data.brief.visibility, "LINK_ONLY");
});

test("revocation returns the brief to coherent private state", async () => {
  const adapter = createAdapter();
  const result = await revokeProofBriefWithAdapter(
    BRIEF_ID,
    USER_A,
    adapter,
  );
  assert.equal(result.ok, true);
  assert.equal(result.data.visibility, "PRIVATE");
  assert.equal(result.data.sharedAt, null);
  assert.equal(result.data.revokedAt, NOW);
});

test("same-owner wrong-source and wrong-ID responses fail closed", async () => {
  const wrongSource = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const wrongId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

  const getResult = await getProofBriefForSourceWithAdapter(
    SOURCE_ID,
    USER_A,
    createAdapter({ getRows: [briefRow({ source_resume_analysis_id: wrongSource })] }),
  );
  assert.equal(getResult.ok, false);
  assert.equal(getResult.code, "invalid_response");

  const createResult = await createOrRefreshPrivateProofBriefWithAdapter(
    SOURCE_ID,
    USER_A,
    createAdapter({ insertRow: briefRow({ source_resume_analysis_id: wrongSource }) }),
  );
  assert.equal(createResult.ok, false);
  assert.equal(createResult.code, "invalid_response");

  const publishResult = await publishProofBriefWithAdapter(
    BRIEF_ID,
    USER_A,
    createAdapter({ publishRow: briefRow({ id: wrongId, visibility: "LINK_ONLY", share_created_at: NOW }) }),
  );
  assert.equal(publishResult.ok, false);
  assert.equal(publishResult.code, "invalid_response");

  const revokeResult = await revokeProofBriefWithAdapter(
    BRIEF_ID,
    USER_A,
    createAdapter({ revokeRow: briefRow({ id: wrongId, revoked_at: NOW }) }),
  );
  assert.equal(revokeResult.ok, false);
  assert.equal(revokeResult.code, "invalid_response");
});

test("multirow mutation responses fail closed", async () => {
  const result = await publishProofBriefWithAdapter(
    BRIEF_ID,
    USER_A,
    createAdapter({ publishRow: [
      briefRow({ visibility: "LINK_ONLY", share_created_at: NOW }),
      briefRow({ visibility: "LINK_ONLY", share_created_at: NOW }),
    ] }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "invalid_response");
});

test("provider responses with incoherent visibility fail closed", async () => {
  const adapter = createAdapter({
    getRows: [{ ...briefRow(), visibility: "LINK_ONLY", share_created_at: null }],
  });
  const result = await getProofBriefForSourceWithAdapter(SOURCE_ID, USER_A, adapter);
  assert.equal(result.ok, false);
  assert.equal(result.code, "invalid_response");
});

test("V10 migration is byte-identical and preserves privacy/deletion boundaries", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "supabase/schema_v10_two_sided_beta_foundation.sql"),
    "utf8",
  );
  const migration = fs.readFileSync(
    path.join(repoRoot, "supabase/migrations/20260823001000_schema_v10_two_sided_beta_foundation.sql"),
    "utf8",
  );
  assert.equal(source, migration);
  assert.match(source, /visibility text not null default 'PRIVATE'/u);
  assert.match(source, /visibility in \('PRIVATE', 'LINK_ONLY'\)/u);
  assert.match(source, /unique \(share_token_hash\)/u);
  assert.match(source, /share_token_hash ~ '\^\[0-9a-f\]\{64\}\$'/u);
  assert.match(source, /security definer\s+set search_path = pg_catalog/u);
  assert.match(source, /grant execute on function public\.get_shared_proof_brief\(text\)\s+to anon, authenticated/u);
  assert.match(source, /'evidenceSignals', \(\s+select coalesce/u);
  assert.match(source, /'sourceSummary', pg_catalog\.jsonb_build_object/u);
  assert.doesNotMatch(source, /'payload', proof_briefs\.brief_payload/u);
  assert.doesNotMatch(source, /grant select on table public\.proof_briefs to anon/u);
  assert.doesNotMatch(source, /grant select on table public\.proof_briefs to authenticated/u);
  assert.match(source, /grant select \([\s\S]*updated_at\s*\) on table public\.proof_briefs to authenticated/u);
  assert.doesNotMatch(
    source.match(/grant select \([\s\S]*?\) on table public\.proof_briefs to authenticated/u)?.[0] ?? "",
    /share_token_hash/u,
  );
  assert.doesNotMatch(
    source,
    /grant (?:insert|update|delete)[^;]*proof_briefs[^;]*authenticated/iu,
  );
  assert.doesNotMatch(
    source,
    /policy "Users can (?:insert|update|delete) their own proof briefs"/iu,
  );
  assert.match(source, /delete from public\.proof_briefs\s+where user_id = current_user_id/u);
  assert.match(source, /delete from public\.account_personas where user_id = target_user_id/u);
});

test("server mutation derives payload from the owned saved analysis and accepts no client payload", () => {
  const route = fs.readFileSync(
    path.join(repoRoot, "src/app/api/proof-brief/route.ts"),
    "utf8",
  );
  assert.match(route, /generateProofScore\(\{/u);
  assert.match(route, /deriveProofBriefPayload\(\{/u);
  assert.match(route, /\.eq\("id", sourceResumeAnalysisId\)[\s\S]*\.eq\("user_id", userId\)/u);
  assert.match(route, /randomBytes\(32\)\.toString\("base64url"\)/u);
  assert.match(route, /createHash\("sha256"\)/u);
  assert.doesNotMatch(route, /value\.brief_payload|value\.payload|value\.shareTokenHash/u);
  assert.match(route, /hasExactKeys\(value, \["action", "sourceResumeAnalysisId"\]\)/u);
  assert.match(route, /hasExactKeys\(value, \["action", "briefId"\]\)/u);
});

test("public Proof Brief routes bypass unrelated auth-session refresh", () => {
  const proxy = fs.readFileSync(path.join(repoRoot, "proxy.ts"), "utf8");
  const page = fs.readFileSync(
    path.join(repoRoot, "src/app/brief/[token]/page.tsx"),
    "utf8",
  );
  assert.match(proxy, /\(\?:demo\|recruiters\/demo\|brief\)\(\?:\/\|\$\)/u);
  assert.equal((proxy.match(/updateSupabaseSession\(request\)/gu) ?? []).length, 1);
  assert.equal((page.match(/<Link\b/gu) ?? []).length, 2);
  assert.equal((page.match(/prefetch=\{false\}/gu) ?? []).length, 2);
});

for (const { name, callback } of tests) {
  await callback();
  console.log(`PASS ${name}`);
}
console.log(`PASS ${tests.length} Proof Brief fixture groups`);

function fixtureAnalysisInput() {
  return {
    direction: "Software Engineer",
    profile: {
      resumeScore: 70,
      skillsScore: 70,
      projectsScore: 70,
      experienceScore: 60,
      educationScore: 70,
      githubScore: 0,
      linkedinScore: 0,
      atsScore: 70,
      recruiterScore: 0,
      activityScore: 0,
      skills: ["TypeScript", "React", "PostgreSQL"],
      projects: ["raw private project sentence"],
      experience: ["Synthetic Employer private experience"],
      education: "Synthetic University",
      certifications: [],
      codingProfiles: [],
      analysisFlags: { hasMeasurableImpact: true },
    },
    proof: {
      proofConfidenceScore: 50,
      proofCoverageLabel: "Moderate",
      proofSummary: "fixture",
      extractedProofLinks: [{
        url: "https://private.example.test/repository",
        normalizedUrl: "https://private.example.test/repository",
        type: "github_repo",
        source: "resume_text",
        label: "private",
      }],
      linkTypeCounts: {},
      evidenceBackedSkills: ["TypeScript"],
      weaklySupportedSkills: ["React"],
      unverifiedSkills: ["PostgreSQL"],
      skillClassifications: [
        { skill: "TypeScript", status: "Evidence-backed", reason: "fixture" },
        { skill: "React", status: "Weakly supported", reason: "fixture" },
        { skill: "PostgreSQL", status: "Claimed but unverified", reason: "fixture" },
      ],
      strongestEvidence: "raw private project sentence",
      weakestEvidence: "candidate@example.test +1 555 0100",
      nextProofMove: "private",
      scoringReasons: [],
    },
  };
}

function fixtureSourceAnalysis() {
  const input = fixtureAnalysisInput();
  return {
    id: SOURCE_ID,
    user_id: USER_A,
    file_name: "synthetic-proof-brief.txt",
    file_type: "text/plain",
    extracted_text: "Synthetic skills and project evidence fixture.",
    parsed_profile: {
      skills: [...input.profile.skills],
      projects: [...input.profile.projects],
      education: [input.profile.education],
      experience: [...input.profile.experience],
      certifications: [],
      links: {},
      rawSections: {},
    },
    user_profile: input.profile,
    created_at: NOW,
  };
}

function briefRow(overrides = {}) {
  return {
    id: BRIEF_ID,
    user_id: USER_A,
    source_resume_analysis_id: SOURCE_ID,
    brief_payload: deriveProofBriefPayload(fixtureAnalysisInput()),
    visibility: "PRIVATE",
    share_created_at: null,
    revoked_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function createAdapter({
  identities = [USER_A],
  getRows = [],
  insertRow = briefRow(),
  refreshRow = briefRow({ revoked_at: NOW }),
  publishRow = briefRow({ visibility: "LINK_ONLY", share_created_at: NOW }),
  revokeRow = briefRow({ revoked_at: NOW }),
} = {}) {
  const queue = [...identities];
  const observed = {
    identityChecks: 0,
    insert: null,
    publish: null,
  };
  return {
    observed,
    async getCurrentUserId() {
      observed.identityChecks += 1;
      return { userId: queue.length > 1 ? queue.shift() : queue[0] ?? null };
    },
    async getBySource() {
      return { data: getRows, error: null };
    },
    async insertPrivate(input) {
      observed.insert = input;
      return { data: insertRow, error: null };
    },
    async refreshPrivate() {
      return { data: refreshRow, error: null };
    },
    async publish(input) {
      observed.publish = input;
      return {
        data: publishRow,
        error: null,
        shareToken: TOKEN,
      };
    },
    async revoke() {
      return { data: revokeRow, error: null };
    },
  };
}
