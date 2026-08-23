import assert from "node:assert/strict";
import pg from "pg";

const { Client } = pg;
const connection = { host: "127.0.0.1", port: 54322, database: "postgres", user: "postgres", password: "postgres" };
const db = new Client(connection);
const CANDIDATE = "41111111-1111-4111-8111-111111111111";
const RECRUITER = "42222222-2222-4222-8222-222222222222";
const SOURCE = "43333333-3333-4333-8333-333333333333";
const BRIEF = "44444444-4444-4444-8444-444444444444";
const ROLE_MAP = "45555555-5555-4555-8555-555555555555";
const REVIEW = "46666666-6666-4666-8666-666666666666";
const TOKEN_HASH = "b".repeat(64);
const REPLACEMENT_HASH = "c".repeat(64);
const JOB_DESCRIPTION = "Build accessible TypeScript interfaces and test delivery outcomes with a product team. Review ownership, validation, performance, and collaboration evidence.";
const EVIDENCE_MAP = JSON.stringify({ schemaVersion: 1, roleTitle: "Frontend role", summary: "Inspect evidence without scoring.", categories: [] });
let count = 0;
function pass(name) { count += 1; console.log(`PASS ${name}`); }

try {
  await db.connect();
  await seed();

  await denied("authenticated persona mutation is denied", RECRUITER, () => db.query("update public.account_personas set persona = 'CANDIDATE' where user_id = $1", [RECRUITER]));
  await denied("authenticated role-map insert is denied", RECRUITER, () => db.query("insert into public.recruiter_role_evidence_maps(user_id,role_title,job_description,evidence_map) values ($1,'Blocked role',$2,$3)", [RECRUITER, JOB_DESCRIPTION, EVIDENCE_MAP]));
  await denied("authenticated candidate-review insert is denied", CANDIDATE, () => db.query("insert into public.candidate_evidence_reviews(user_id,proof_brief_id,role_title,question_category,question_text,feedback_category,review_ease,review_time_signal) values ($1,$2,'Role','OWNERSHIP_CONTEXT','A sufficiently long question?','NEEDS_MORE_OWNERSHIP_CONTEXT','EASIER','LESS_TIME')", [CANDIDATE, BRIEF]));
  await denied("authenticated role-map RPC execution is denied", RECRUITER, () => db.query("select public.create_recruiter_role_evidence_map($1,'Blocked role',$2,$3::jsonb)", [RECRUITER, JOB_DESCRIPTION, EVIDENCE_MAP]));
  await denied("authenticated review RPC execution is denied", RECRUITER, () => db.query("select public.submit_candidate_evidence_review($1,$2,$3,'OWNERSHIP_CONTEXT','What did you own in this work?','NEEDS_MORE_OWNERSHIP_CONTEXT','EASIER','NOT_SURE',null)", [RECRUITER, TOKEN_HASH, ROLE_MAP]));

  const ownMaps = await asRole("authenticated", RECRUITER, () => db.query("select id from public.recruiter_role_evidence_maps"));
  assert.deepEqual(ownMaps.rows, [{ id: ROLE_MAP }]); pass("recruiter reads only owned role maps");
  const crossMaps = await asRole("authenticated", CANDIDATE, () => db.query("select id from public.recruiter_role_evidence_maps"));
  assert.deepEqual(crossMaps.rows, []); pass("candidate cannot read recruiter role maps");
  const ownReviews = await asRole("authenticated", CANDIDATE, () => db.query("select id,question_text from public.candidate_evidence_reviews"));
  assert.equal(ownReviews.rows.length, 1); pass("candidate reads received structured review");
  const recruiterReviews = await asRole("authenticated", RECRUITER, () => db.query("select id from public.candidate_evidence_reviews"));
  assert.deepEqual(recruiterReviews.rows, []); pass("recruiter cannot read candidate-owned review rows");
  await denied("candidate cannot read internal recruiter role-map reference", CANDIDATE, () => db.query("select role_map_id from public.candidate_evidence_reviews"));
  await denied("candidate cannot read Proof Brief token hash", CANDIDATE, () => db.query("select share_token_hash from public.proof_briefs"));
  await denied("anonymous role-map read is denied", null, () => db.query("select id from public.recruiter_role_evidence_maps"), "anon");
  await denied("anonymous candidate-review read is denied", null, () => db.query("select id from public.candidate_evidence_reviews"), "anon");

  await expectCode("cross-owner review-to-brief binding fails closed", "23503", () => db.query("insert into public.candidate_evidence_reviews(user_id,proof_brief_id,role_title,question_category,question_text,feedback_category,review_ease,review_time_signal) values ($1,$2,'Wrong owner role','OWNERSHIP_CONTEXT','What part of this evidence did you own?','NEEDS_MORE_OWNERSHIP_CONTEXT','EASIER','NOT_SURE')", [RECRUITER, BRIEF]));

  await seedRoleMapsToNine();
  const [firstCreate, secondCreate] = await Promise.all([
    callWithFreshClient("select public.create_recruiter_role_evidence_map($1,$2,$3,$4::jsonb) as result", [RECRUITER, "Concurrent role one", JOB_DESCRIPTION, roleMapPayload("Concurrent role one")]),
    callWithFreshClient("select public.create_recruiter_role_evidence_map($1,$2,$3,$4::jsonb) as result", [RECRUITER, "Concurrent role two", JOB_DESCRIPTION, roleMapPayload("Concurrent role two")]),
  ]);
  assert.deepEqual([firstCreate.rows[0].result.status, secondCreate.rows[0].result.status].sort(), ["CREATED", "LIMIT_REACHED"]);
  const mapCount = await db.query("select count(*)::integer as count from public.recruiter_role_evidence_maps where user_id = $1", [RECRUITER]);
  assert.equal(mapCount.rows[0].count, 10); pass("transactional role-map cap admits exactly one concurrent tenth map");

  await db.query("delete from public.candidate_evidence_reviews where id = $1", [REVIEW]);
  await assertLinkMutationWins("revocation", "update public.proof_briefs set visibility = 'PRIVATE', share_token_hash = null, share_created_at = null, revoked_at = now() where id = $1", TOKEN_HASH);
  await db.query("update public.proof_briefs set visibility = 'LINK_ONLY', share_token_hash = $2, share_created_at = now(), revoked_at = null where id = $1", [BRIEF, TOKEN_HASH]);
  await assertLinkMutationWins("replacement", "update public.proof_briefs set share_token_hash = $2, share_created_at = now() where id = $1", TOKEN_HASH, REPLACEMENT_HASH);

  const submitted = await db.query("select public.submit_candidate_evidence_review($1,$2,$3,'OWNERSHIP_CONTEXT','What part of the strongest example did you own, and which decisions were yours?','NEEDS_MORE_OWNERSHIP_CONTEXT','EASIER','LESS_TIME','Add one concrete decision.') as result", [RECRUITER, REPLACEMENT_HASH, ROLE_MAP]);
  assert.equal(submitted.rows[0].result.role_title, "Frontend role");
  assert.equal(Object.hasOwn(submitted.rows[0].result, "role_map_id"), false);
  const inserted = await db.query("select user_id,proof_brief_id from public.candidate_evidence_reviews where proof_brief_id = $1", [BRIEF]);
  assert.deepEqual(inserted.rows, [{ user_id: CANDIDATE, proof_brief_id: BRIEF }]); pass("atomic service-role review RPC inserts only the candidate-owned public projection");

  await db.query("delete from public.recruiter_role_evidence_maps where id = $1", [ROLE_MAP]);
  const retained = await db.query("select role_map_id from public.candidate_evidence_reviews where proof_brief_id = $1", [BRIEF]);
  assert.deepEqual(retained.rows, [{ role_map_id: null }]); pass("candidate feedback survives recruiter role-map deletion without recruiter identity");
  await db.query("delete from public.proof_briefs where id = $1", [BRIEF]);
  const cascaded = await db.query("select count(*)::integer as count from public.candidate_evidence_reviews where proof_brief_id = $1", [BRIEF]);
  assert.equal(cascaded.rows[0].count, 0); pass("Proof Brief deletion cascades received reviews");
  console.log(`PASS ${count} isolated recruiter evidence database checks`);
} catch (error) {
  console.error("FAIL isolated recruiter evidence database integration");
  console.error(error instanceof Error ? error.message : "Unknown database failure");
  process.exitCode = 1;
} finally {
  try { await db.query("delete from auth.users where id in ($1,$2)", [CANDIDATE, RECRUITER]); } catch {}
  await db.end();
}

async function seed() {
  await db.query("delete from auth.users where id in ($1,$2)", [CANDIDATE, RECRUITER]);
  await db.query(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated','candidate@example.test','',now(),now(),now()),('00000000-0000-0000-0000-000000000000',$2,'authenticated','authenticated','recruiter@example.test','',now(),now(),now())`, [CANDIDATE, RECRUITER]);
  await db.query("insert into public.account_personas(user_id,persona) values ($1,'CANDIDATE'),($2,'RECRUITER')", [CANDIDATE, RECRUITER]);
  await db.query("insert into public.resume_analyses(id,user_id,file_name,file_type,extracted_text,parsed_profile,user_profile) values ($1,$2,'synthetic.txt','text/plain','Synthetic','{}','{}')", [SOURCE, CANDIDATE]);
  await db.query("insert into public.proof_briefs(id,user_id,source_resume_analysis_id,brief_payload,visibility,share_token_hash,share_created_at) values ($1,$2,$3,$4,'LINK_ONLY',$5,now())", [BRIEF, CANDIDATE, SOURCE, JSON.stringify({ schemaVersion: 1 }), TOKEN_HASH]);
  await db.query("insert into public.recruiter_role_evidence_maps(id,user_id,role_title,job_description,evidence_map) values ($1,$2,'Frontend role',$3,$4)", [ROLE_MAP, RECRUITER, JOB_DESCRIPTION, EVIDENCE_MAP]);
  await db.query("insert into public.candidate_evidence_reviews(id,user_id,proof_brief_id,role_map_id,role_title,question_category,question_text,feedback_category,review_ease,review_time_signal,note) values ($1,$2,$3,$4,'Frontend role','OWNERSHIP_CONTEXT','What part of the strongest example did you own, and which decisions were yours?','NEEDS_MORE_OWNERSHIP_CONTEXT','EASIER','LESS_TIME','Add one concrete decision.')", [REVIEW, CANDIDATE, BRIEF, ROLE_MAP]);
}

async function seedRoleMapsToNine() {
  for (let index = 2; index <= 9; index += 1) {
    const title = `Synthetic role ${index}`;
    await db.query("insert into public.recruiter_role_evidence_maps(user_id,role_title,job_description,evidence_map) values ($1,$2,$3,$4::jsonb)", [RECRUITER, title, JOB_DESCRIPTION, roleMapPayload(title)]);
  }
}

async function assertLinkMutationWins(name, updateSql, staleHash, replacementHash = null) {
  const mutator = new Client(connection);
  const submitter = new Client(connection);
  await mutator.connect(); await submitter.connect();
  try {
    await mutator.query("begin");
    await mutator.query(updateSql, replacementHash === null ? [BRIEF] : [BRIEF, replacementHash]);
    const pending = submitter.query("select public.submit_candidate_evidence_review($1,$2,$3,'OWNERSHIP_CONTEXT','What part of the strongest example did you own, and which decisions were yours?','NEEDS_MORE_OWNERSHIP_CONTEXT','EASIER','NOT_SURE',null) as result", [RECRUITER, staleHash, ROLE_MAP]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await mutator.query("commit");
    const result = await pending;
    assert.equal(result.rows[0].result, null);
    const stored = await db.query("select count(*)::integer as count from public.candidate_evidence_reviews where proof_brief_id = $1", [BRIEF]);
    assert.equal(stored.rows[0].count, 0); pass(`atomic review submission rejects a token after concurrent ${name}`);
  } finally {
    try { await mutator.query("rollback"); } catch {}
    await mutator.end(); await submitter.end();
  }
}

async function callWithFreshClient(sql, values) { const client = new Client(connection); await client.connect(); try { return await client.query(sql, values); } finally { await client.end(); } }
async function asRole(role, userId, callback) { await db.query("begin"); try { await db.query(`set local role ${role}`); if (userId) await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [userId, JSON.stringify({ sub: userId, role })]); const result = await callback(); await db.query("rollback"); return result; } catch (error) { await db.query("rollback"); throw error; } }
async function denied(name, userId, callback, role = "authenticated") { let error; try { await asRole(role, userId, callback); } catch (caught) { error = caught; } assert.equal(error?.code, "42501"); pass(name); }
async function expectCode(name, code, callback) { let error; try { await callback(); } catch (caught) { error = caught; } assert.equal(error?.code, code); pass(name); }
function roleMapPayload(roleTitle) { return JSON.stringify({ schemaVersion: 1, roleTitle, summary: "Inspect evidence without scoring.", categories: [] }); }
