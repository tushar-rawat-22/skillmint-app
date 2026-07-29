import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const paths = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ],
  { cwd: root },
)
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .sort();

const failures = [];
const MAX_IN_MEMORY_SCAN_BYTES = 1024 * 1024;
const BINARY_SAMPLE_BYTES = 8192;
const approvedLargeBinaryPaths = new Set([]);
const approvedAssignmentSentinels = new Set([
  "RAW_BODY_PROVIDER_DECODER_STREAM_SECRET",
  "SECRET_THROWN_PROXY_PAYLOAD",
  "synthetic-secret-value-for-artifact-test",
]);
const approvedConnectionSentinels = new Set([
  [
    "postgresql",
    "://",
    "synthetic",
    ":synthetic@",
    "pooler.example",
  ].join(""),
  [
    "postgresql",
    "://postgres.",
    "${expectedRef}",
    ":synthetic@",
    "pooler.example",
  ].join(""),
]);
const allowedEnvironmentExamples = new Set([
  ".env.example",
]);
const pathRules = [
  {
    id: "environment-file",
    matches: (path) =>
      /(^|\/)\.env(?:\.|$)/iu.test(path) &&
      !allowedEnvironmentExamples.has(path),
  },
  {
    id: "supabase-local-state",
    matches: (path) =>
      /(^|\/)\.supabase(\/|$)|^supabase\/\.(?:temp|branches)(\/|$)/iu
        .test(path),
  },
  {
    id: "credential-material-path",
    matches: (path) =>
      /^(?:credentials?|secrets?|tokens?|passwords?|connection[-_.]?strings?)(?:\.[^/]*)?$/iu
        .test(basename(path)),
  },
  {
    id: "private-key-path",
    matches: (path) =>
      /\.(?:pem|p12|pfx|jks|keystore)$/iu.test(path) ||
      /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/iu.test(path),
  },
];

const contentRules = [
  {
    id: "private-key-content",
    pattern:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gu,
  },
  {
    id: "aws-access-key",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/gu,
  },
  {
    id: "live-or-secret-api-key",
    pattern:
      /\b(?:sk_live_|rk_live_|sb_secret_|gh[pousr]_|github_pat_|sk-proj-)[A-Za-z0-9_-]{16,}(?![A-Za-z0-9_-])/gu,
  },
  {
    id: "credentialed-connection-string",
    pattern:
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/giu,
  },
  {
    id: "credential-shaped-assignment",
    pattern:
      /\b([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*["']([A-Za-z0-9+/_=.-]{24,})["']/gu,
    keyGroup: 1,
    valueGroup: 2,
    keyMatches: (key) =>
      /(?:^|_)(?:password|secret(?:_key)?|token|api_key|access_token|refresh_token)$/iu.test(key) ||
      /(?:Password|Secret(?:Key)?|Token|ApiKey|AccessToken|RefreshToken)$/u.test(key),
  },
];

runScannerSelfTests();

for (const path of paths) {
  for (const rule of pathRules) {
    if (rule.matches(path)) {
      failures.push({ path, rule: rule.id });
    }
  }

  const absolutePath = resolve(root, path);
  let stats;
  try {
    stats = statSync(absolutePath);
  } catch {
    continue;
  }
  if (!stats.isFile()) {
    continue;
  }
  if (stats.size > MAX_IN_MEMORY_SCAN_BYTES) {
    let obviouslyBinary;
    try {
      obviouslyBinary = isObviouslyBinaryFile(absolutePath);
    } catch {
      failures.push({ path, rule: "unscanned-large-file" });
      continue;
    }
    if (
      obviouslyBinary &&
      approvedLargeBinaryPaths.has(path)
    ) {
      continue;
    }
    failures.push({ path, rule: "unscanned-large-file" });
    continue;
  }

  let buffer;
  try {
    buffer = readFileSync(absolutePath);
  } catch {
    failures.push({ path, rule: "unreadable-file" });
    continue;
  }
  failures.push(...findBufferFailures(path, buffer));
}

const uniqueFailures = [
  ...new Map(
    failures.map((failure) => [
      `${failure.path}\0${failure.rule}`,
      failure,
    ]),
  ).values(),
];

if (uniqueFailures.length > 0) {
  console.error(
    `Secret/path regression check failed with ${uniqueFailures.length} safe finding(s):`,
  );
  for (const failure of uniqueFailures) {
    console.error(`FAIL ${failure.rule} ${failure.path}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Secret/path regression check passed for ${paths.length} repository path(s).`,
  );
}

function findContentFailures(path, text) {
  const findings = [];

  for (const rule of contentRules) {
    rule.pattern.lastIndex = 0;
    for (const match of text.matchAll(rule.pattern)) {
      const exactKey = rule.keyGroup === undefined
        ? null
        : match[rule.keyGroup];
      if (
        rule.keyMatches &&
        (!exactKey || !rule.keyMatches(exactKey))
      ) {
        continue;
      }
      const exactValue = rule.valueGroup === undefined
        ? match[0]
        : match[rule.valueGroup];
      if (isApprovedSentinel(rule.id, exactValue)) {
        continue;
      }
      findings.push({ path, rule: rule.id });
      break;
    }
  }

  return findings;
}

function isApprovedSentinel(ruleId, exactValue) {
  return (
    (
      ruleId === "credential-shaped-assignment" &&
      approvedAssignmentSentinels.has(exactValue)
    ) ||
    (
      ruleId === "credentialed-connection-string" &&
      approvedConnectionSentinels.has(exactValue)
    )
  );
}

function runScannerSelfTests() {
  const classicToken = ["gh", "p_", "A".repeat(36)].join("");
  const oauthToken = ["gh", "o_", "B".repeat(36)].join("");
  const classicBypassAttempt = [
    `const token = "${classicToken}"; // example`,
    "const note = \"RAW_UNRELATED_FIXTURE_VALUE\";",
  ].join("\n");
  const classicFindings = findContentFailures(
    "scanner-self-test.txt",
    classicBypassAttempt,
  );
  const oauthFindings = findContentFailures(
    "scanner-oauth-self-test.txt",
    `const token = "${oauthToken}";`,
  );
  const prefixedSecretValue = "C".repeat(40);
  const prefixedTokenValue = "D".repeat(40);
  const prefixedSecretFindings = findContentFailures(
    "scanner-prefixed-secret-self-test.txt",
    `SUPABASE_SECRET_KEY = "${prefixedSecretValue}";`,
  );
  const prefixedTokenFindings = findContentFailures(
    "scanner-prefixed-token-self-test.txt",
    `GH_TOKEN = "${prefixedTokenValue}";`,
  );
  const nulFindings = findBufferFailures(
    "scanner-nul-self-test.bin",
    Buffer.concat([
      Buffer.from(classicToken),
      Buffer.from([0]),
      Buffer.from("tail"),
    ]),
  );
  assert.deepEqual(
    classicFindings.map(({ rule }) => rule),
    [
      "live-or-secret-api-key",
      "credential-shaped-assignment",
    ],
  );
  assert.deepEqual(
    oauthFindings.map(({ rule }) => rule),
    [
      "live-or-secret-api-key",
      "credential-shaped-assignment",
    ],
  );
  assert.deepEqual(
    prefixedSecretFindings.map(({ rule }) => rule),
    ["credential-shaped-assignment"],
  );
  assert.deepEqual(
    prefixedTokenFindings.map(({ rule }) => rule),
    ["credential-shaped-assignment"],
  );
  assert.deepEqual(
    nulFindings.map(({ rule }) => rule),
    ["live-or-secret-api-key"],
  );

  for (const approvedSentinel of approvedAssignmentSentinels) {
    assert.deepEqual(
      findContentFailures(
        "approved-assignment-sentinel-self-test.txt",
        `const secret = "${approvedSentinel}";`,
      ),
      [],
    );
  }
  for (const approvedSentinel of approvedConnectionSentinels) {
    assert.deepEqual(
      findContentFailures(
        "approved-connection-sentinel-self-test.txt",
        `const url = "${approvedSentinel}/database";`,
      ),
      [],
    );
  }

  const rendered = [
    ...classicFindings,
    ...oauthFindings,
    ...prefixedSecretFindings,
    ...prefixedTokenFindings,
    ...nulFindings,
  ]
    .map(({ path, rule }) => `FAIL ${rule} ${path}`)
    .join("\n");
  assert.equal(rendered.includes(classicToken), false);
  assert.equal(rendered.includes(oauthToken), false);
  assert.equal(rendered.includes(prefixedSecretValue), false);
  assert.equal(rendered.includes(prefixedTokenValue), false);

  const largeClassic = Buffer.concat([
    Buffer.alloc(MAX_IN_MEMORY_SCAN_BYTES + 128, 0x61),
    Buffer.from(classicToken),
  ]);
  const largeOauth = Buffer.concat([
    Buffer.alloc(MAX_IN_MEMORY_SCAN_BYTES + 128, 0x62),
    Buffer.from(oauthToken),
  ]);
  const largeFindings = [
    ...findBufferFailures(
      "large-classic-self-test.txt",
      largeClassic,
    ),
    ...findBufferFailures(
      "large-oauth-self-test.txt",
      largeOauth,
    ),
  ];
  assert.deepEqual(
    largeFindings.map(({ rule }) => rule),
    ["unscanned-large-file", "unscanned-large-file"],
  );
  const largeRendered = largeFindings
    .map(({ path, rule }) => `FAIL ${rule} ${path}`)
    .join("\n");
  assert.equal(largeRendered.includes(classicToken), false);
  assert.equal(largeRendered.includes(oauthToken), false);
}

function findBufferFailures(path, buffer) {
  if (buffer.length > MAX_IN_MEMORY_SCAN_BYTES) {
    return [{ path, rule: "unscanned-large-file" }];
  }
  return findContentFailures(path, buffer.toString("latin1"));
}

function isObviouslyBinaryFile(path) {
  const descriptor = openSync(path, "r");
  try {
    const sample = Buffer.alloc(BINARY_SAMPLE_BYTES);
    const bytesRead = readSync(
      descriptor,
      sample,
      0,
      sample.length,
      0,
    );
    const content = sample.subarray(0, bytesRead);
    if (content.includes(0)) {
      return true;
    }
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(content);
      return false;
    } catch {
      return true;
    }
  } finally {
    closeSync(descriptor);
  }
}
