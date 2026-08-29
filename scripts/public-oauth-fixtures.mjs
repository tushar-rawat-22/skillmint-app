import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
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

const {
  getPublicOAuthConfiguration,
  isPublicOAuthProviderEnabled,
} = require(path.join(root, "src/config/publicOAuth.ts"));

const disabledValues = [
  undefined,
  "",
  "   ",
  "false",
  "1",
  "yes",
  "enabled",
  "true-ish",
];

for (const value of disabledValues) {
  const environment = value === undefined
    ? {}
    : { SKILLMINT_PUBLIC_OAUTH_ENABLED: value };
  assert.deepEqual(getPublicOAuthConfiguration(environment), {
    enabled: false,
    providers: { google: false, github: false },
  });
}

assert.deepEqual(
  getPublicOAuthConfiguration({
    SKILLMINT_PUBLIC_OAUTH_ENABLED: "  TrUe \n",
  }),
  {
    enabled: true,
    providers: { google: false, github: false },
  },
);

assert.deepEqual(
  getPublicOAuthConfiguration({
    SKILLMINT_PUBLIC_OAUTH_ENABLED: "true",
    SKILLMINT_PUBLIC_OAUTH_GOOGLE_ENABLED: "true",
  }),
  {
    enabled: true,
    providers: { google: true, github: false },
  },
);

assert.deepEqual(
  getPublicOAuthConfiguration({
    SKILLMINT_PUBLIC_OAUTH_ENABLED: "true",
    SKILLMINT_PUBLIC_OAUTH_GITHUB_ENABLED: " TRUE ",
  }),
  {
    enabled: true,
    providers: { google: false, github: true },
  },
);

assert.deepEqual(
  getPublicOAuthConfiguration({
    SKILLMINT_PUBLIC_OAUTH_ENABLED: "false",
    SKILLMINT_PUBLIC_OAUTH_GOOGLE_ENABLED: "true",
    SKILLMINT_PUBLIC_OAUTH_GITHUB_ENABLED: "true",
  }),
  {
    enabled: false,
    providers: { google: false, github: false },
  },
);

assert.equal(
  isPublicOAuthProviderEnabled("google", {
    SKILLMINT_PUBLIC_OAUTH_ENABLED: "true",
    SKILLMINT_PUBLIC_OAUTH_GOOGLE_ENABLED: "true",
  }),
  true,
);
assert.equal(
  isPublicOAuthProviderEnabled("github", {
    SKILLMINT_PUBLIC_OAUTH_ENABLED: "true",
    SKILLMINT_PUBLIC_OAUTH_GITHUB_ENABLED: "false",
  }),
  false,
);

const configPath = path.join(root, "src/config/publicOAuth.ts");
const configSource = fs.readFileSync(configPath, "utf8");
assert.match(configSource, /^import "server-only";/);
assert.doesNotMatch(configSource, /NEXT_PUBLIC_/);

const sourceFiles = collectFiles(path.join(root, "src"))
  .filter((filePath) => /\.(?:ts|tsx)$/u.test(filePath));
const clientImporters = sourceFiles.filter((filePath) => {
  const contents = fs.readFileSync(filePath, "utf8");
  return (
    /^\s*["']use client["'];/m.test(contents) &&
    contents.includes("config/publicOAuth")
  );
});
assert.deepEqual(clientImporters, []);

console.log("Public OAuth configuration fixtures: PASS.");

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? collectFiles(entryPath)
        : [entryPath];
    })
    .sort();
}
