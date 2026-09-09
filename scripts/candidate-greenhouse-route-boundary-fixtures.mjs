import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(root, "src/app/api/jobs/greenhouse/route.ts"), "utf8");

for (const required of [
  'authClient.auth.getUser(token)',
  '.from("account_personas")',
  '.eq("user_id", data.user.id)',
  'persona.persona !== "CANDIDATE"',
  'jsonError("candidate_persona_required", 403)',
]) {
  assert.ok(route.includes(required), `missing candidate Greenhouse boundary: ${required}`);
}

const personaCheck = route.indexOf('.from("account_personas")');
const providerFetch = route.indexOf('SOURCE_CATALOG.map((source) => fetchBoard(source, fetchedAt))');
assert.ok(personaCheck >= 0 && providerFetch > personaCheck, "provider fetch must occur only after candidate persona verification");
assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient/u);
assert.doesNotMatch(route, /resume(Text|Content|Body)|resume_text|resume_content/iu);

console.log("Candidate Greenhouse route boundary fixtures passed.");
