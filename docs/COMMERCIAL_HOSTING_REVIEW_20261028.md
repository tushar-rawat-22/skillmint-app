# SkillMint commercial-hosting release gate — 28 October 2026

> **Status: REVIEW REQUIRED / no hosting change authorized.** This is a contractual/product-readiness checkpoint, not a deployment instruction or allegation of non-compliance. Current public site and controlled account admission remain unchanged.

## Verified evidence

- Canonical GitHub `main` at inspection: `ecf0f68fd2893beec3e8fceb68a1b358f4db17c7`. Verify again before acting.
- Connected Vercel team `tushar-rawat-22's projects` reports plan `hobby`, with linked project `skillmint-app` (read-only inspection on 28 Oct).
- Vercel [Terms of Service §4](https://vercel.com/legal/terms) (last updated 19 Oct 2026) restrict Hobby use to personal or non-commercial use. The [official Hobby plan documentation](https://vercel.com/docs/plans/hobby) repeats that distinction.
- SkillMint is intended to become a paid software business. That intended future activity is distinct from the current controlled-admission product. **Do not assume** a Hobby deployment is an authorized commercial production host. The current provider plan or permissible uses might change; recheck with Vercel before making a final decision.
- GitHub [issue #184](https://github.com/tushar-rawat-22/skillmint-app/issues/184) tracks the explicit compliance/hosting decision. [Issue #130](https://github.com/tushar-rawat-22/skillmint-app/issues/130) independently controls real email recovery, persona authorization and self-serve acceptance.

## Founder/engineering go-no-go sequence

1. **Confirm scope:** Identify planned product activity (demo, controlled non-commercial evaluation, invitation-only use, paid transactions), permitted terms, date and account plan without recording confidential billing data.
2. **Compare zero-cash routes:** Ask the provider for explicit terms fit, or evaluate an alternative that expressly permits commercial use within a free quota. Do not assume a platform is suitable because its marketing page says “free.”
3. **Test compatibility before migration:** Next.js App Router SSR, React/Node runtime, Supabase Auth callbacks and cookie/session security, SMTP recovery URLs, CAPTCHA, authorization isolation, Proof Brief caching/expiry, rate limits, env secrecy, logs, observability and rollbacks.
4. **Validate in isolation:** Reproducible build, exact-SHA Preview on new target, protected CI, Chromium/WebKit/Firefox critical user flows at 1440/390/320, negative cross-persona controls, error conditions and bounded resource behavior. No production database change is authorized by this review.
5. **Decide explicitly:** A founder-approved provider/plan with documented terms, cost ceiling **₹0 unless separately approved**, recovery and outage plan, named operator, and rollback authority must precede any commercial rollout. Verify the final deployed SHA independently.

## Required separate gates

- Production-suitable email sender, verified receipt/reset/expiry/replay/deletion using a consented disposable identity remains open in #130. A green mocked suite is not delivery evidence.
- Proof Brief migration V16 remains unapplied and separately unauthorized. Its application-layer checks are not a substitute for direct database-function boundary enforcement; see `docs/PRODUCTION_SCHEMA_ROLLOUT.md`. A dated migration approval, fresh backup/restorability, operator and postflight evidence are required.
- Commercial hosting and email readiness are separate from product-market fit. No claims of user adoption, payment demand or third-party skill verification are supported by this document.

**Documentation policy:** Keep the main README truthful about existing capabilities and temporary controlled admission; update public marketing, deployment, security, release and continuity documents only after an actual contractual decision or safely proven change. Do not fabricate progress by editing historical snapshots or manufacturing merge activity.
