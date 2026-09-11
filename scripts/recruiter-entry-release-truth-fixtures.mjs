import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recruiterPage = fs.readFileSync(
  path.join(root, "src/app/recruiters/page.tsx"),
  "utf8",
);
const candidatePage = fs.readFileSync(
  path.join(root, "src/app/candidates/page.tsx"),
  "utf8",
);
const loginPage = fs.readFileSync(
  path.join(root, "src/app/login/page.tsx"),
  "utf8",
);
const publicHeader = fs.readFileSync(
  path.join(root, "src/components/layout/PublicBetaHeader.tsx"),
  "utf8",
);

assert.match(
  recruiterPage,
  /const demoIsPublicEntry = publicDemoEnabled && !publicSignupEnabled;/u,
);
assert.match(
  recruiterPage,
  /publicSignupEnabled \? \([\s\S]*ROUTES\.SIGNUP[\s\S]*Create recruiter account[\s\S]*\) : \([\s\S]*ROUTES\.SIGNUP[\s\S]*Request recruiter access/u,
);
assert.match(
  recruiterPage,
  /SkillMint is live with controlled recruiter admission\./u,
);
assert.match(recruiterPage, /Existing recruiter login/u);
assert.doesNotMatch(recruiterPage, /pilot accounts|first beta/u);

assert.match(
  candidatePage,
  /publicSignupEnabled \? \([\s\S]*ROUTES\.SIGNUP[\s\S]*Create candidate account[\s\S]*\) : \([\s\S]*ROUTES\.SIGNUP[\s\S]*Request access/u,
);
assert.match(
  candidatePage,
  /SkillMint is live with controlled account admission\./u,
);
assert.match(candidatePage, /Existing user login/u);
assert.doesNotMatch(candidatePage, /invite-only|controlled beta|no public signup or waitlist/u);

assert.match(loginPage, /enabled \? "Create an account" : "Request access"/u);
assert.doesNotMatch(loginPage, /View early access/u);

assert.match(publicHeader, /aria-label="Public navigation"/u);
assert.doesNotMatch(publicHeader, /aria-label="Public beta"/u);

console.log("PASS public candidate, recruiter, and login entry surfaces match launched controlled-access truth");
