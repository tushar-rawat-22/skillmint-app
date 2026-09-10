import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL(
    "../src/modules/onboarding/components/TargetRoleSetupForm.tsx",
    import.meta.url,
  ),
  "utf8",
);

const localHydration = source.match(
  /useEffect\(\(\) => \{\s+const timeoutId = window\.setTimeout\(\(\) => \{([\s\S]*?)\}, 0\);\s+\s*return \(\) => window\.clearTimeout\(timeoutId\);\s+\}, \[currentUserId\]\);/,
)?.[1];

assert.ok(localHydration, "expected browser-local target-role hydration effect");
assert.match(
  localHydration,
  /if \(!setup \|\| hasUserEditedRef\.current\) \{\s+return;\s+\}/,
  "browser-local hydration must not overwrite newer candidate edits",
);
assert.ok(
  localHydration.indexOf("hasUserEditedRef.current") <
    localHydration.indexOf("setForm(toFormState(setup))"),
  "edit guard must run before browser-local hydration mutates the form",
);

const accountRestoreGuardCount = source.match(
  /!targetRole \|\| hasUserEditedRef\.current/g,
)?.length ?? 0;
assert.equal(
  accountRestoreGuardCount,
  1,
  "account restore must keep its newer-user-intent guard",
);

console.log("target-role hydration race fixtures: PASS");
