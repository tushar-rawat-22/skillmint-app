import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "src/app/api/resume/extract/route.ts"),
  "utf8",
);
const contract = fs.readFileSync(
  path.join(root, "src/lib/resume/resumeUploadContract.ts"),
  "utf8",
);

assert.match(route, /getAccountPersona\(authorization\.userId\)/);
assert.match(route, /persona\.status === "unavailable"/);
assert.match(route, /persona\.status !== "resolved" \|\| persona\.persona !== "CANDIDATE"/);
assert.match(route, /errorResponse\("candidate_persona_required"\)/);

const personaCheck = route.indexOf("getAccountPersona(authorization.userId)");
const bodyBoundary = route.indexOf('request.headers.get("content-length")');
assert.ok(personaCheck >= 0 && bodyBoundary > personaCheck,
  "candidate persona must be checked before resume request body processing");

assert.match(contract, /"candidate_persona_required"/);
assert.match(contract, /candidate_persona_required:\s*\{[\s\S]*?status: 403/);

console.log("Resume persona authority fixtures: PASS.");
