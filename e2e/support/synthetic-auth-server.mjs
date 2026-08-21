import http from "node:http";

const HOST = "127.0.0.1";
const PORT = 54321;
const CREATED_AT = "2026-01-02T03:04:05.000Z";
const accounts = new Map([
  ["11111111-1111-4111-8111-111111111111", {
    id: "11111111-1111-4111-8111-111111111111",
    email: "account-a@example.test",
    name: "Account A",
  }],
  ["22222222-2222-4222-8222-222222222222", {
    id: "22222222-2222-4222-8222-222222222222",
    email: "account-b@example.test",
    name: "Account B",
  }],
]);
let authUserRequests = 0;
let applicationRequests = 0;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);

  const isControlRequest = ["/health", "/__reset", "/__requests"].includes(
    url.pathname,
  );
  if (!isControlRequest) {
    applicationRequests += 1;
  }

  if (request.method === "OPTIONS") {
    send(response, 204, null);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    send(response, 200, { status: "ready" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__reset") {
    authUserRequests = 0;
    applicationRequests = 0;
    send(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__requests") {
    send(response, 200, { applicationRequests, authUserRequests });
    return;
  }

  if (request.method === "GET" && url.pathname === "/auth/v1/user") {
    authUserRequests += 1;
    const account = accountFromAuthorization(request.headers.authorization);
    if (!account) {
      send(response, 401, { message: "Synthetic session missing" });
      return;
    }
    send(response, 200, createUser(account));
    return;
  }

  send(response, 404, { message: "Synthetic route not found" });
});

server.listen(PORT, HOST);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

function accountFromAuthorization(value) {
  const token = value?.replace(/^Bearer\s+/iu, "");
  if (!token) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    return accounts.get(payload.sub) ?? null;
  } catch {
    return null;
  }
}

function createUser(account) {
  return {
    id: account.id,
    aud: "authenticated",
    role: "authenticated",
    email: account.email,
    email_confirmed_at: CREATED_AT,
    confirmed_at: CREATED_AT,
    last_sign_in_at: CREATED_AT,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: account.name },
    identities: [],
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    is_anonymous: false,
  };
}

function send(response, status, body) {
  response.writeHead(status, {
    "access-control-allow-origin": "http://127.0.0.1:3100",
    "access-control-allow-headers":
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  response.end(body === null ? "" : JSON.stringify(body));
}
