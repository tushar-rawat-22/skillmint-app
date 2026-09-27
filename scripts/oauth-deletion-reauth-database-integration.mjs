import assert from "node:assert/strict";
import pg from "pg";

const { Client } = pg;
const connection = {
  host: "127.0.0.1",
  port: 54322,
  database: "postgres",
  user: "postgres",
  password: "postgres",
};
const db = new Client(connection);
const ACCOUNT_A = "71111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "72222222-2222-4222-8222-222222222222";
const PURPOSE = "account_deletion";
let sequence = 0;
let checks = 0;

try {
  await db.connect();
  await seedUsers();

  await denied("authenticated users cannot read reauthentication intents", ACCOUNT_A, () =>
    db.query("select nonce_hash from public.oauth_deletion_reauth_intents"));
  await denied("authenticated users cannot create reauthentication intents", ACCOUNT_A, () =>
    db.query("select public.create_oauth_deletion_reauth_intent($1,$2,'google',$3)", [ACCOUNT_A, nonce(), PURPOSE]));
  await denied("authenticated users cannot consume reauthentication intents", ACCOUNT_A, () =>
    db.query("select public.consume_oauth_deletion_reauth_intent($1,$2,'google',$3)", [nonce(), ACCOUNT_A, PURPOSE]));

  const mismatch = nonce();
  assert.equal(await create(ACCOUNT_A, mismatch), true);
  assert.equal(await mark(mismatch, ACCOUNT_B, "google"), false);
  assert.equal(await mark(mismatch, ACCOUNT_A, "google"), false);
  assert.equal(await consume(mismatch, ACCOUNT_A), false);
  pass("another-account callback consumes the intent and cannot be retried");

  const wrongProvider = nonce();
  assert.equal(await create(ACCOUNT_A, wrongProvider), true);
  assert.equal(await mark(wrongProvider, ACCOUNT_A, "github"), false);
  assert.equal(await mark(wrongProvider, ACCOUNT_A, "google"), false);
  pass("wrong-provider callback fails closed and burns the intent");

  const stale = nonce();
  assert.equal(await create(ACCOUNT_A, stale), true);
  await db.query("update public.oauth_deletion_reauth_intents set expires_at = created_at + interval '1 second' where nonce_hash = $1", [stale]);
  await db.query("update public.oauth_deletion_reauth_intents set created_at = statement_timestamp() - interval '2 seconds', expires_at = statement_timestamp() - interval '1 second' where nonce_hash = $1", [stale]);
  assert.equal(await mark(stale, ACCOUNT_A, "google"), false);
  pass("expired callback is denied and consumed");

  const abort = nonce();
  assert.equal(await create(ACCOUNT_A, abort), true);
  assert.equal(await scalar("select public.invalidate_oauth_deletion_reauth_intent($1) as result", [abort]), true);
  assert.equal(await mark(abort, ACCOUNT_A, "google"), false);
  pass("aborted provider flow cannot later return");

  const oneTime = nonce();
  assert.equal(await create(ACCOUNT_A, oneTime), true);
  assert.equal(await mark(oneTime, ACCOUNT_A, "google"), true);
  const [first, second] = await Promise.all([
    callWithFreshClient("select public.consume_oauth_deletion_reauth_intent($1,$2,'google',$3) as result", [oneTime, ACCOUNT_A, PURPOSE]),
    callWithFreshClient("select public.consume_oauth_deletion_reauth_intent($1,$2,'google',$3) as result", [oneTime, ACCOUNT_A, PURPOSE]),
  ]);
  assert.deepEqual([first.rows[0].result, second.rows[0].result].sort(), [false, true]);
  assert.equal(await consume(oneTime, ACCOUNT_A), false);
  pass("concurrent and replayed deletion proof consumption admits exactly one request");

  const callbackReplay = nonce();
  assert.equal(await create(ACCOUNT_A, callbackReplay), true);
  assert.equal(await mark(callbackReplay, ACCOUNT_A, "google"), true);
  assert.equal(await mark(callbackReplay, ACCOUNT_A, "google"), false);
  assert.equal(await consume(callbackReplay, ACCOUNT_A), false);
  pass("callback replay burns the otherwise valid deletion proof");

  const cascaded = nonce();
  assert.equal(await create(ACCOUNT_B, cascaded), true);
  await db.query("delete from auth.users where id = $1", [ACCOUNT_B]);
  const remaining = await db.query("select count(*)::integer as count from public.oauth_deletion_reauth_intents where nonce_hash = $1", [cascaded]);
  assert.equal(remaining.rows[0].count, 0);
  pass("Auth-user deletion cascades any remaining proof state");

  console.log(`PASS ${checks} isolated OAuth deletion reauthentication database checks`);
} catch (error) {
  console.error("FAIL isolated OAuth deletion reauthentication database integration");
  console.error(error instanceof Error ? error.message : "Unknown database failure");
  process.exitCode = 1;
} finally {
  try {
    await db.query("delete from auth.users where id in ($1,$2)", [ACCOUNT_A, ACCOUNT_B]);
  } catch {}
  await db.end();
}

async function seedUsers() {
  await db.query("delete from auth.users where id in ($1,$2)", [ACCOUNT_A, ACCOUNT_B]);
  await db.query(
    `insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
     values
       ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated','oauth-a@example.test','',now(),now(),now()),
       ('00000000-0000-0000-0000-000000000000',$2,'authenticated','authenticated','oauth-b@example.test','',now(),now(),now())`,
    [ACCOUNT_A, ACCOUNT_B],
  );
}

async function create(userId, value) {
  return scalar(
    "select public.create_oauth_deletion_reauth_intent($1,$2,'google',$3) as result",
    [userId, value, PURPOSE],
  );
}

async function mark(value, userId, provider) {
  return scalar(
    "select public.mark_oauth_deletion_reauth_returned($1,$2,$3,$4) as result",
    [value, userId, provider, PURPOSE],
  );
}

async function consume(value, userId) {
  return scalar(
    "select public.consume_oauth_deletion_reauth_intent($1,$2,'google',$3) as result",
    [value, userId, PURPOSE],
  );
}

async function scalar(sql, values) {
  const result = await db.query(sql, values);
  return result.rows[0].result;
}

async function callWithFreshClient(sql, values) {
  const client = new Client(connection);
  await client.connect();
  try {
    return await client.query(sql, values);
  } finally {
    await client.end();
  }
}

async function denied(name, userId, callback) {
  let error;
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)",
      [userId, JSON.stringify({ sub: userId, role: "authenticated" })],
    );
    await callback();
  } catch (caught) {
    error = caught;
  } finally {
    await db.query("rollback");
  }
  assert.equal(error?.code, "42501");
  pass(name);
}

function nonce() {
  sequence += 1;
  return sequence.toString(16).padStart(64, "0");
}

function pass(name) {
  checks += 1;
  console.log(`PASS ${name}`);
}
