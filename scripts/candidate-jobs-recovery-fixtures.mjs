import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jobsPage = fs.readFileSync(path.join(root, "src/app/jobs/page.tsx"), "utf8");

assert.match(jobsPage, /type RecoveryAction = "login" \| "retry" \| "recruiter" \| null;/u, "candidate Jobs must model role-aware recovery explicitly");
assert.match(jobsPage, /status === 401 \|\| code === "not_authenticated"\) return "login"/u, "invalid sessions must recover through login");
assert.match(jobsPage, /status === 403 && code === "candidate_persona_required"\) return "recruiter"/u, "recruiter personas must not be sent into a retry loop on candidate Jobs");
assert.match(jobsPage, /recovery: "retry"/u, "network failures must expose retry recovery");
assert.match(jobsPage, /href="\/login"[^>]*>Sign in again</u, "expired sessions must offer an explicit sign-in action");
assert.match(jobsPage, /href="\/recruiters"[^>]*>Open recruiter workspace<\/Link>/u, "recruiter personas must recover to the recruiter workspace");
assert.match(jobsPage, />Retry live jobs<\/button>/u, "provider failures must offer an explicit retry action");
assert.match(jobsPage, />Refresh live jobs<\/button>/u, "zero-result states must remain refreshable");
assert.match(jobsPage, /href="\/setup"[^>]*>Review target role<\/Link>/u, "candidate recovery must link back to the authoritative target-role workflow");
assert.match(jobsPage, /This account is assigned to the recruiter workspace/u, "persona mismatch must be explained truthfully");
assert.match(jobsPage, /Resume evidence is not sent to the job provider\./u, "recovery changes must preserve the provider privacy boundary");

console.log("candidate Jobs recovery fixtures: PASS");
