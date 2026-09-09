import fs from "node:fs";

const path = "scripts/resume-workspace-phase-1a-fixtures.mjs";
let text = fs.readFileSync(path, "utf8");

const oldBlock = `  assert.equal(currentPackage.dependencies.next, "16.3.3");
assert.equal(currentPackage.devDependencies["eslint-config-next"], "16.3.3");
const normalizedCurrentWithoutScripts = structuredClone(currentWithoutScripts);
normalizedCurrentWithoutScripts.dependencies.next =
  baselineWithoutScripts.dependencies.next;
normalizedCurrentWithoutScripts.devDependencies["eslint-config-next"] =
  baselineWithoutScripts.devDependencies["eslint-config-next"];
assert.deepEqual(normalizedCurrentWithoutScripts, baselineWithoutScripts);`;

const newBlock = `  assert.equal(currentPackage.dependencies.next, "16.3.3");
assert.equal(currentPackage.devDependencies["eslint-config-next"], "16.3.3");
assert.equal(currentPackage.overrides["js-yaml"], "4.3.2");
assert.equal(currentPackage.overrides.next.sharp, "0.35.4");
const normalizedCurrentWithoutScripts = structuredClone(currentWithoutScripts);
normalizedCurrentWithoutScripts.dependencies.next =
  baselineWithoutScripts.dependencies.next;
normalizedCurrentWithoutScripts.devDependencies["eslint-config-next"] =
  baselineWithoutScripts.devDependencies["eslint-config-next"];
delete normalizedCurrentWithoutScripts.overrides["js-yaml"];
normalizedCurrentWithoutScripts.overrides.next.sharp =
  baselineWithoutScripts.overrides.next.sharp;
assert.deepEqual(normalizedCurrentWithoutScripts, baselineWithoutScripts);`;

if (!text.includes(oldBlock)) {
  throw new Error("authorized package normalization block not found");
}

text = text.replace(oldBlock, newBlock);
fs.writeFileSync(path, text);
