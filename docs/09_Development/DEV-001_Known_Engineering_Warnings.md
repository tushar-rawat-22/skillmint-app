# Known Engineering Warnings

## Next.js Multiple Lockfile Warning

Next.js may infer the workspace root from `/Users/tusharrawat/package-lock.json` instead of this app's `package-lock.json`.

Safe repo-local mitigation:
- `next.config.ts` sets `turbopack.root` to the current project directory.

Do not delete the parent lockfile from this repository. If the parent `/Users/tusharrawat/package-lock.json` is accidental, remove it manually outside this project.

## npm Audit Status

`npm audit fix` was run without `--force`.

Resolved:
- `mammoth` was updated in `package-lock.json` to a patched version.

Remaining:
- `next` depends on a vulnerable `postcss` version reported by npm audit.
- npm only offers a forced breaking change path for this advisory.

Safe to ignore for now in local development:
- The remaining audit item should not be force-fixed because it would install an incompatible Next.js version.

Revisit before deployment:
- Upgrade Next.js when a compatible patched release is available.
- Re-run `npm audit` after dependency upgrades.

## Turbopack Sandbox Warning

Codex sandbox builds can fail with a Turbopack process/port permission panic. Running the same build outside the sandbox succeeds.

Safe to ignore for now:
- This appears to be a sandbox permission limitation, not an application build failure.

Revisit before deployment:
- Verify builds in the normal deployment environment.
- Keep `npm run build` in CI outside the Codex sandbox.
