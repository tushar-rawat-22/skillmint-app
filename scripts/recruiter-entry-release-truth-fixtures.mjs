import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recruiterPage = fs.readFileSync(
  path.join(root, "src/app/recruiters/page.tsx"),
  "utf8",
);

assert.match(
  recruiterPage,
  /const demoIsPublicEntry = publicDemoEnabled && !publicSignupEnabled;/u,
);
assert.match(
  recruiterPage,
  /\) : publicSignupEnabled \? \([\s\S]*ROUTES\.RECRUITER_WORKSPACE[\s\S]*Open recruiter workspace[\s\S]*\) : \([\s\S]*ROUTES\.LOGIN[\s\S]*Existing recruiter login/u,
);
assert.match(
  recruiterPage,
  /Recruiter access is limited to approved pilot accounts\./u,
);
assert.match(
  recruiterPage,
  /New[\s\S]*recruiter account creation is not active yet\./u,
);

console.log("PASS recruiter public entry stays aligned with the closed recruiter release gate");
