import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) { return request.startsWith("@/") ? originalResolve.call(this, path.join(srcRoot, request.slice(2)), parent, isMain, options) : originalResolve.call(this, request, parent, isMain, options); };
require.extensions[".ts"] = function (module, filename) { const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename }); module._compile(output.outputText, filename); };

const { deriveRoleEvidenceMap } = require("../src/intelligence/core/roleEvidenceMap.ts");
const { buildEvidenceQuestion, normalizeReviewNote, parseRoleEvidenceMap } = require("../src/modules/recruiterEvidence/recruiterEvidenceContract.ts");
const tests = [];
function test(name, run) { tests.push({ name, run }); }

const roleInput = {
  roleTitle: "Junior frontend contributor",
  jobDescription: "Build accessible TypeScript and React interfaces, test changes, improve performance, review trade-offs, and explain delivery outcomes with a product team.",
};

test("role evidence maps are deterministic and evidence-oriented", () => {
  const first = deriveRoleEvidenceMap(roleInput);
  const second = deriveRoleEvidenceMap(roleInput);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  assert.deepEqual(first.map.categories.map((category) => category.key), ["APPLIED_SKILLS", "DELIVERY", "OWNERSHIP", "COLLABORATION"]);
  assert.deepEqual(first.map.categories[0].signals, ["TypeScript", "React"]);
  assert.deepEqual(first.map.categories[1].signals, ["Testing", "Accessibility", "Performance"]);
  assert.doesNotMatch(JSON.stringify(first.map), /score|rank|shortlist|probability|hire recommendation/iu);
});

test("role inputs fail closed on malformed title and JD bounds", () => {
  assert.equal(deriveRoleEvidenceMap({ ...roleInput, roleTitle: "https://example.test" }).ok, false);
  assert.equal(deriveRoleEvidenceMap({ ...roleInput, jobDescription: "too short" }).ok, false);
  assert.equal(deriveRoleEvidenceMap({ ...roleInput, jobDescription: "x".repeat(12001) }).ok, false);
});

test("role-map payload parser rejects hidden fields and malformed categories", () => {
  const result = deriveRoleEvidenceMap(roleInput);
  assert.equal(result.ok, true);
  assert.deepEqual(parseRoleEvidenceMap(result.map), result.map);
  assert.equal(parseRoleEvidenceMap({ ...result.map, rawJobDescription: roleInput.jobDescription }), null);
  assert.equal(parseRoleEvidenceMap({ ...result.map, categories: result.map.categories.slice(0, 3) }), null);
});

test("evidence questions are generated only from bounded structured choices", () => {
  assert.equal(buildEvidenceQuestion("APPLIED_EXAMPLE", "TypeScript"), "Can you show an applied example of TypeScript and explain what you owned?");
  assert.equal(buildEvidenceQuestion("APPLIED_EXAMPLE", null), null);
  assert.equal(buildEvidenceQuestion("OWNERSHIP_CONTEXT", "TypeScript"), null);
  assert.match(buildEvidenceQuestion("OUTCOME_CONTEXT", null), /What changed/u);
  assert.equal(normalizeReviewNote("  bounded note  "), "bounded note");
  assert.equal(normalizeReviewNote("x".repeat(1001)), undefined);
});

test("V11 is byte-identical, ordered, least-privilege, and cascade-aware", () => {
  const source = fs.readFileSync(path.join(root, "supabase/schema_v11_recruiter_evidence_review.sql"));
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260823001100_schema_v11_recruiter_evidence_review.sql"));
  assert.equal(Buffer.compare(source, migration), 0);
  const hash = createHash("sha256").update(source).digest("hex");
  assert.equal(hash, "007c6076a68de87bc96f6e85b886d93add5458dbfdc96da8210c22081ecd8cee");
  const sql = source.toString("utf8");
  assert.match(sql, /revoke insert, update, delete on table public\.account_personas from authenticated/iu);
  assert.doesNotMatch(sql, /grant insert[\s\S]{0,120}candidate_evidence_reviews[\s\S]{0,40}authenticated/iu);
  assert.match(sql, /foreign key \(user_id, proof_brief_id\)[\s\S]{0,120}references public\.proof_briefs\(user_id, id\)[\s\S]{0,60}on delete cascade/iu);
  const candidateGrant = sql.match(/grant select \([\s\S]*?\) on table public\.candidate_evidence_reviews to authenticated/iu)?.[0] ?? "";
  assert.ok(candidateGrant);
  assert.doesNotMatch(candidateGrant, /role_map_id/iu);
  assert.match(sql, /create function public\.create_recruiter_role_evidence_map[\s\S]*for update of account_personas[\s\S]*>= 10/iu);
  assert.match(sql, /create function public\.submit_candidate_evidence_review[\s\S]*for update of proof_briefs/iu);
  assert.match(sql, /grant execute on function public\.create_recruiter_role_evidence_map[\s\S]{0,160}to service_role/iu);
  assert.match(sql, /grant execute on function public\.submit_candidate_evidence_review[\s\S]{0,180}to service_role/iu);
  assert.match(sql, /auth\.uid\(\) = user_id/iu);
  assert.match(sql, /delete from public\.recruiter_role_evidence_maps where user_id = target_user_id/iu);
});

test("mutation API verifies session, origin, persona, role ownership, and live share token", () => {
  const source = fs.readFileSync(path.join(root, "src/app/api/recruiter-evidence/route.ts"), "utf8");
  for (const required of ["getServerAuthorization", "isAllowedMutationOrigin", "authorization.userId !== mutation.expectedUserId", 'persona.value !== "RECRUITER"', '.eq("user_id", authorization.userId)', 'createHash("sha256")', '.eq("visibility", "LINK_ONLY")', '.is("revoked_at", null)', "allowedLabels.has", "deriveRoleEvidenceMap", '.rpc("create_recruiter_role_evidence_map"', '.rpc("submit_candidate_evidence_review"']) assert.ok(source.includes(required), `missing ${required}`);
  assert.doesNotMatch(source, /\.from\("candidate_evidence_reviews"\)\s*\.insert/iu);
  assert.doesNotMatch(source, /getSession\s*\(/u);
  assert.doesNotMatch(source, /analytics|localStorage|sessionStorage/iu);
});

test("recruiter clients bind visible state and mutations to the live auth owner", () => {
  const workspace = fs.readFileSync(path.join(root, "src/modules/recruiterEvidence/components/RecruiterWorkspaceClient.tsx"), "utf8");
  const review = fs.readFileSync(path.join(root, "src/modules/recruiterEvidence/components/RecruiterReviewClient.tsx"), "utf8");
  const candidate = fs.readFileSync(path.join(root, "src/modules/recruiterEvidence/components/CandidateRecruiterFeedbackCard.tsx"), "utf8");
  for (const source of [workspace, review]) {
    assert.match(source, /useAuthSession\(\)/u);
    assert.match(source, /activeOwnerRef\.current !== expectedUserId/u);
    assert.match(source, /expectedUserId/u);
  }
  assert.match(candidate, /state\.ownerId === currentUserId/u);
  assert.match(candidate, /body\.ownerId !== expectedUserId/u);
  assert.match(candidate, /reviews: \[\]/u);
});

test("public brief preserves user-initiated prefetch boundary", () => {
  const source = fs.readFileSync(path.join(root, "src/app/brief/[token]/page.tsx"), "utf8");
  const recruiterLink = source.slice(source.indexOf('href={`/recruiters/review/'));
  assert.match(recruiterLink.slice(0, 240), /prefetch=\{false\}/u);
});

for (const item of tests) { await item.run(); console.log(`PASS ${item.name}`); }
console.log(`PASS ${tests.length} recruiter evidence fixture groups`);
