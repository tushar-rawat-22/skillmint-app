import http from "node:http";
import { createHash } from "node:crypto";

const HOST = "127.0.0.1";
const PORT = 54321;
const CREATED_AT = "2026-01-02T03:04:05.000Z";
export const SHARED_PROOF_BRIEF_TOKEN = "S".repeat(43);
const SHARED_PROOF_BRIEF_TOKEN_HASH = createHash("sha256")
  .update(SHARED_PROOF_BRIEF_TOKEN, "utf8")
  .digest("hex");
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
const proofBriefs = new Map();
let proofSourceMode = "normal";

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);

  const isControlRequest = ["/health", "/__reset", "/__requests", "/__proof-brief", "/__proof-source-mode"].includes(
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
    proofBriefs.clear();
    proofSourceMode = "normal";
    send(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/__proof-source-mode") {
    const body = await readJsonBody(request);
    if (!body || !["normal", "tampered"].includes(body.mode)) {
      send(response, 400, { message: "Invalid synthetic source mode" });
      return;
    }
    proofSourceMode = body.mode;
    send(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__requests") {
    send(response, 200, { applicationRequests, authUserRequests });
    return;
  }

  if (request.method === "GET" && url.pathname === "/__proof-brief") {
    send(response, 200, proofBriefs.get(url.searchParams.get("user")) ?? null);
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

  if (
    request.method === "POST" &&
    url.pathname === "/rest/v1/rpc/get_shared_proof_brief"
  ) {
    const body = await readJsonBody(request);
    send(
      response,
      200,
      body.requested_token_hash === SHARED_PROOF_BRIEF_TOKEN_HASH
        ? syntheticSharedProofBrief()
        : null,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/rest/v1/resume_analyses") {
    const userId = postgrestEq(url, "user_id");
    const sourceId = postgrestEq(url, "id");
    const account = accounts.get(userId);
    send(
      response,
      200,
      account && sourceId === "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
        ? [syntheticResumeAnalysis(account, sourceId)]
        : [],
    );
    return;
  }

  if (url.pathname === "/rest/v1/proof_briefs") {
    const userId = postgrestEq(url, "user_id");
    if (request.method === "GET") {
      const row = proofBriefs.get(userId);
      const sourceId = postgrestEq(url, "source_resume_analysis_id");
      const briefId = postgrestEq(url, "id");
      send(
        response,
        200,
        row && (!sourceId || row.source_resume_analysis_id === sourceId) &&
            (!briefId || row.id === briefId)
          ? [publicProofBriefRow(row)]
          : [],
      );
      return;
    }
    if (request.method === "POST") {
      const body = await readJsonBody(request);
      const row = {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        user_id: body.user_id,
        source_resume_analysis_id: body.source_resume_analysis_id,
        brief_payload: body.brief_payload,
        visibility: body.visibility,
        share_token_hash: null,
        share_created_at: null,
        revoked_at: null,
        created_at: CREATED_AT,
        updated_at: CREATED_AT,
      };
      proofBriefs.set(body.user_id, row);
      send(response, 200, [publicProofBriefRow(row)]);
      return;
    }
    if (request.method === "PATCH") {
      const body = await readJsonBody(request);
      const row = proofBriefs.get(userId);
      const briefId = postgrestEq(url, "id");
      if (!row || (briefId && row.id !== briefId)) {
        send(response, 200, []);
        return;
      }
      const updated = { ...row, ...body, updated_at: CREATED_AT };
      proofBriefs.set(userId, updated);
      send(response, 200, [publicProofBriefRow(updated)]);
      return;
    }
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

function syntheticSharedProofBrief() {
  return {
    payload: {
      schemaVersion: 1,
      direction: "Software Engineer",
      currentSupport: "The current resume supports exploring a software engineering direction.",
      strongestSupport: "Two selected skill signals are connected to applied resume context.",
      mainEvidenceGap: "One selected skill claim needs a clearer applied example.",
      bestNextMove: "Connect the unclear claim to a concrete project example.",
      evidenceSignals: [
        {
          state: "STRONG",
          label: "TypeScript",
          detail: "Connected to applied resume context; the source has not been independently verified.",
        },
        {
          state: "UNCLEAR",
          label: "PostgreSQL",
          detail: "Listed without a clear applied evidence connection.",
        },
      ],
      sourceSummary: {
        projectEntries: 2,
        experienceEntries: 1,
        evidenceCandidateLinks: 0,
      },
    },
    shared_at: CREATED_AT,
  };
}

function syntheticResumeAnalysis(account, id) {
  const row = {
    id,
    user_id: account.id,
    file_name: "synthetic-proof-brief.txt",
    file_type: "text/plain",
    extracted_text: [
      "Skills: TypeScript React testing PostgreSQL",
      "Projects: Built a typed interface with component tests and measurable performance improvement.",
      "Experience: Contributed reusable components with documented review checks.",
      "Education: Undergraduate computing programme",
    ].join("\n"),
    parsed_profile: {
      skills: ["TypeScript", "React", "Testing", "PostgreSQL"],
      projects: ["Built a typed interface with component tests and measurable performance improvement."],
      education: ["Undergraduate computing programme"],
      experience: ["Contributed reusable components with documented review checks."],
      certifications: [],
      links: {},
      rawSections: {},
    },
    user_profile: {
      resumeScore: 72,
      skillsScore: 74,
      projectsScore: 70,
      experienceScore: 66,
      educationScore: 70,
      githubScore: 0,
      linkedinScore: 0,
      atsScore: 70,
      recruiterScore: 0,
      activityScore: 0,
      skills: ["TypeScript", "React", "Testing", "PostgreSQL"],
      projects: ["Built a typed interface with component tests and measurable performance improvement."],
      experience: ["Contributed reusable components with documented review checks."],
      education: "Undergraduate computing programme",
      certifications: [],
      codingProfiles: [],
      analysisFlags: {
        hasMeasurableImpact: true,
        hasSectionClarity: true,
        hasProofLink: false,
        hasGenericProjects: false,
        isPlaceholderText: false,
      },
    },
    created_at: CREATED_AT,
  };
  if (proofSourceMode !== "tampered") return row;

  const privateStrings = [
    "Jane Doe",
    "Acme Corp",
    "12 Main Street London",
    "+1 (555) 123-4567",
    "Synthetic University",
  ];
  return {
    ...row,
    extracted_text: [row.extracted_text, ...privateStrings].join("\n"),
    parsed_profile: {
      ...row.parsed_profile,
      skills: ["TypeScript", ...privateStrings],
    },
    user_profile: {
      ...row.user_profile,
      skills: ["TypeScript", ...privateStrings],
    },
  };
}

function publicProofBriefRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    source_resume_analysis_id: row.source_resume_analysis_id,
    brief_payload: row.brief_payload,
    visibility: row.visibility,
    share_created_at: row.share_created_at,
    revoked_at: row.revoked_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function postgrestEq(url, key) {
  const value = url.searchParams.get(key);
  return value?.startsWith("eq.") ? value.slice(3) : null;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function send(response, status, body) {
  response.writeHead(status, {
    "access-control-allow-origin": "http://127.0.0.1:3100",
    "access-control-allow-headers":
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
    "cache-control": "no-store",
    "content-type": "application/json",
  });
  response.end(body === null ? "" : JSON.stringify(body));
}
