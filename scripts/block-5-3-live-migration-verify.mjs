import {
  ACCOUNT_TABLES,
  assertSafeRunId,
  createDatabaseClient,
  parseArgs,
  readFreshArtifact,
  refuse,
  requireString,
  resolveSafeTarget,
  sha256,
  writeSecretFreeArtifact,
} from "./block-5-3-live-common.mjs";

class CatalogMismatchError extends Error {
  constructor(mismatchPath) {
    super("Exact normalized catalog mismatch.");
    this.name = "CatalogMismatchError";
    this.mismatchPath = mismatchPath;
  }
}

const args = parseArgs(process.argv.slice(2));
if (args["execute-read-only"] !== true) refuse("read_only_execution_not_enabled");
const target = resolveSafeTarget();
const runId = assertSafeRunId(requireString(args, "run-id"));
readFreshArtifact(requireString(args, "preflight-artifact"), {
  kind: "skillmint-block-5-3-preflight",
  projectReferenceSha256: target.projectReferenceSha256,
  runId,
});
readFreshArtifact(requireString(args, "bootstrap-artifact"), {
  kind: "skillmint-block-5-3-bootstrap",
  projectReferenceSha256: target.projectReferenceSha256,
  runId,
});
const resultArtifact = requireString(args, "artifact");

const database = createDatabaseClient(target, {
  applicationName: "skillmint_block5_exact_catalog_verifier",
});
let verificationStage = "connect";
try {
  await database.connect();
  await database.query("begin read only");
  verificationStage = "catalog_read";
  const normalizedCatalog = await readNormalizedCatalog(database);
  await database.query("rollback");
  verificationStage = "catalog_compare";
  const expectedCatalog = buildExpectedCatalog();
  if (stableJson(normalizedCatalog) !== stableJson(expectedCatalog)) {
    throw new CatalogMismatchError(
      firstDifferencePath(normalizedCatalog, expectedCatalog),
    );
  }
  const catalogDigest = sha256(stableJson(normalizedCatalog));
  writeSecretFreeArtifact(resultArtifact, {
    version: 2,
    kind: "skillmint-block-5-3-catalog-verification",
    ok: true,
    projectReferenceSha256: target.projectReferenceSha256,
    runId,
    createdAt: new Date().toISOString(),
    catalogDigest,
    checks: {
      schemasVerified: 1,
      tablesVerified: normalizedCatalog.tables.length,
      columnsVerified: normalizedCatalog.columns.length,
      constraintsVerified: normalizedCatalog.constraints.length,
      policiesVerified: normalizedCatalog.policies.length,
      grantsVerified: normalizedCatalog.grants.length,
      indexesVerified: normalizedCatalog.indexes.length,
      functionsVerified: normalizedCatalog.functions.length,
      triggersVerified: normalizedCatalog.triggers.length,
      unexpectedUnsafeObjects: 0,
      normalizedExactComparison: true,
      mutationPerformed: false,
    },
  });
  process.stdout.write(`${JSON.stringify({
    ok: true,
    catalogDigest,
    mutationPerformed: false,
  })}\n`);
} catch (error) {
  if (error instanceof CatalogMismatchError) {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      code: "exact_catalog_verification_failed",
      mismatchPath: error.mismatchPath,
    })}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      code: "exact_catalog_verification_failed",
      verificationStage,
      failureClass: typeof error?.name === "string" ? error.name : "Error",
      sqlState: typeof error?.code === "string" ? error.code : null,
    })}\n`);
    process.exitCode = 1;
  }
} finally {
  await database.end().catch(() => {});
}

async function readNormalizedCatalog(client) {
  verificationStage = "tables";
  const tables = (await client.query(`
    select c.relname as table_name, r.rolname as owner,
      c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_roles r on r.oid = c.relowner
    where n.nspname = 'public' and c.relkind in ('r','p')
      and c.relname = any($1::text[])
    order by c.relname
  `, [ACCOUNT_TABLES])).rows.map((row) => ({
    table: row.table_name,
    owner: row.owner,
    rlsEnabled: row.rls_enabled,
    rlsForced: row.rls_forced,
  }));

  verificationStage = "columns";
  const columns = (await client.query(`
    select c.relname as table_name, a.attname as column_name, a.attnum as ordinal,
      pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
      a.attnotnull as not_null,
      pg_catalog.pg_get_expr(d.adbin, d.adrelid) as default_expression
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relname = any($1::text[])
      and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum
  `, [ACCOUNT_TABLES])).rows.map((row) => ({
    table: row.table_name,
    column: row.column_name,
    ordinal: Number(row.ordinal),
    type: row.data_type,
    notNull: row.not_null,
    default: row.default_expression ? normalizeExpression(row.default_expression) : null,
  }));

  verificationStage = "constraints";
  const constraints = (await client.query(`
    select c.relname as table_name, x.conname, x.contype,
      pg_catalog.pg_get_constraintdef(x.oid, true) as definition
    from pg_catalog.pg_constraint x
    join pg_catalog.pg_class c on c.oid = x.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any($1::text[])
    order by c.relname, x.conname
  `, [ACCOUNT_TABLES])).rows.map((row) => ({
    table: row.table_name,
    name: row.conname,
    type: row.contype,
    definition: normalizeDefinition(row.definition),
  }));

  verificationStage = "policies";
  const policies = (await client.query(`
    select tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = any($1::text[])
    order by tablename, policyname
  `, [ACCOUNT_TABLES])).rows.map((row) => ({
    table: row.tablename,
    name: row.policyname,
    mode: row.permissive,
    roles: parseNameArray(row.roles),
    command: row.cmd,
    using: row.qual ? normalizeExpression(row.qual) : null,
    withCheck: row.with_check ? normalizeExpression(row.with_check) : null,
  }));

  verificationStage = "grants";
  const grants = (await client.query(`
    select table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = any($1::text[])
      and grantee in ('PUBLIC','anon','authenticated')
    order by table_name, grantee, privilege_type
  `, [ACCOUNT_TABLES])).rows.map((row) => ({
    table: row.table_name,
    grantee: row.grantee,
    privilege: row.privilege_type,
  }));

  verificationStage = "indexes";
  const indexes = (await client.query(`
    select t.relname as table_name, i.relname as index_name,
      pg_catalog.pg_get_indexdef(i.oid) as definition
    from pg_catalog.pg_index x
    join pg_catalog.pg_class i on i.oid = x.indexrelid
    join pg_catalog.pg_class t on t.oid = x.indrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = any($1::text[])
    order by t.relname, i.relname
  `, [ACCOUNT_TABLES])).rows.map((row) => ({
    table: row.table_name,
    name: row.index_name,
    definition: normalizeDefinition(row.definition),
  }));

  const functionNames = [
    "delete_current_user_saved_reports",
    "is_active_skillmint_user",
    "prepare_account_deletion",
    "set_updated_at",
  ];
  verificationStage = "functions";
  const functions = (await client.query(`
    select p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
      pg_catalog.pg_get_function_result(p.oid) as result,
      l.lanname as language, r.rolname as owner, p.prosecdef as security_definer,
      p.provolatile as volatility, p.proconfig as configuration, p.prosrc as body,
      exists (
        select 1
        from pg_catalog.aclexplode(coalesce(
          p.proacl,
          pg_catalog.acldefault('f', p.proowner)
        )) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      ) as public_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
      has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_language l on l.oid = p.prolang
    join pg_catalog.pg_roles r on r.oid = p.proowner
    where n.nspname = 'public' and p.proname = any($1::text[])
    order by p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)
  `, [functionNames])).rows.map((row) => ({
    name: row.proname,
    arguments: normalizeDefinition(row.arguments),
    result: normalizeDefinition(row.result),
    language: row.language,
    owner: row.owner,
    securityDefiner: row.security_definer,
    volatility: row.volatility,
    configuration: row.configuration ? [...row.configuration].sort() : [],
    bodyDigest: sha256(normalizeSqlBody(row.body)),
    execute: {
      public: row.public_execute,
      anon: row.anon_execute,
      authenticated: row.authenticated_execute,
      serviceRole: row.service_execute,
    },
  }));

  verificationStage = "triggers";
  const triggers = (await client.query(`
    select c.relname as table_name, t.tgname,
      pg_catalog.pg_get_triggerdef(t.oid, true) as definition
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any($1::text[])
      and not t.tgisinternal
    order by c.relname, t.tgname
  `, [ACCOUNT_TABLES])).rows.map((row) => ({
    table: row.table_name,
    name: row.tgname,
    definition: normalizeDefinition(row.definition),
  }));

  verificationStage = "obsolete_function";
  const obsolete = await client.query(`
    select count(*)::integer as count
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'prepare_current_account_deletion'
  `);

  return {
    schemas: ["public"],
    tables,
    columns,
    constraints,
    policies,
    grants,
    indexes,
    functions,
    triggers,
    obsoleteFunctionCount: Number(obsolete.rows[0]?.count),
  };
}

function buildExpectedCatalog() {
  const tableOwners = ACCOUNT_TABLES.slice().sort().map((table) => ({
    table,
    owner: "postgres",
    rlsEnabled: true,
    rlsForced: false,
  }));
  const columnContracts = {
    profiles: [
      ["id", "uuid", true, null], ["full_name", "text", false, null],
      ["email", "text", false, null], ["career_goal", "text", false, null],
      ["target_role", "text", false, null],
      ["created_at", "timestamp with time zone", true, "now"],
      ["updated_at", "timestamp with time zone", true, "now"],
    ],
    resume_analyses: [
      ["id", "uuid", true, "gen_random_uuid"], ["user_id", "uuid", true, null],
      ["file_name", "text", true, null], ["file_type", "text", true, null],
      ["extracted_text", "text", false, null], ["parsed_profile", "jsonb", false, null],
      ["user_profile", "jsonb", false, null],
      ["created_at", "timestamp with time zone", true, "now"],
    ],
    job_matches: [
      ["id", "uuid", true, "gen_random_uuid"], ["user_id", "uuid", true, null],
      ["job_title", "text", false, null], ["company_name", "text", false, null],
      ["job_description", "text", true, null], ["match_result", "jsonb", false, null],
      ["improvement_plan", "jsonb", false, null], ["rewrite_plan", "jsonb", false, null],
      ["roadmap", "jsonb", false, null],
      ["created_at", "timestamp with time zone", true, "now"],
    ],
    career_snapshots: [
      ["id", "uuid", true, "gen_random_uuid"], ["user_id", "uuid", true, null],
      ["career_iq", "jsonb", false, null], ["recruiter_confidence", "jsonb", false, null],
      ["salary_projection", "jsonb", false, null], ["role_matches", "jsonb", false, null],
      ["created_at", "timestamp with time zone", true, "now"],
    ],
    beta_feedback: [
      ["id", "uuid", true, "gen_random_uuid"], ["user_id", "uuid", false, null],
      ["feedback_type", "text", true, null], ["sentiment", "text", true, null],
      ["message", "text", true, null], ["page_path", "text", false, null],
      ["status", "text", true, "'new'::text"],
      ["created_at", "timestamp with time zone", true, "now"],
    ],
  };
  const columns = Object.entries(columnContracts).flatMap(([table, entries]) =>
    entries.map(([column, type, notNull, defaultValue], index) => ({
      table, column, ordinal: index + 1, type, notNull,
      default: defaultValue === "now" ? normalizeExpression("now()")
        : defaultValue === "gen_random_uuid" ? normalizeExpression("gen_random_uuid()")
        : defaultValue === null ? null : normalizeExpression(defaultValue),
    }))
  ).sort((left, right) =>
    left.table.localeCompare(right.table) || left.ordinal - right.ordinal
  );

  const constraints = [
    constraint("beta_feedback", "beta_feedback_message_length_check", "c", "check (char_length(message) >= 10 and char_length(message) <= 1000)"),
    constraint("beta_feedback", "beta_feedback_pkey", "p", "primary key (id)"),
    constraint("beta_feedback", "beta_feedback_sentiment_check", "c", "check (sentiment = any (array['negative'::text, 'neutral'::text, 'positive'::text]))"),
    constraint("beta_feedback", "beta_feedback_type_check", "c", "check (feedback_type = any (array['bug'::text, 'confusion'::text, 'ui'::text, 'idea'::text, 'other'::text]))"),
    constraint("beta_feedback", "beta_feedback_user_id_fkey", "f", "foreign key (user_id) references auth.users(id) on delete cascade"),
    constraint("career_snapshots", "career_snapshots_pkey", "p", "primary key (id)"),
    constraint("career_snapshots", "career_snapshots_user_id_fkey", "f", "foreign key (user_id) references auth.users(id) on delete cascade"),
    constraint("job_matches", "job_matches_pkey", "p", "primary key (id)"),
    constraint("job_matches", "job_matches_user_id_fkey", "f", "foreign key (user_id) references auth.users(id) on delete cascade"),
    constraint("profiles", "profiles_id_fkey", "f", "foreign key (id) references auth.users(id) on delete cascade"),
    constraint("profiles", "profiles_pkey", "p", "primary key (id)"),
    constraint("resume_analyses", "resume_analyses_pkey", "p", "primary key (id)"),
    constraint("resume_analyses", "resume_analyses_user_id_fkey", "f", "foreign key (user_id) references auth.users(id) on delete cascade"),
  ].sort(byKeys("table", "name"));

  const policies = [
    policy("beta_feedback", "Users can insert their own beta feedback", "INSERT", null, "active_user_id"),
    policy("beta_feedback", "Users can select their own beta feedback", "SELECT", "active_user_id", null),
    policy("career_snapshots", "Users can select their own career snapshots", "SELECT", "active_user_id", null),
    policy("job_matches", "Users can delete their own job matches", "DELETE", "active_user_id", null),
    policy("job_matches", "Users can insert their own job matches", "INSERT", null, "active_user_id"),
    policy("job_matches", "Users can select their own job matches", "SELECT", "active_user_id", null),
    policy("job_matches", "Users can update their own job matches", "UPDATE", "active_user_id", "active_user_id"),
    policy("profiles", "Users can insert their own profile", "INSERT", null, "active_profile_id"),
    policy("profiles", "Users can select their own profile", "SELECT", "active_profile_id", null),
    policy("profiles", "Users can update their own profile", "UPDATE", "active_profile_id", "active_profile_id"),
    policy("resume_analyses", "Users can delete their own resume analyses", "DELETE", "active_user_id", null),
    policy("resume_analyses", "Users can insert their own resume analyses", "INSERT", null, "active_user_id"),
    policy("resume_analyses", "Users can select their own resume analyses", "SELECT", "active_user_id", null),
  ].sort(byKeys("table", "name"));

  const privilegeMap = {
    beta_feedback: ["INSERT", "SELECT"],
    career_snapshots: ["SELECT"],
    job_matches: ["DELETE", "INSERT", "SELECT", "UPDATE"],
    profiles: ["INSERT", "SELECT", "UPDATE"],
    resume_analyses: ["DELETE", "INSERT", "SELECT"],
  };
  const grants = Object.entries(privilegeMap).flatMap(([table, privileges]) =>
    privileges.map((privilege) => ({ table, grantee: "authenticated", privilege }))
  ).sort(byKeys("table", "grantee", "privilege"));

  const indexes = [
    index("beta_feedback", "beta_feedback_created_at_idx", false, "created_at desc"),
    index("beta_feedback", "beta_feedback_pkey", true, "id"),
    index("beta_feedback", "beta_feedback_user_id_created_at_id_idx", false, "user_id, created_at desc, id"),
    index("beta_feedback", "beta_feedback_user_id_id_idx", false, "user_id, id"),
    index("beta_feedback", "beta_feedback_user_id_idx", false, "user_id"),
    index("career_snapshots", "career_snapshots_created_at_idx", false, "created_at desc"),
    index("career_snapshots", "career_snapshots_pkey", true, "id"),
    index("career_snapshots", "career_snapshots_user_id_created_at_id_idx", false, "user_id, created_at desc, id"),
    index("career_snapshots", "career_snapshots_user_id_id_idx", false, "user_id, id"),
    index("career_snapshots", "career_snapshots_user_id_idx", false, "user_id"),
    index("job_matches", "job_matches_created_at_idx", false, "created_at desc"),
    index("job_matches", "job_matches_pkey", true, "id"),
    index("job_matches", "job_matches_user_id_created_at_id_idx", false, "user_id, created_at desc, id"),
    index("job_matches", "job_matches_user_id_id_idx", false, "user_id, id"),
    index("job_matches", "job_matches_user_id_idx", false, "user_id"),
    index("profiles", "profiles_pkey", true, "id"),
    index("resume_analyses", "resume_analyses_created_at_idx", false, "created_at desc"),
    index("resume_analyses", "resume_analyses_pkey", true, "id"),
    index("resume_analyses", "resume_analyses_user_id_created_at_id_idx", false, "user_id, created_at desc, id"),
    index("resume_analyses", "resume_analyses_user_id_id_idx", false, "user_id, id"),
    index("resume_analyses", "resume_analyses_user_id_idx", false, "user_id"),
  ].sort(byKeys("table", "name"));

  const functions = [
    expectedFunction({
      name: "delete_current_user_saved_reports",
      arguments: "",
      result: "TABLE(resume_analyses_deleted integer, job_matches_deleted integer, career_snapshots_deleted integer)",
      language: "plpgsql", securityDefiner: true, volatility: "v",
      body: `declare current_user_id uuid := auth.uid(); begin if current_user_id is null or not public.is_active_skillmint_user() then raise exception 'Authentication required' using errcode = '28000'; end if; with deleted as ( delete from public.resume_analyses where user_id = current_user_id returning 1 ) select count(*)::integer into resume_analyses_deleted from deleted; with deleted as ( delete from public.job_matches where user_id = current_user_id returning 1 ) select count(*)::integer into job_matches_deleted from deleted; with deleted as ( delete from public.career_snapshots where user_id = current_user_id returning 1 ) select count(*)::integer into career_snapshots_deleted from deleted; return next; end;`,
      authenticated: true,
    }),
    expectedFunction({
      name: "is_active_skillmint_user", arguments: "", result: "boolean",
      language: "sql", securityDefiner: true, volatility: "s",
      body: `select exists ( select 1 from auth.users where auth.users.id = (select auth.uid()) and auth.users.deleted_at is null );`,
      authenticated: true,
    }),
    expectedFunction({
      name: "prepare_account_deletion", arguments: "target_user_id uuid",
      result: "TABLE(profiles_deleted integer, resume_analyses_deleted integer, job_matches_deleted integer, career_snapshots_deleted integer, beta_feedback_deleted integer, verified_absent boolean)",
      language: "plpgsql", securityDefiner: true, volatility: "v",
      body: `begin if target_user_id is null then raise exception 'Target account is required' using errcode = '22004'; end if; with deleted as ( delete from public.resume_analyses where user_id = target_user_id returning 1 ) select count(*)::integer into resume_analyses_deleted from deleted; with deleted as ( delete from public.job_matches where user_id = target_user_id returning 1 ) select count(*)::integer into job_matches_deleted from deleted; with deleted as ( delete from public.career_snapshots where user_id = target_user_id returning 1 ) select count(*)::integer into career_snapshots_deleted from deleted; with deleted as ( delete from public.profiles where id = target_user_id returning 1 ) select count(*)::integer into profiles_deleted from deleted; with deleted as ( delete from public.beta_feedback where user_id = target_user_id returning 1 ) select count(*)::integer into beta_feedback_deleted from deleted; verified_absent := not exists ( select 1 from public.profiles where id = target_user_id union all select 1 from public.resume_analyses where user_id = target_user_id union all select 1 from public.job_matches where user_id = target_user_id union all select 1 from public.career_snapshots where user_id = target_user_id union all select 1 from public.beta_feedback where user_id = target_user_id ); if not verified_absent then raise exception 'Account data cleanup verification failed' using errcode = 'P0001'; end if; return next; end;`,
      serviceRole: true,
    }),
    expectedFunction({
      name: "set_updated_at", arguments: "", result: "trigger",
      language: "plpgsql", securityDefiner: false, volatility: "v",
      body: `begin new.updated_at = now(); return new; end;`,
    }),
  ];

  return {
    schemas: ["public"],
    tables: tableOwners,
    columns,
    constraints,
    policies,
    grants,
    indexes,
    functions,
    triggers: [{
      table: "profiles",
      name: "set_profiles_updated_at",
      definition: normalizeDefinition("create trigger set_profiles_updated_at before update on profiles for each row execute function set_updated_at()"),
    }],
    obsoleteFunctionCount: 0,
  };
}

function policy(table, name, command, usingKind, checkKind) {
  const expression = (kind) => normalizeExpression(
    kind === "active_profile_id"
      ? "public.is_active_skillmint_user() and auth.uid() = id"
      : "public.is_active_skillmint_user() and auth.uid() = user_id",
  );
  return {
    table, name, mode: "PERMISSIVE", roles: ["authenticated"], command,
    using: usingKind ? expression(usingKind) : null,
    withCheck: checkKind ? expression(checkKind) : null,
  };
}

function constraint(table, name, type, definition) {
  return { table, name, type, definition: normalizeDefinition(definition) };
}

function index(table, name, unique, columns) {
  return {
    table,
    name,
    definition: normalizeDefinition(
      `create ${unique ? "unique " : ""}index ${name} on ${table} using btree (${columns})`,
    ),
  };
}

function expectedFunction({
  name, arguments: functionArguments, result, language, securityDefiner,
  volatility, body, authenticated = false, serviceRole = true,
}) {
  return {
    name,
    arguments: normalizeDefinition(functionArguments),
    result: normalizeDefinition(result),
    language,
    owner: "postgres",
    securityDefiner,
    volatility,
    configuration: ["search_path=pg_catalog"],
    bodyDigest: sha256(normalizeSqlBody(body)),
    execute: {
      public: false,
      anon: false,
      authenticated,
      serviceRole,
    },
  };
}

function normalizeExpression(value) {
  return String(value)
    .toLowerCase()
    .replaceAll('"', "")
    .replaceAll("public.", "")
    .replace(/::(?:text|uuid|timestamptz|timestamp with time zone)/g, "")
    .replace(/[()\s]/g, "");
}

function normalizeDefinition(value) {
  return String(value)
    .toLowerCase()
    .replaceAll('"', "")
    .replaceAll("public.", "")
    .replace(/::(?:text|uuid|timestamptz|timestamp with time zone)/g, "")
    .replace(/[()\s]/g, "");
}

function normalizeSqlBody(value) {
  return String(value)
    .toLowerCase()
    .replaceAll('"', "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),;:=])\s*/g, "$1")
    .trim();
}

function parseNameArray(value) {
  if (Array.isArray(value)) return value.map(String).sort();
  const text = String(value ?? "");
  if (!/^\{[^{}]*\}$/.test(text)) return [];
  return text.slice(1, -1).split(",").filter(Boolean).sort();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function byKeys(...keys) {
  return (left, right) => {
    for (const key of keys) {
      const result = String(left[key]).localeCompare(String(right[key]));
      if (result) return result;
    }
    return 0;
  };
}

function firstDifferencePath(actual, expected, current = "catalog") {
  if (Object.is(actual, expected)) return null;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return `${current}.length`;
    for (let index = 0; index < actual.length; index += 1) {
      const difference = firstDifferencePath(
        actual[index],
        expected[index],
        `${current}[${index}]`,
      );
      if (difference) return difference;
    }
    return null;
  }
  if (
    actual && expected &&
    typeof actual === "object" && typeof expected === "object"
  ) {
    const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])].sort();
    for (const key of keys) {
      if (!Object.hasOwn(actual, key) || !Object.hasOwn(expected, key)) {
        return `${current}.${key}`;
      }
      const difference = firstDifferencePath(
        actual[key],
        expected[key],
        `${current}.${key}`,
      );
      if (difference) return difference;
    }
    return null;
  }
  return current;
}
