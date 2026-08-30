import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");

const initiation = read("src/app/auth/oauth/route.ts");
const callback = read("src/app/auth/callback/route.ts");
const signup = read("src/app/signup/page.tsx");
const authCredentials = read("src/modules/auth/services/authCredentials.ts");
const personaRoute = read("src/app/auth/persona/complete/route.ts");
const personaPage = read("src/app/auth/persona/page.tsx");
const personaAuthority = read("src/modules/accountPersona.ts");
const login = read("src/app/login/page.tsx");
const routeClient = read("src/lib/supabase/routeClient.ts");

assert.match(initiation, /export async function POST\(request: Request\)/);
assert.match(initiation, /request\.headers\.get\("origin"\) !== appOrigin/);
assert.match(initiation, /application\/x-www-form-urlencoded/);
assert.match(initiation, /body\.length > MAX_FORM_LENGTH/);
assert.match(initiation, /form\.getAll\("provider"\)/);
assert.match(initiation, /providerValues\.length !== 1/);
assert.match(initiation, /new Set<PublicOAuthProvider>\(\["google", "github"\]\)/);
assert.match(initiation, /isPublicOAuthProviderEnabled\(provider\)/);
assert.match(initiation, /redirectTo: `\$\{appOrigin\}\/auth\/callback`/);
assert.match(initiation, /skipBrowserRedirect: true/);
assert.doesNotMatch(initiation, /searchParams\.get\(["']next["']\)/);
assert.doesNotMatch(initiation, /provider_token|provider_refresh_token/);

assert.match(callback, /getPublicOAuthConfiguration\(\)/);
assert.match(callback, /getPublicSignupConfiguration\(\)/);
assert.match(callback, /!oauth\.enabled && !signup\.enabled/);
assert.match(callback, /searchParams\.getAll\("code"\)/);
assert.match(callback, /codes\.length === 1/);
assert.match(callback, /code\.length > MAX_CODE_LENGTH/);
assert.match(callback, /exchangeCodeForSession\(code\)/);
assert.match(callback, /supabase\.auth\.getUser\(\)/);
assert.match(callback, /getAccountPersona\(userId\)/);
assert.match(callback, /persona\.status === "resolved"/);
assert.match(callback, /accountPersonaDestination\(persona\.persona\)/);
assert.match(callback, /persona\.status === "missing"/);
assert.match(callback, /new URL\("\/auth\/persona", appOrigin\)/);
assert.match(callback, /searchParams\.set\("oauth", reason\)/);
assert.doesNotMatch(callback, /searchParams\.get\(["']next["']\)/);
assert.doesNotMatch(callback, /provider_token|provider_refresh_token/);

assert.match(signup, /getTrustedAppOrigin\(\)/);
assert.match(signup, /new URL\("\/auth\/callback", appOrigin\)/);
assert.match(signup, /emailRedirectTo=\{emailRedirectTo\}/);
assert.match(authCredentials, /emailRedirectTo: string \| null/);
assert.match(authCredentials, /options:\s*\{\s*emailRedirectTo: request\.emailRedirectTo/);

assert.match(personaRoute, /export async function POST\(request: Request\)/);
assert.match(personaRoute, /request\.headers\.get\("origin"\) !== appOrigin/);
assert.match(personaRoute, /application\/x-www-form-urlencoded/);
assert.match(personaRoute, /form\.getAll\("persona"\)/);
assert.match(personaRoute, /personaValues\.length !== 1/);
assert.match(personaRoute, /isAccountPersona\(personaValues\[0\]\)/);
assert.match(personaRoute, /supabase\.auth\.getUser\(\)/);
assert.match(personaRoute, /ensureAccountPersona\(userId, personaValues\[0\]\)/);
assert.match(personaRoute, /accountPersonaDestination\(resolution\.persona\)/);
assert.doesNotMatch(personaRoute, /\.from\("account_personas"\)/);

assert.match(personaPage, /getServerAuthorization\(\)/);
assert.match(personaPage, /getAccountPersona\(authorization\.userId\)/);
assert.match(personaPage, /action="\/auth\/persona\/complete" method="post"/);
assert.match(personaPage, /name="persona" value="CANDIDATE"/);
assert.match(personaPage, /name="persona" value="RECRUITER"/);
assert.match(personaPage, /product context, not employer verification/);
assert.doesNotMatch(personaPage, /createSupabaseAdminClient|\.from\("account_personas"\)/);

assert.match(personaAuthority, /^import "server-only";/);
assert.match(personaAuthority, /createSupabaseAdminClient\(\)/);
assert.match(personaAuthority, /\.from\("account_personas"\)/);
assert.match(personaAuthority, /if \(existing\.status !== "missing"\)/);
assert.match(personaAuthority, /return await readPersona\(admin, userId\)/);
assert.match(personaAuthority, /persona === "RECRUITER" \? "\/recruiters\/workspace" : "\/dashboard"/);

assert.match(routeClient, /^import "server-only";/);
assert.match(routeClient, /createServerClient<Database>/);
assert.match(routeClient, /cookieStore\.getAll\(\)/);
assert.match(routeClient, /cookieStore\.set\(name, value, options\)/);

assert.match(login, /getPublicOAuthConfiguration\(\)/);
assert.match(login, /action="\/auth\/oauth" method="post"/);
assert.match(login, /name="provider" value=\{provider\.id\}/);
assert.match(login, /oauth\.providers\.google/);
assert.match(login, /oauth\.providers\.github/);
assert.doesNotMatch(login, /signInWithOAuth/);

console.log("Public OAuth route fixtures: PASS.");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
