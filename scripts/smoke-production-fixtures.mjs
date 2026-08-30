import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const smokeScript = path.join(root, "scripts", "smoke-production.mjs");
const state = {
  exposeSignup: false,
  exposeProofBrief: false,
  publishPrivacyContact: true,
};

const server = http.createServer((request, response) => {
  const pathname = new URL(
    request.url ?? "/",
    "http://127.0.0.1",
  ).pathname;

  applySecurityHeaders(response);

  if (pathname === "/api/health/config") {
    response.writeHead(200, {
      "content-type": "application/json",
    });
    response.end(JSON.stringify({ status: "healthy" }));
    return;
  }

  if (
    pathname === "/api/proof-brief" ||
    pathname === "/api/recruiter-evidence"
  ) {
    const exposed =
      pathname === "/api/proof-brief" && state.exposeProofBrief;
    response.writeHead(exposed ? 200 : 401, {
      "cache-control": "no-store",
      "content-type": "application/json",
    });
    response.end(JSON.stringify({
      code: exposed ? "unexpected_public_access" : "not_authenticated",
      message: "Synthetic response",
    }));
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
  });

  if (pathname === "/signup") {
    response.end(
      state.exposeSignup
        ? "<!doctype html><html><body><form><input name=\"email\"></form></body></html>"
        : "<!doctype html><html><body><p>Account creation is currently closed.</p></body></html>",
    );
    return;
  }

  if (pathname === "/privacy") {
    response.end(
      state.publishPrivacyContact
        ? "<!doctype html><html><body><a href=\"mailto:privacy@example.com\">privacy@example.com</a></body></html>"
        : "<!doctype html><html><body><p>A verified privacy/support contact is not currently published.</p></body></html>",
    );
    return;
  }

  response.end("<!doctype html><html><body>SkillMint synthetic route</body></html>");
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const closed = await runSmoke(baseUrl);
  assert.equal(
    closed.code,
    0,
    `closed controlled-beta contract should pass:\n${closed.output}`,
  );
  assert.match(closed.output, /PASS \/signup/);
  assert.match(closed.output, /PASS \/privacy/);
  assert.match(closed.output, /PASS \/api\/proof-brief \(401\)/);
  assert.match(closed.output, /PASS \/api\/recruiter-evidence \(401\)/);
  assert.match(closed.output, /Smoke test passed\./);

  state.exposeSignup = true;
  const openSignup = await runSmoke(baseUrl);
  assert.notEqual(openSignup.code, 0);
  assert.match(
    openSignup.output,
    /\/signup: controlled-beta signup closure copy is missing|\/signup: a signup form is exposed/,
  );
  state.exposeSignup = false;

  state.exposeProofBrief = true;
  const exposedProofBrief = await runSmoke(baseUrl);
  assert.notEqual(exposedProofBrief.code, 0);
  assert.match(
    exposedProofBrief.output,
    /\/api\/proof-brief: expected 401, received 200/,
  );
  state.exposeProofBrief = false;

  state.publishPrivacyContact = false;
  const missingPrivacyContact = await runSmoke(baseUrl);
  assert.notEqual(missingPrivacyContact.code, 0);
  assert.match(
    missingPrivacyContact.output,
    /\/privacy: verified privacy\/support contact is not published/,
  );

  console.log("Production smoke fixtures passed.");
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function applySecurityHeaders(response) {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader(
    "referrer-policy",
    "strict-origin-when-cross-origin",
  );
  response.setHeader(
    "content-security-policy",
    "default-src 'self'; object-src 'none'; frame-ancestors 'none'",
  );
}

function runSmoke(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [smokeScript], {
      cwd: root,
      env: {
        ...process.env,
        SMOKE_BASE_URL: baseUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({
        code: code ?? 1,
        output,
      });
    });
  });
}
