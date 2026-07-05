const DEFAULT_BASE_URL = "https://skillmint-app-three.vercel.app";
const baseUrl = (
  process.env.SMOKE_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/+$/, "");

const routes = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/setup",
  "/upload",
  "/resume",
  "/ats",
  "/roadmap",
  "/profile",
  "/settings",
];

let failures = 0;

console.log(`Production smoke test: ${baseUrl}`);

await checkHealthConfig();

for (const route of routes) {
  const url = `${baseUrl}${route}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const html = await response.text();
    const isSuccess = response.status >= 200 && response.status < 300;
    const isHtml =
      contentType.includes("text/html") ||
      /<html[\s>]/i.test(html) ||
      /^<!doctype html/i.test(html.trim());

    if (!isSuccess) {
      failures += 1;
      console.error(`FAIL ${route}: expected 2xx, received ${response.status}`);
      continue;
    }

    if (!isHtml) {
      failures += 1;
      console.error(
        `FAIL ${route}: expected HTML, received ${contentType || "unknown"}`,
      );
      continue;
    }

    console.log(`PASS ${route}`);
  } catch (error) {
    failures += 1;
    console.error(
      `FAIL ${route}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function checkHealthConfig() {
  const route = "/api/health/config";
  const url = `${baseUrl}${route}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (response.status < 200 || response.status >= 300) {
      failures += 1;
      console.error(`FAIL ${route}: expected 2xx, received ${response.status}`);
      return;
    }

    if (!contentType.includes("application/json")) {
      failures += 1;
      console.error(
        `FAIL ${route}: expected JSON, received ${contentType || "unknown"}`,
      );
      return;
    }

    const payload = await response.json();

    if (!isHealthConfigPayload(payload)) {
      failures += 1;
      console.error(`FAIL ${route}: response JSON has an unexpected shape`);
      return;
    }

    if (!payload.supabaseConfigured) {
      failures += 1;
      const missingEnvVars = payload.missingEnvVars.length
        ? payload.missingEnvVars.join(", ")
        : "unknown";

      console.error(
        `FAIL ${route}: Supabase env is not configured. Missing: ${missingEnvVars}`,
      );
      return;
    }

    console.log(`PASS ${route}`);
  } catch (error) {
    failures += 1;
    console.error(
      `FAIL ${route}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

function isHealthConfigPayload(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof value.supabaseConfigured === "boolean" &&
    Array.isArray(value.missingEnvVars) &&
    value.missingEnvVars.every((item) => typeof item === "string");
}

if (failures > 0) {
  console.error(`Smoke test failed with ${failures} issue(s).`);
  process.exitCode = 1;
} else {
  console.log("Smoke test passed.");
}
