import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { parseArgs, refuse } from "./block-5-3-live-common.mjs";

const args = parseArgs(process.argv.slice(2));
if (args.diagnostic !== true) refuse("diagnostic_mode_required");
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = function compileTypeScript(module, filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText, filename);
};
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { getPrivacyContact } = require(path.join(repoRoot, "src/config/privacyContact.ts"));
const contact = getPrivacyContact();
const requiredFiles = [
  "supabase/schema_v4_account_deletion_security.sql",
  "scripts/block-5-3-live-preflight.mjs",
  "scripts/block-5-3-live-migration-verify.mjs",
  "scripts/block-5-3-live-security.mjs",
  "docs/BLOCK_5_3_IMPLEMENTATION.md",
];
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(repoRoot, file)));
const blockers = [
  ...(contact.releaseReady ? [] : [`privacy_contact_${contact.status}`]),
  ...(missingFiles.length ? ["required_files_missing"] : []),
  "production_schema_rollout_pending",
  "external_privacy_contact_ownership_unverified",
  "legal_review_unresolved",
  "provider_backup_log_retention_unverified",
  "operational_ownership_unresolved",
];
const output = {
  ok: false,
  diagnostic: true,
  releaseReady: false,
  blockers,
  privacyContactStatus: contact.status,
  missingFileCount: missingFiles.length,
};
process.stdout.write(`${JSON.stringify(output)}\n`);
process.exit(1);
