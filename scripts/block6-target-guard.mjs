import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// This guard authorizes target identity only. A PASS does not validate a link,
// connection, migration history, catalog, schema, or database operation.
const APPROVED_TARGET = Object.freeze({
  name: "skillmint-block6-test",
  status: "ACTIVE_HEALTHY",
  region: "ap-northeast-1",
  refSha256: "13aa45a92e3781bac5760ed0b589350457bf25df7a6c22c99d816cd17d7608ed",
});

const PRODUCTION_IDENTITY = Object.freeze({
  name: "skillmint-beta",
  refSha256: "c84507eaec854938ead288cde83dc20ab34fd75a339df1efe16bc61c1ef9ad30",
});

const refusal = (code) => Object.assign(new Error("Target refused"), { code });

export function sha256ProjectRef(projectRef) {
  if (typeof projectRef !== "string" || projectRef.length === 0) {
    throw refusal("missing_project_ref");
  }
  return createHash("sha256").update(projectRef, "utf8").digest("hex");
}

export function extractProjects(inventory) {
  if (Array.isArray(inventory)) return inventory;

  if (
    inventory !== null &&
    typeof inventory === "object" &&
    !Array.isArray(inventory) &&
    Object.keys(inventory).length === 1 &&
    Array.isArray(inventory.projects)
  ) {
    return inventory.projects;
  }

  throw refusal("unknown_inventory_container");
}

function requireInventoryEntry(project) {
  if (project === null || typeof project !== "object" || Array.isArray(project)) {
    throw refusal("malformed_project_entry");
  }
  if (typeof project.name !== "string" || project.name.length === 0) {
    throw refusal("missing_project_name");
  }
}

export function validateTargetInventory(inventory, targetName, dependencies = {}) {
  const hashProjectRef = dependencies.hashProjectRef ?? sha256ProjectRef;
  if (targetName === PRODUCTION_IDENTITY.name) throw refusal("production_target_name");
  if (targetName !== APPROVED_TARGET.name) throw refusal("unapproved_target_name");

  const projects = extractProjects(inventory);
  for (const project of projects) requireInventoryEntry(project);

  const matches = projects.filter((project) => project.name === targetName);
  if (matches.length !== 1) {
    throw refusal(matches.length === 0 ? "target_not_found" : "duplicate_target");
  }

  const selected = matches[0];
  if (typeof selected.status !== "string" || selected.status.length === 0) {
    throw refusal("missing_target_status");
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(selected.status)) throw refusal("malformed_target_status");
  if (selected.status !== APPROVED_TARGET.status) throw refusal("unhealthy_target_status");
  if (typeof selected.region !== "string" || selected.region.length === 0) {
    throw refusal("missing_target_region");
  }
  if (selected.region !== APPROVED_TARGET.region) throw refusal("wrong_target_region");

  const refHash = hashProjectRef(selected.id);
  if (refHash === PRODUCTION_IDENTITY.refSha256) throw refusal("production_target_ref");
  if (refHash !== APPROVED_TARGET.refSha256) throw refusal("wrong_target_ref");

  return Object.freeze({
    name: selected.name,
    status: selected.status,
    region: selected.region,
    refSha256: refHash,
  });
}

export function parseGuardArguments(argv) {
  if (!Array.isArray(argv) || argv.length !== 4) throw refusal("invalid_arguments");

  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if ((flag !== "--inventory" && flag !== "--target") || values.has(flag)) {
      throw refusal("invalid_arguments");
    }
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw refusal("invalid_arguments");
    }
    values.set(flag, value);
  }

  if (!values.has("--inventory") || !values.has("--target")) {
    throw refusal("invalid_arguments");
  }
  return { inventoryPath: values.get("--inventory"), targetName: values.get("--target") };
}

export async function runGuard(argv, dependencies = {}) {
  const readInventory = dependencies.readInventory ?? readFile;
  const { inventoryPath, targetName } = parseGuardArguments(argv);
  const inventoryText = await readInventory(inventoryPath, "utf8");
  if (typeof inventoryText !== "string" || Buffer.byteLength(inventoryText, "utf8") > 1_000_000) {
    throw refusal("invalid_inventory_size");
  }

  let inventory;
  try {
    inventory = JSON.parse(inventoryText);
  } catch {
    throw refusal("invalid_inventory_json");
  }
  return validateTargetInventory(inventory, targetName, {
    hashProjectRef: dependencies.hashProjectRef,
  });
}

async function main() {
  try {
    const result = await runGuard(process.argv.slice(2));
    process.stdout.write(
      `PASS name=${result.name} status=${result.status} region=${result.region} ref_sha256=${result.refSha256}\n`,
    );
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "unexpected_error";
    process.stderr.write(`REFUSED: ${code}\n`);
    process.exitCode = 1;
  }
}

const isDirectExecution =
  typeof process.argv[1] === "string" && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) await main();
