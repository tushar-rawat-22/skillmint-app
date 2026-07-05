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

const accountRoutes = new Set([
  "/login",
  "/signup",
  "/profile",
  "/settings",
]);

const forbiddenAccountCopy = [
  "Supabase is not configured",
  "Supabase environment variables are missing",
  "Account sync is unavailable",
  "Persistent profile storage is not configured",
];

let failures = 0;

console.log(`Production smoke test: ${baseUrl}`);

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

    const forbiddenCopy = forbiddenAccountCopy.find((phrase) =>
      html.includes(phrase),
    );

    if (accountRoutes.has(route) && forbiddenCopy) {
      failures += 1;
      console.error(
        `FAIL ${route}: account configuration warning found: "${forbiddenCopy}"`,
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

if (failures > 0) {
  console.error(`Smoke test failed with ${failures} issue(s).`);
  process.exitCode = 1;
} else {
  console.log("Smoke test passed.");
}
