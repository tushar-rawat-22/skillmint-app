import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatePage = fs.readFileSync(
  path.join(root, "src/app/candidates/page.tsx"),
  "utf8",
);

for (const phrase of [
  "Synthetic example",
  "See the evidence before the score.",
  "Strongest support",
  "Main evidence gap",
  "Best next move",
  "After re-analysis",
  "See the full evidence loop",
]) {
  assert.match(candidatePage, new RegExp(escapeRegExp(phrase), "u"));
}

assert.ok(
  candidatePage.indexOf("candidate-preview-title") <
    candidatePage.indexOf("candidate-privacy-title"),
  "candidate evidence preview must stay ahead of the privacy detail",
);

assert.doesNotMatch(
  candidatePage,
  /recruiter confidence|hire probability|shortlist probability|salary guarantee/iu,
);

console.log("Candidate entry hierarchy fixture: PASS");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
