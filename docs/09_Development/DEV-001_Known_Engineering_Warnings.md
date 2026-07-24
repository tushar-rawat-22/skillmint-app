# Known Engineering Warnings

## Next.js Multiple Lockfile Warning

Next.js may infer the workspace root from a `package-lock.json` in a parent directory instead of this app's lockfile.

Safe repo-local mitigation:
- `next.config.ts` sets `turbopack.root` to the current project directory.

Do not remove a parent-directory lockfile from this repository. If that lockfile is accidental, remove it manually from its own directory.

## PostCSS security maintenance — July 24, 2026

The repository override pinned Next.js's PostCSS child to 8.5.10. CVE-2026-45623 / GHSA-6g55-p6wh-862q affects PostCSS through 8.5.11, so the override now uses the minimum patched release, 8.5.12. The dependency audit classified exposure as build-time only: repository code does not process user-controlled CSS at runtime, accept CSS uploads, enable `unsafeMap`, or return PostCSS errors to browser clients.

A clean `npm ci` was required because the prior incremental local dependency tree retained a stale physical PostCSS 8.5.10 package after lockfile regeneration. The clean tree resolves Next.js to PostCSS 8.5.12 and Tailwind to PostCSS 8.5.16, with no physical PostCSS package at or below 8.5.11. The six added Tailwind WASM lockfile records complete an existing optional bundled dependency subtree and do not upgrade Tailwind.

The harmless synthetic probe confirmed that PostCSS did not read a non-map path referenced by an absolute `sourceMappingURL`. It inspected a malformed `.map` sentinel without exposing its marker or a JSON parsing error. The post-change audit reported zero vulnerabilities, down from two high-severity entries, and no longer reported the PostCSS advisory.

All 17 deterministic fixture scripts, lint, the default Turbopack build, and the Webpack build passed. Playwright passed 70 Chromium, 70 Firefox, and 70 WebKit executions, for 210/210 with one worker and zero retries. No unexpected external browser request occurred.

The npm registry was contacted for dependency installation and audit. Production, Vercel, and hosted Supabase were not contacted. This maintenance result is not evidence of historical exploitation or secret exposure, and it makes no such claim.

## Turbopack Sandbox Warning

Codex sandbox builds can fail with a Turbopack process/port permission panic. Running the same build outside the sandbox succeeds.

Safe to ignore for now:
- This appears to be a sandbox permission limitation, not an application build failure.

Revisit before deployment:
- Verify builds in the normal deployment environment.
- Keep `npm run build` in CI outside the Codex sandbox.
