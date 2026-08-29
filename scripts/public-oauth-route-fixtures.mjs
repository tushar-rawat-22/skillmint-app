import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");

const initiation = read("src/app/auth/oauth/route.ts");
const callback = read("src/app/auth/callback/route.ts");
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
assert.match(callback, /searchParams\.getAll\("code"\)/);
assert.match(callback, /codes\.length === 1/);
assert.match(callback, /code\.length > MAX_CODE_LENGTH/);
assert.match(callback, /exchangeCodeForSession\(code\)/);
assert.match(callback, /supabase\.auth\.getUser\(\)/);
assert.match(callback, /NextResponse\.redirect\(new URL\("\/", appOrigin\), 303\)/);
assert.doesNotMatch(callback, /searchParams\.get\(["']next["']\)/);
assert.doesNotMatch(callback, /provider_token|provider_refresh_token/);

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
