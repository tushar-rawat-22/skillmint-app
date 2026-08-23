import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireClientBuild = process.argv.includes("--require-client-build");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFixtureModule(
  request,
  parent,
  isMain,
  options,
) {
  if (request === "server-only") {
    return path.join(root, "scripts", "server-only-fixture-stub.cjs");
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const serverOnlyStub = path.join(root, "scripts", "server-only-fixture-stub.cjs");
require.cache[serverOnlyStub] = {
  id: serverOnlyStub,
  filename: serverOnlyStub,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
};

const { getPublicDemoConfiguration } = require(
  path.join(root, "src/config/publicDemo.ts"),
);
const { getPublicSignupConfiguration } = require(
  path.join(root, "src/config/publicSignup.ts"),
);
const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("public demo configuration fails closed and accepts only exact case-insensitive true", () => {
  for (const value of [
    undefined,
    "",
    "   ",
    "false",
    "1",
    "yes",
    "true-ish",
    "enabled",
    " true",
    "true ",
    "  TrUe \n",
    "\ttrue",
    "true\t",
    "\ntrue\n",
  ]) {
    const environment = value === undefined
      ? {}
      : { SKILLMINT_PUBLIC_DEMO_ENABLED: value };
    assert.deepEqual(getPublicDemoConfiguration(environment), {
      enabled: false,
    });
  }

  for (const value of ["true", "TRUE", "TrUe"]) {
    assert.deepEqual(
      getPublicDemoConfiguration({
        SKILLMINT_PUBLIC_DEMO_ENABLED: value,
      }),
      { enabled: true },
    );
  }
  assert.match(
    source(".env.example"),
    /^SKILLMINT_PUBLIC_DEMO_ENABLED=false$/mu,
  );
});

test("existing public signup configuration remains fail closed", () => {
  assert.deepEqual(getPublicSignupConfiguration({}), { enabled: false });
  assert.deepEqual(
    getPublicSignupConfiguration({ SKILLMINT_PUBLIC_SIGNUP_ENABLED: "false" }),
    { enabled: false },
  );
  assert.deepEqual(
    getPublicSignupConfiguration({ SKILLMINT_PUBLIC_SIGNUP_ENABLED: "TRUE" }),
    { enabled: true },
  );
});

test("disabled demo uses the App Router not-found boundary", () => {
  const demoPage = source("src/app/demo/page.tsx");
  const recruiterDemoPage = source("src/app/recruiters/demo/page.tsx");
  assert.match(demoPage, /getPublicDemoConfiguration\(\)/u);
  assert.match(demoPage, /if \(!enabled\) \{\s*notFound\(\);/u);
  assert.match(recruiterDemoPage, /getPublicDemoConfiguration\(\)/u);
  assert.match(recruiterDemoPage, /if \(!enabled\) \{\s*notFound\(\);/u);
  assert.match(source("src/constants/routes.ts"), /DEMO: "\/demo"/u);
  assert.match(source("src/constants/routes.ts"), /RECRUITER_DEMO: "\/recruiters\/demo"/u);
});

test("demo is structurally isolated from Supabase, storage, analytics, parsing, and network calls", () => {
  const demoSources = [
    "src/app/demo/page.tsx",
    "src/modules/publicDemo/SyntheticDemoReport.tsx",
    "src/modules/publicDemo/syntheticDemo.ts",
    "src/app/recruiters/demo/page.tsx",
    "src/modules/recruiterDemo/SyntheticRecruiterDemo.tsx",
    "src/modules/recruiterDemo/recruiterDemoFixture.ts",
  ].map(source).join("\n");

  assert.doesNotMatch(
    demoSources,
    /supabase|localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest|sendBeacon|analytics|analyzeResume|parseResume|DropZone/iu,
  );
  assert.match(demoSources, /All candidate, resume, evidence, and job-description information[\s\S]*synthetic demo data/u);
  assert.match(demoSources, /How this analysis was calculated/u);
  assert.match(demoSources, /Proof Brief/u);
  assert.match(demoSources, /compareResumeEvidence/u);
  assert.match(demoSources, /validateResumeComparisonEvidence/u);
  assert.match(demoSources, /What changed after stronger evidence was added\?/u);
  assert.match(demoSources, /What evidence supports this candidate for this role\?/u);
  assert.match(demoSources, /Every role, candidate, evidence item, question, and feedback item[\s\S]*synthetic demo data/u);
  assert.match(demoSources, /Strong support/u);
  assert.match(demoSources, /Weak support/u);
  assert.match(demoSources, /Unclear \/ missing support/u);
  assert.doesNotMatch(demoSources, /recruiter confidence|hire probability|shortlist probability/iu);
});

test("every synthetic demo navigation link disables automatic prefetch", () => {
  for (const [relativePath, expectedCount] of [
    ["src/modules/publicDemo/SyntheticDemoReport.tsx", 3],
    ["src/modules/recruiterDemo/SyntheticRecruiterDemo.tsx", 4],
  ]) {
    const linkTags = source(relativePath).match(/<Link\b[\s\S]*?>/gu) ?? [];
    assert.equal(linkTags.length, expectedCount);
    for (const linkTag of linkTags) {
      assert.match(linkTag, /\bprefetch=\{false\}/u);
    }
  }
});

test("proxy matcher excludes demo before the Supabase refresh path", () => {
  const proxySource = source("proxy.ts");
  assert.match(proxySource, /\(\?:demo\|recruiters\/demo\)\(\?:\/\|\$\)/u);
  assert.equal(
    (proxySource.match(/updateSupabaseSession\(request\)/gu) ?? []).length,
    1,
  );
  assert.doesNotMatch(
    source("src/app/demo/page.tsx"),
    /updateSupabaseSession/u,
  );
  assert.doesNotMatch(
    source("src/app/recruiters/demo/page.tsx"),
    /updateSupabaseSession/u,
  );
});

test("homepage exposes both public product paths without enabling signup", () => {
  const homepageSources = [
    "src/app/page.tsx",
    "src/components/landing/Hero.tsx",
    "src/components/landing/AudiencePaths.tsx",
  ].map(source).join("\n");
  assert.match(homepageSources, /I&apos;m a Candidate/u);
  assert.match(homepageSources, /I&apos;m Hiring/u);
  assert.match(homepageSources, /What does my resume support\?/u);
  assert.match(homepageSources, /What evidence supports this candidate\?/u);
  assert.doesNotMatch(
    homepageSources,
    /Recruiter Confidence|shortlist probability|hire probability|interview probability/u,
  );
});

test("server-only demo configuration has no client importer or public-prefixed alias", () => {
  const configSource = source("src/config/publicDemo.ts");
  assert.match(configSource, /^import "server-only";/u);
  assert.doesNotMatch(configSource, /NEXT_PUBLIC_/u);

  const sourceFiles = collectFiles(path.join(root, "src"))
    .filter((filePath) => /\.(?:ts|tsx)$/u.test(filePath));
  const envReferences = sourceFiles.filter((filePath) =>
    fs.readFileSync(filePath, "utf8").includes("SKILLMINT_PUBLIC_DEMO_ENABLED")
  );
  assert.deepEqual(
    envReferences.map((filePath) => path.relative(root, filePath)),
    ["src/config/publicDemo.ts"],
  );
  assert.deepEqual(
    sourceFiles.filter((filePath) => {
      const contents = fs.readFileSync(filePath, "utf8");
      return /^\s*["']use client["'];/mu.test(contents) &&
        contents.includes("config/publicDemo");
    }),
    [],
  );
});

test("real resume page and extraction endpoint both require server verification", () => {
  const uploadPage = source("src/app/upload/page.tsx");
  const uploadWorkspace = source(
    "src/components/upload/AuthenticatedUploadWorkspace.tsx",
  );
  const extractionRoute = source("src/app/api/resume/extract/route.ts");

  assert.match(uploadPage, /await getServerAuthorization\(\)/u);
  assert.match(uploadPage, /authorization\.status === "authenticated"/u);
  assert.match(uploadPage, /Log in to analyze a real resume/u);
  assert.doesNotMatch(uploadPage, /<DropZone/u);
  assert.match(uploadWorkspace, /authorizedUserId/u);
  assert.match(uploadWorkspace, /session\.access_token/u);
  assert.match(uploadWorkspace, /await runResumeAnalysis\(file, accessToken\)/u);
  assert.match(extractionRoute, /verifyBearerAuthorization/u);
  assert.ok(
    extractionRoute.indexOf("await verifyRequest(") <
      extractionRoute.indexOf("readBoundedBody(request)"),
  );
});

test("private pilot metadata requests no indexing and no following", () => {
  const layoutSource = source("src/app/layout.tsx");
  assert.match(layoutSource, /robots:\s*\{[\s\S]*index: false,[\s\S]*follow: false/u);
});

test("public and pilot presentation sources do not render the removed metric", () => {
  const presentationSources = [
    "src/components/landing/DashboardPreview.tsx",
    "src/modules/publicDemo/SyntheticDemoReport.tsx",
    "src/app/dashboard/page.tsx",
    "src/components/dashboard/MetricStrip.tsx",
    "src/components/dashboard/RealityCheckCard.tsx",
    "src/components/dashboard/ShareableCareerCard.tsx",
    "src/app/resume/page.tsx",
  ].map(source).join("\n");

  assert.doesNotMatch(
    presentationSources,
    /Recruiter Confidence|recruiter confidence|inferred shortlist signal|shortlisting signal/u,
  );
});

test("pilot charter records scope, limits, and validation exit criteria", () => {
  const charter = source("docs/PILOT_CHARTER.md");
  for (const phrase of [
    "students and fresh graduates",
    "Public signup remains closed",
    "does not visit or independently verify repositories",
    "Candidates remain responsible",
    "noindex, nofollow",
    "GitHub OAuth",
    "Proof Brief editing",
    "activate analytics",
    "payments",
    "permanent sharing links",
    "Exit criteria for the validation phase",
  ]) {
    assert.match(charter, new RegExp(escapeRegExp(phrase), "u"));
  }
});

test("built client assets do not contain the server-only demo setting name", () => {
  const clientOutput = path.join(root, ".next", "static");
  if (!fs.existsSync(clientOutput)) {
    assert.equal(
      requireClientBuild,
      false,
      "a completed .next/static build is required for the client-bundle check",
    );
    return;
  }

  const leakingAssets = collectFiles(clientOutput).filter((filePath) =>
    fs.readFileSync(filePath).includes(
      Buffer.from("SKILLMINT_PUBLIC_DEMO_ENABLED"),
    )
  );
  assert.deepEqual(
    leakingAssets.map((filePath) => path.relative(root, filePath)),
    [],
  );
});

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  }).sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

let passed = 0;
for (const { name, callback } of tests) {
  try {
    await callback();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`Public evidence demo fixtures: ${passed}/${tests.length} passed.`);
