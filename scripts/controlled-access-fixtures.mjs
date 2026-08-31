import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const requireClientBuild = process.argv.includes(
  "--require-client-build",
);
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
  return originalResolveFilename.call(
    this,
    request,
    parent,
    isMain,
    options,
  );
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

const serverOnlyStub = path.join(
  root,
  "scripts",
  "server-only-fixture-stub.cjs",
);
require.cache[serverOnlyStub] = {
  id: serverOnlyStub,
  filename: serverOnlyStub,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
};

const {
  getPublicSignupConfiguration,
} = require(path.join(root, "src/config/publicSignup.ts"));
const {
  submitAuthCredentials,
} = require(path.join(
  root,
  "src/modules/auth/services/authCredentials.ts",
));
const {
  MIN_NEW_PASSWORD_LENGTH,
  isNewPasswordAllowed,
} = require(path.join(
  root,
  "src/modules/auth/services/passwordPolicy.ts",
));

const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("public signup configuration defaults closed and accepts only true", () => {
  for (const value of [
    undefined,
    "",
    "   ",
    "false",
    "1",
    "yes",
    "true-ish",
    "enabled",
  ]) {
    const environment = value === undefined
      ? {}
      : { SKILLMINT_PUBLIC_SIGNUP_ENABLED: value };
    assert.deepEqual(
      getPublicSignupConfiguration(environment),
      { enabled: false },
    );
  }

  assert.deepEqual(
    getPublicSignupConfiguration({
      SKILLMINT_PUBLIC_SIGNUP_ENABLED: "  TrUe \n",
    }),
    { enabled: true },
  );
});

test("new-password policy requires at least twelve characters", () => {
  assert.equal(MIN_NEW_PASSWORD_LENGTH, 12);
  assert.equal(isNewPasswordAllowed("12345678901"), false);
  assert.equal(isNewPasswordAllowed("123456789012"), true);
});

test("disabled signup cannot invoke the provider signup method", async () => {
  const calls = { login: 0, signup: 0 };
  const client = createCredentialClient(calls);
  const result = await submitAuthCredentials(client, {
    mode: "signup",
    email: "person@example.test",
    password: "synthetic-password",
    publicSignupEnabled: false,
  });

  assert.deepEqual(result, { status: "signup_disabled" });
  assert.deepEqual(calls, { login: 0, signup: 0 });
});

test("weak signup password cannot invoke the provider signup method", async () => {
  const calls = { login: 0, signup: 0 };
  const result = await submitAuthCredentials(
    createCredentialClient(calls),
    {
      mode: "signup",
      email: "person@example.test",
      password: "short1",
      publicSignupEnabled: true,
      emailRedirectTo: null,
    },
  );

  assert.deepEqual(result, { status: "failure" });
  assert.deepEqual(calls, { login: 0, signup: 0 });
});

test("login remains available independently of public signup and new-password policy", async () => {
  const calls = { login: 0, signup: 0 };
  const result = await submitAuthCredentials(
    createCredentialClient(calls),
    {
      mode: "login",
      email: "  existing@example.test ",
      password: "short1",
    },
  );

  assert.deepEqual(result, {
    status: "success",
    sessionCreated: true,
  });
  assert.deepEqual(calls, { login: 1, signup: 0 });
});

test("enabled signup preserves provider submission and session routing signal", async () => {
  const calls = { login: 0, signup: 0 };
  const result = await submitAuthCredentials(
    createCredentialClient(calls),
    {
      mode: "signup",
      email: "  person@example.test ",
      password: "synthetic-password",
      publicSignupEnabled: true,
    },
  );

  assert.deepEqual(result, {
    status: "success",
    sessionCreated: true,
  });
  assert.deepEqual(calls, { login: 0, signup: 1 });
});

test("provider failures return only the finite sanitized result", async () => {
  const client = {
    auth: {
      async signInWithPassword() {
        throw new Error("RAW_PRIVATE_PROVIDER_DETAIL");
      },
      async signUp() {
        return {
          data: { session: null },
          error: { message: "RAW_PRIVATE_PROVIDER_DETAIL" },
        };
      },
    },
  };

  assert.deepEqual(
    await submitAuthCredentials(client, {
      mode: "login",
      email: "existing@example.test",
      password: "synthetic-password",
    }),
    { status: "failure" },
  );
  assert.deepEqual(
    await submitAuthCredentials(client, {
      mode: "signup",
      email: "person@example.test",
      password: "synthetic-password",
      publicSignupEnabled: true,
    }),
    { status: "failure" },
  );
});

test("server-only registration configuration is not imported by client modules", () => {
  const configSource = source("src/config/publicSignup.ts");
  assert.match(configSource, /^import "server-only";/);
  assert.doesNotMatch(
    configSource,
    /NEXT_PUBLIC_SKILLMINT_PUBLIC_SIGNUP_ENABLED/,
  );

  const sourceFiles = collectFiles(path.join(root, "src"))
    .filter((filePath) => /\.(?:ts|tsx)$/u.test(filePath));
  const envReferences = sourceFiles.filter((filePath) =>
    fs.readFileSync(filePath, "utf8").includes(
      "SKILLMINT_PUBLIC_SIGNUP_ENABLED",
    )
  );
  assert.deepEqual(
    envReferences.map((filePath) => path.relative(root, filePath)),
    ["src/config/publicSignup.ts"],
  );

  const clientImporters = sourceFiles.filter((filePath) => {
    const contents = fs.readFileSync(filePath, "utf8");
    return (
      /^\s*["']use client["'];/m.test(contents) &&
      contents.includes("config/publicSignup")
    );
  });
  assert.deepEqual(clientImporters, []);
});

test("built client assets do not contain the server-only setting name", () => {
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
      Buffer.from("SKILLMINT_PUBLIC_SIGNUP_ENABLED"),
    )
  );
  assert.deepEqual(
    leakingAssets.map((filePath) => path.relative(root, filePath)),
    [],
  );
});

test("signup rendering requires an explicit boolean and fails closed twice", () => {
  const authForm = source(
    "src/modules/auth/components/AuthForm.tsx",
  );
  assert.match(
    authForm,
    /mode: "signup";\s+publicSignupEnabled: boolean;/,
  );
  assert.doesNotMatch(authForm, /publicSignupEnabled\?:/);
  assert.ok(
    (authForm.match(/publicSignupEnabled !== true/g) ?? []).length >= 2,
    "AuthForm must guard both submission and accidental rendering",
  );
  assert.doesNotMatch(authForm, /auth\.signUp/);
});

test("signup and recovery use the shared new-password policy", () => {
  const authForm = source("src/modules/auth/components/AuthForm.tsx");
  const recoveryPage = source("src/app/reset-password/page.tsx");
  const recoveryHook = source(
    "src/modules/auth/hooks/usePasswordRecovery.ts",
  );

  assert.match(authForm, /isNewPasswordAllowed\(password\)/);
  assert.match(recoveryPage, /isNewPasswordAllowed\(newPassword\)/);
  assert.match(recoveryHook, /isNewPasswordAllowed\(newPassword\)/);
  assert.doesNotMatch(authForm, /password\.length < 6/);
  assert.doesNotMatch(recoveryPage, /MIN_PASSWORD_LENGTH = 6/);
});

function createCredentialClient(calls) {
  return {
    auth: {
      async signInWithPassword(input) {
        calls.login += 1;
        assert.equal(input.email, "existing@example.test");
        return { error: null };
      },
      async signUp(input) {
        calls.signup += 1;
        assert.equal(input.email, "person@example.test");
        return {
          data: { session: { synthetic: true } },
          error: null,
        };
      },
    },
  };
}

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

console.log(
  `Controlled-access fixtures: ${passed}/${tests.length} passed.`,
);
