import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/app/api/account/oauth-reauth/route.ts",
  "src/app/auth/reauth/callback/route.ts",
  "src/lib/oauthReauthentication/contract.ts",
  "src/lib/oauthReauthentication/pkce.ts",
  "src/lib/oauthReauthentication/proof.ts",
  "supabase/schema_v15_oauth_deletion_reauthentication.sql",
  "supabase/migrations/20260911001350_schema_v15_oauth_deletion_reauthentication.sql",
];

for (const relativePath of requiredFiles) {
  assert.equal(
    fs.existsSync(path.join(repoRoot, relativePath)),
    true,
    `missing OAuth deletion reauthentication contract: ${relativePath}`,
  );
}

const startRoute = read("src/app/api/account/oauth-reauth/route.ts");
const callbackRoute = read("src/app/auth/reauth/callback/route.ts");
const deleteRoute = read("src/app/api/account/delete/route.ts");
const recentAuth = read("src/lib/accountDeletion/recentAuth.ts");
const migration = read("supabase/schema_v15_oauth_deletion_reauthentication.sql");
const settings = read("src/app/settings/data/page.tsx");

assert.match(startRoute, /request\.headers\.get\("origin"\)/);
assert.match(startRoute, /auth\.getUser\(token\)/);
assert.match(startRoute, /provider:\s*"google"/);
assert.match(startRoute, /scopes:\s*"openid email profile"/);
assert.match(startRoute, /prompt:\s*"select_account"/);
assert.match(startRoute, /skipBrowserRedirect:\s*true/);
assert.match(startRoute, /\/auth\/reauth\/callback/);
assert.doesNotMatch(startRoute, /expectedUserId|user_id\s*:\s*(?:body|request)/);

assert.match(callbackRoute, /exchangeCodeForSession\(code\)/);
assert.match(callbackRoute, /auth\.getUser\(accessToken\)/);
assert.match(callbackRoute, /mark_oauth_deletion_reauth_returned/);
assert.match(callbackRoute, /OAUTH_DELETION_PROOF_COOKIE/);
assert.doesNotMatch(callbackRoute, /provider_token|refresh_token/);

assert.match(recentAuth, /validateRecentOAuthAuthentication/);
assert.match(recentAuth, /entry\.method === "oauth"/);
assert.match(deleteRoute, /consume_oauth_deletion_reauth_intent/);
assert.match(deleteRoute, /userData\.user\.id/);
assert.match(deleteRoute, /OAUTH_DELETION_PROOF_COOKIE/);

for (const fragment of [
  "oauth_deletion_reauth_intents",
  "purpose",
  "expires_at",
  "returned_at",
  "consumed_at",
  "mark_oauth_deletion_reauth_returned",
  "consume_oauth_deletion_reauth_intent",
]) assert.match(migration, new RegExp(fragment, "i"));
assert.match(migration, /security definer/gi);
assert.match(migration, /set search_path = pg_catalog/gi);
assert.match(migration, /revoke all on table public\.oauth_deletion_reauth_intents from public, anon, authenticated/i);
assert.doesNotMatch(migration, /grant\s+[^;]+\s+to\s+(?:anon|authenticated)/i);
assert.match(migration, /delete from public\.oauth_deletion_reauth_intents[\s\S]+insert into public\.oauth_deletion_reauth_intents/i);
assert.match(migration, /returned_at is null[\s\S]+consumed_at is null/i);
assert.match(migration, /consumed_at = statement_timestamp\(\)/i);

assert.match(settings, /Reauthenticate with Google/);
assert.match(settings, /session\?\.access_token/);
assert.doesNotMatch(settings, /provider_token|refresh_token/);

console.log("OAuth deletion reauthentication fixtures: PASS.");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}
