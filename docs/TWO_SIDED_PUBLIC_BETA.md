# Two-sided public beta authority

**Founder decision:** August 23, 2026

This document replaces the earlier investor-only deployment sequence and the
older assumption that public beta was not authorized. The accepted engineering
foundation remains intact: evidence-first reporting, deterministic scoring,
candidate ownership, deletion and export boundaries, and synthetic-demo network
isolation do not change.

The next product is a public beta for candidates and recruiters. Public beta is
an experiment, not proof that the product is validated or ready to automate an
employment decision.

## Product thesis

Candidates should be able to move from resume evidence to a clear gap, a useful
next action, new evidence, and a later re-analysis. Recruiters should be able to
turn a role description into evidence requirements, review a
candidate-authorized Proof Brief, and ask better evidence questions. The shared
primitive is evidence; neither side receives a hiring prediction.

The beta must not rank candidates, recommend hiring or rejection, estimate
shortlist/interview/hire probability, or present recruiter confidence. Human
judgment remains authoritative.

## Delivery order

1. Add coherent candidate and recruiter public entry points and an isolated,
   deterministic recruiter demo.
2. Add a candidate-controlled Proof Brief with `PRIVATE` as the default and a
   revocable `LINK_ONLY` state. Do not implement searchable discovery yet.
3. Add the smallest recruiter evidence workflow: role evidence map, authorized
   brief review, evidence questions, and structured feedback.
4. Prepare candidate and recruiter OAuth account creation in the existing
   cookie-based Supabase architecture. Persona must be server-owned business
   state, not a client authorization claim.
5. Rehearse schema, ownership, sharing, revocation, export, deletion, analytics,
   abuse, accessibility, secrets, and rollback before changing Production.

Production analytics and public signup remain off until their separate gates
pass. The old investor-only Netlify configuration must not be deployed.

## Public brand boundary

`skillmint-app` remains the repository and internal codename. A focused web
screen found directly overlapping career or recruiting products at
[skillmint.app](https://skillmint.app/),
[skillmint.net](https://www.skillmint.net/en/), and
[skillmint.ai](https://www.skillmint.ai/how-skillmint-works). Broad public use of
SkillMint is therefore blocked pending founder and legal review.

The preliminary low-collision shortlist is:

- **ClaimKind** — emphasizes careful claims rather than scores;
- **EvidentPath** — connects evidence to progress without promising an outcome;
- **ProofBasis** — describes the factual basis a human can review.

This is a web collision screen, not trademark clearance or domain availability
proof. No name is selected, no domain may be purchased, and presentation-only
branding must not rename schemas, migrations, environment variables, storage
keys, source identifiers, the repository, or historical evidence.

## Authentication and trust boundary

The zero-cost implementation choice is Google and GitHub OAuth through the
existing Supabase Auth and `@supabase/ssr` cookie architecture. Supabase's
default SMTP is explicitly unsuitable for production public signup, so new
email/password registration must not be the public-beta path. Existing-user
email login and password recovery remain supported.

Provider credentials, redirect allowlists, CAPTCHA or equivalent abuse controls,
and Production provider switches are manual launch operations. Code may be
prepared first, but provider activation must be reviewed as one coordinated
checklist.

Recruiter accounts do not imply employer verification. The first beta uses
candidate-authorized links, not recruiter browsing. A verified email or work
domain may later be one trust signal, but it must not be presented as proof of
identity or employer authority.

References:

- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase default SMTP limitations](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase social login](https://supabase.com/docs/guides/auth/social-login)

## Employment-AI risk boundary

The product is intentionally an explainable evidence-review and question tool,
not an automated employment decision tool. That boundary reduces risk but does
not itself establish legal compliance.

Current implementation assumptions are:

- never rank, shortlist, reject, or recommend candidates automatically;
- never express interview, hire, or employment probability;
- show the evidence and deterministic derivation a human can inspect;
- keep candidate sharing explicit, minimal, reversible, and private by default;
- preserve human review and record product notices separately from marketing;
- collect no protected-class data for scoring, targeting, or analytics.

These assumptions reflect current official guidance and laws, including the
[EU AI Act employment high-risk framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai),
[New York City Local Law 144 guidance](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page),
[Colorado AI law and rulemaking](https://coag.gov/ai/), and
[Illinois Public Act 103-0804](https://www.ilga.gov/legislation/publicacts/103/PDF/103-0804.pdf).
Qualified review is still required before claiming compliance or expanding into
automated employment decisions.

## Launch gates

Before a public URL or hosted switch is authorized, the repository and target
environment must prove:

- Production schema compatibility and recoverable rollout;
- OAuth configuration, redirect origin safety, and abuse controls;
- candidate ownership, default-private sharing, authorization, and revocation;
- recruiter authorization and absence of discoverable candidate search;
- export, deletion, analytics privacy, and retention behavior;
- zero-network synthetic demos, responsive accessibility, and server-only
  secret boundaries.

Until those checks pass, implementation and isolated verification may continue,
but Production migrations, analytics activation, signup activation, and public
deployment remain blocked.

## Current implementation progress

The public candidate/recruiter entry paths and both isolated synthetic demos are
implemented. The candidate product now has a derived-data-only Proof Brief with
`PRIVATE` default and revocable `LINK_ONLY` sharing. The raw token is returned
only when a link is created; the database stores its SHA-256 hash. Public brief
lookup returns only the exact derived payload and sharing timestamp, and the
page makes the non-verification and human-decision boundary explicit.

Create, refresh, share, and revoke actions cross an authenticated same-origin
server boundary. That server reloads the exact account-owned saved analysis and
derives the public payload; browser callers cannot write a payload or token hash
directly. Because saved-analysis JSON is client-writable, it is not treated as
publication authority: public evidence labels must resolve through the
server-owned canonical skill vocabulary, and free-form labels are discarded.

V10 also establishes the server-owned persona table needed by the later OAuth
entry flow. It is pending and has not been applied to Production. Candidate
discovery and `DISCOVERABLE_TO_VERIFIED_RECRUITERS` remain deliberately
unimplemented.

An isolated local replay applies the full V1–V10 migration chain from empty and
runs rollback-contained adversarial probes for Proof Brief grants, RLS, public
projection, revocation, and source-deletion cascade. This is executable local
database evidence, not a claim about Production schema state.

The candidate sharing boundary completed an independent security/privacy review
after adversarial saved-source, origin, ownership, response-binding, token,
projection, revocation, export, and deletion repairs. That review found no
remaining material pre-commit blocker; it does not authorize Production rollout.

The recruiter evidence workflow uses authenticated, server-verified account
state. A recruiter can create up to ten bounded role maps from supplied JDs;
the server derives four inspectable evidence categories without changing any
candidate score. A service-only database mutation serializes role-map creation
per recruiter so concurrent requests cannot exceed the ten-map bound. Review
submission atomically locks and rechecks the live share token, the exact
recruiter-owned role map, and an immutable `RECRUITER` persona before creating
one candidate-owned review for that brief/map pair. A committed revocation or
link replacement therefore prevents a stale token from creating feedback.

The review contains a generated evidence question, structured usefulness and
time signals, one feedback category, and an optional 1,000-character note. It
does not retain the recruiter account identifier or copy the raw JD into the
candidate record. Recruiters and anonymous users cannot read candidate-owned
reviews, and the review owner is bound to its Proof Brief by a composite foreign
key. Authenticated candidates cannot select the internal recruiter role-map
reference. Revoking a link prevents new review access; delivered feedback remains
until the related Proof Brief, saved report, or account is deleted. V11 remains
unapplied to Production.

The recruiter milestone completed an independent security/privacy review after
the transaction, owner-transition, composite-ownership, internal-column, and
adversarial test repairs. The final review found no remaining material
pre-commit blocker. This is an engineering gate only; it does not authorize a
Production migration, recruiter invitation, or public launch.
