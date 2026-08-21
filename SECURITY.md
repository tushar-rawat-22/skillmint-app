# Security policy

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/tushar-rawat-22/skillmint-app/security/advisories/new) for suspected security or privacy problems. Do not open a public issue with exploit details, credentials, resume content, account identifiers, or environment configuration.

Include the affected route or component, the conditions needed to reproduce the issue, the likely impact, and a minimal proof of concept that contains no real personal data. Reports will be triaged against the current `main` branch.

## Supported version

SkillMint is a controlled private pilot. Only the current `main` branch is supported; historical branches and preview artifacts are not maintained releases.

## Current boundaries

- Public signup, analytics collection, payments, and permanent public sharing remain disabled.
- The synthetic demo must not contact Supabase, write browser storage, emit analytics, accept uploads, or process real candidate data.
- Real resume extraction requires a server-verified user and independently verified bearer identity, enforces same-origin and bounded-request checks, and returns finite public errors.
- Administrative Supabase credentials are server-only and must never enter browser bundles, logs, screenshots, fixtures, or client-prefixed environment variables.
- Resume parsing handles untrusted input within fixed file, archive, and extracted-text limits. It does not make candidate evidence externally verified.

The authenticated extraction endpoint does not include a process-local rate limiter. That would not provide reliable protection across serverless instances. During the controlled pilot, cohort access and hosting/provider request controls remain the operational abuse boundary; a distributed rate limit should be introduced only with an explicitly selected production platform and shared backing service.
