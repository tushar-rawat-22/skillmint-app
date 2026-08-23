import assert from "node:assert/strict";

import pg from "pg";

const { Client } = pg;
const LOCAL_DATABASE_CONFIG = {
  host: "127.0.0.1",
  port: 54322,
  database: "postgres",
  user: "postgres",
  password: "postgres",
};
const USER_A = "31111111-1111-4111-8111-111111111111";
const USER_B = "32222222-2222-4222-8222-222222222222";
const SOURCE_ID = "33333333-3333-4333-8333-333333333333";
const BRIEF_ID = "34444444-4444-4444-8444-444444444444";
const TOKEN_HASH = "a".repeat(64);

const tests = [];
function pass(name) {
  tests.push(name);
  console.log(`PASS ${name}`);
}

const client = new Client(LOCAL_DATABASE_CONFIG);

try {
  await client.connect();
  await client.query("begin");
  await seedSyntheticRows();

  const ownRows = await asRole("authenticated", USER_A, () =>
    client.query("select id from public.proof_briefs order by id"));
  assert.deepEqual(ownRows.rows, [{ id: BRIEF_ID }]);
  pass("authenticated owner can read only the owned Proof Brief");

  const crossOwnerRows = await asRole("authenticated", USER_B, () =>
    client.query("select id from public.proof_briefs order by id"));
  assert.deepEqual(crossOwnerRows.rows, []);
  pass("authenticated cross-owner read is hidden by RLS");

  await expectDenied("authenticated token-hash column read is denied", () =>
    client.query("select share_token_hash from public.proof_briefs"));

  await expectDenied("authenticated direct Proof Brief insert is denied", () =>
    client.query(
      `insert into public.proof_briefs (
        user_id, source_resume_analysis_id, brief_payload
      ) values ($1, $2, $3::jsonb)`,
      [USER_A, SOURCE_ID, JSON.stringify(publicPayload())],
    ));

  await expectDenied("authenticated direct Proof Brief payload update is denied", () =>
    client.query(
      "update public.proof_briefs set brief_payload = $1::jsonb where id = $2",
      [JSON.stringify({ rawResume: "synthetic private payload" }), BRIEF_ID],
    ));

  await expectDenied("authenticated direct Proof Brief delete is denied", () =>
    client.query("delete from public.proof_briefs where id = $1", [BRIEF_ID]));

  await expectDenied("anonymous table read is denied", () =>
    client.query("select id from public.proof_briefs"), "anon");

  const shared = await asRole("anon", null, () =>
    client.query(
      "select public.get_shared_proof_brief($1) as result",
      [TOKEN_HASH],
    ));
  const result = shared.rows[0]?.result;
  assert.ok(result);
  assert.deepEqual(Object.keys(result).sort(), ["payload", "shared_at"]);
  assert.deepEqual(Object.keys(result.payload).sort(), [
    "bestNextMove",
    "currentSupport",
    "direction",
    "evidenceSignals",
    "mainEvidenceGap",
    "schemaVersion",
    "sourceSummary",
    "strongestSupport",
  ]);
  assert.deepEqual(Object.keys(result.payload.evidenceSignals[0]).sort(), [
    "detail",
    "label",
    "state",
  ]);
  assert.equal(JSON.stringify(result).includes("rawResume"), false);
  assert.equal(JSON.stringify(result).includes("sourceUrl"), false);
  pass("anonymous RPC returns only the exact allowlisted public projection");

  await client.query(
    `update public.proof_briefs
     set visibility = 'PRIVATE', share_token_hash = null,
         share_created_at = null, revoked_at = now()
     where id = $1`,
    [BRIEF_ID],
  );
  const revoked = await asRole("anon", null, () =>
    client.query(
      "select public.get_shared_proof_brief($1) as result",
      [TOKEN_HASH],
    ));
  assert.equal(revoked.rows[0]?.result, null);
  pass("revoked Proof Brief token fails closed");

  await client.query("delete from public.resume_analyses where id = $1", [SOURCE_ID]);
  const cascaded = await client.query(
    "select count(*)::integer as count from public.proof_briefs where id = $1",
    [BRIEF_ID],
  );
  assert.equal(cascaded.rows[0]?.count, 0);
  pass("saved-analysis deletion cascades to its Proof Brief");

  await client.query("rollback");
  console.log(`PASS ${tests.length} isolated Proof Brief database integration checks`);
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // The original failure is authoritative.
  }
  console.error("FAIL isolated Proof Brief database integration");
  console.error(error instanceof Error ? error.message : "Unknown database failure");
  process.exitCode = 1;
} finally {
  await client.end();
}

async function seedSyntheticRows() {
  await client.query(
    `insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at
    ) values
      ('00000000-0000-0000-0000-000000000000', $1, 'authenticated',
       'authenticated', 'candidate-a@example.test', '', now(), now(), now()),
      ('00000000-0000-0000-0000-000000000000', $2, 'authenticated',
       'authenticated', 'candidate-b@example.test', '', now(), now(), now())`,
    [USER_A, USER_B],
  );
  await client.query(
    `insert into public.resume_analyses (
      id, user_id, file_name, file_type, extracted_text,
      parsed_profile, user_profile
    ) values ($1, $2, 'synthetic-proof-brief.txt', 'text/plain',
      'Synthetic evidence fixture', '{}'::jsonb, '{}'::jsonb)`,
    [SOURCE_ID, USER_A],
  );
  const tamperedPayload = {
    ...publicPayload(),
    rawResume: "synthetic private payload",
    evidenceSignals: [{
      ...publicPayload().evidenceSignals[0],
      sourceUrl: "https://synthetic.invalid/private",
    }],
  };
  await client.query(
    `insert into public.proof_briefs (
      id, user_id, source_resume_analysis_id, brief_payload,
      visibility, share_token_hash, share_created_at
    ) values ($1, $2, $3, $4::jsonb, 'LINK_ONLY', $5, now())`,
    [BRIEF_ID, USER_A, SOURCE_ID, JSON.stringify(tamperedPayload), TOKEN_HASH],
  );
}

async function asRole(role, userId, callback) {
  await client.query("savepoint role_probe");
  try {
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query(
        "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)",
        [userId, JSON.stringify({ sub: userId, role })],
      );
    }
    return await callback();
  } finally {
    await client.query("rollback to savepoint role_probe");
    await client.query("release savepoint role_probe");
  }
}

async function expectDenied(name, callback, role = "authenticated") {
  let error = null;
  try {
    await asRole(role, role === "authenticated" ? USER_A : null, callback);
  } catch (caught) {
    error = caught;
  }
  assert.equal(error?.code, "42501");
  pass(name);
}

function publicPayload() {
  return {
    schemaVersion: 1,
    direction: "Software Engineer",
    currentSupport: "The synthetic resume supports exploring this direction.",
    strongestSupport: "One selected signal has applied context.",
    mainEvidenceGap: "One selected signal needs a clearer example.",
    bestNextMove: "Add one concrete project outcome.",
    evidenceSignals: [{
      state: "STRONG",
      label: "TypeScript",
      detail: "Connected to synthetic applied context.",
    }],
    sourceSummary: {
      projectEntries: 1,
      experienceEntries: 1,
      evidenceCandidateLinks: 0,
    },
  };
}
