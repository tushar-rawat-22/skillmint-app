const DEFAULT_BASE_URL = "https://skillmint-app-three.vercel.app";
const baseUrl = (
  process.env.SMOKE_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/+$/, "");

const htmlRoutes = [
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
  "/privacy",
  "/support",
];

const protectedApiRoutes = [
  {
    route: "/api/proof-brief",
    status: 401,
    code: "not_authenticated",
  },
  {
    route: "/api/recruiter-evidence",
    status: 401,
    code: "not_authenticated",
  },
];

const REQUIRED_SECURITY_HEADERS = [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
];

let failures = 0;

console.log(`Production smoke test: ${baseUrl}`);

await checkHealthConfig();

for (const route of htmlRoutes) {
  await checkHtmlRoute(route);
}

for (const contract of protectedApiRoutes) {
  await checkProtectedApi(contract);
}

async function checkHtmlRoute(route) {
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
      fail(`${route}: expected 2xx, received ${response.status}`);
      return;
    }

    if (!isHtml) {
      fail(`${route}: expected HTML, received ${contentType || "unknown"}`);
      return;
    }

    if (!checkSecurityHeaders(response, route)) {
      return;
    }

    if (route === "/signup" && !checkClosedSignup(html)) {
      return;
    }

    if (route === "/privacy" && !checkPrivacyContact(html)) {
      return;
    }

    console.log(`PASS ${route}`);
  } catch (error) {
    fail(
      `${route}: ${error instanceof Error ? error.message : "unknown error"}`,
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
      fail(`${route}: expected 2xx, received ${response.status}`);
      return;
    }

    if (!contentType.includes("application/json")) {
      fail(`${route}: expected JSON, received ${contentType || "unknown"}`);
      return;
    }

    if (!checkSecurityHeaders(response, route)) {
      return;
    }

    const payload = await response.json();

    if (!isHealthConfigPayload(payload)) {
      fail(`${route}: response JSON has an unexpected shape`);
      return;
    }

    console.log(`PASS ${route}`);
  } catch (error) {
    fail(
      `${route}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function checkProtectedApi({ route, status, code }) {
  const url = `${baseUrl}${route}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const cacheControl = response.headers.get("cache-control") ?? "";

    if (response.status !== status) {
      fail(`${route}: expected ${status}, received ${response.status}`);
      return;
    }

    if (!contentType.includes("application/json")) {
      fail(`${route}: expected JSON, received ${contentType || "unknown"}`);
      return;
    }

    if (!cacheControl.toLowerCase().includes("no-store")) {
      fail(`${route}: protected response must use cache-control no-store`);
      return;
    }

    if (!checkSecurityHeaders(response, route)) {
      return;
    }

    const payload = await response.json();

    if (
      !payload ||
      typeof payload !== "object" ||
      payload.code !== code
    ) {
      fail(`${route}: protected response JSON has an unexpected shape`);
      return;
    }

    console.log(`PASS ${route}`);
  } catch (error) {
    fail(
      `${route}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

function checkSecurityHeaders(response, route) {
  for (const [header, expected] of REQUIRED_SECURITY_HEADERS) {
    const value = response.headers.get(header) ?? "";
    if (!value.toLowerCase().includes(expected.toLowerCase())) {
      fail(`${route}: missing or invalid ${header}`);
      return false;
    }
  }

  const csp = response.headers.get("content-security-policy") ?? "";
  if (!csp.includes("default-src 'self'")) {
    fail(`${route}: missing expected content-security-policy`);
    return false;
  }

  return true;
}

function checkClosedSignup(html) {
  const closedCopy = [
    "Public self-signup is currently disabled",
    "Public signup is closed",
  ];

  if (!closedCopy.some((copy) => html.includes(copy))) {
    fail("/signup: closed-signup copy is missing");
    return false;
  }

  return true;
}

function checkPrivacyContact(html) {
  if (
    !html.includes("Questions and contact") ||
    (!html.includes("SkillMint operations mailbox") &&
      !html.includes("verified privacy/support contact is not currently published"))
  ) {
    fail("/privacy: privacy/support contact state is missing");
    return false;
  }

  return true;
}

function isHealthConfigPayload(payload) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      typeof payload.ok === "boolean" &&
      payload.checks &&
      typeof payload.checks === "object",
  );
}

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log("Production smoke test passed.");
}
