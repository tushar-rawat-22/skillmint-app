# SkillMint Architectural Decisions

**Version:** 1.0

**Status:** Active

---

# Purpose

This document records every major architectural, product and engineering decision made during the development of SkillMint.

Approved architecture documents should remain stable.

Future changes are documented here before modifying existing architecture.

Every significant decision must answer:

- What was decided?
- Why was it decided?
- What alternatives were considered?
- What are the long-term consequences?

This document becomes the historical memory of the company.

---

# Decision Record Format

Every new decision should follow this structure.

```text
Decision ID:

Date:

Status:

Category:

Decision:

Context:

Alternatives Considered:

Reasoning:

Consequences:
```

---

# ADR-001

## Category

Product

## Status

Accepted

## Decision

SkillMint will be built as a Career Operating System rather than an AI Resume Analyzer.

## Context

Most existing products focus on improving resumes.

Users only interact with them when applying for jobs.

This creates poor long-term retention.

## Alternatives Considered

- Resume Analyzer
- Resume Builder
- Interview Platform

## Reasoning

Career growth is continuous.

Resume optimization is occasional.

Building around careers instead of resumes significantly increases long-term value.

## Consequences

Every feature must contribute to continuous career growth rather than isolated resume improvements.

---

# ADR-002

## Category

Artificial Intelligence

## Status

Accepted

## Decision

Deterministic calculations always precede AI reasoning.

## Context

Large language models are excellent at reasoning but unreliable for calculations.

## Reasoning

Business metrics should always be reproducible.

AI should explain results rather than invent them.

## Consequences

Career IQ

ATS

Recruiter Confidence

Career Risk

Career Momentum

Salary Intelligence

must all originate from deterministic engines.

---

# ADR-003

## Category

Product

## Status

Accepted

## Decision

Career Assessments are immutable.

## Context

Career growth must be measurable over time.

Editing historical assessments destroys progression.

## Consequences

Every assessment creates a new historical record.

History is never overwritten.

---

# ADR-004

## Category

Database

## Status

Accepted

## Decision

Business domains own data.

Not technical layers.

## Context

Traditional CRUD architectures become difficult to scale.

## Consequences

The database is organized around:

- Identity
- Career Profile
- Resume
- Career Assessment
- Recommendations
- Growth
- Sharing
- Platform

---

# ADR-005

## Category

Engineering

## Status

Accepted

## Decision

Feature-first architecture.

## Context

Large technical folders become difficult to maintain.

## Consequences

Features own their UI, logic and services whenever possible.

---

# ADR-006

## Category

User Experience

## Status

Accepted

## Decision

Every score must be explainable.

## Context

Users should never see unexplained numbers.

## Consequences

Every score requires:

- Evidence
- Explanation
- Confidence
- Recommended action

---

# ADR-007

## Category

Career Intelligence

## Status

Accepted

## Decision

Truth is more valuable than reassurance.

## Context

Many AI systems inflate feedback to improve user satisfaction.

This creates false confidence.

## Consequences

SkillMint intentionally provides honest assessments.

Recommendations prioritize long-term growth over short-term motivation.

---

# ADR-008

## Category

Business

## Status

Accepted

## Decision

Every feature must increase one of the following:

- Retention
- Career outcomes
- Revenue

## Context

Interesting features are not automatically valuable features.

## Consequences

Features without measurable business impact should not be built.

---

# ADR-009

## Category

Architecture

## Status

Accepted

## Decision

Documentation precedes implementation.

## Context

Architecture mistakes are significantly more expensive than implementation mistakes.

## Consequences

Major features require approved documentation before coding begins.

---

# ADR-010

## Category

Platform

## Status

Accepted

## Decision

Large Language Models are implementation details.

## Context

Providers change rapidly.

Vendor lock-in reduces flexibility.

## Consequences

SkillMint communicates through an Intelligence Layer rather than directly with a specific model provider.

---

# Decision Rules

A new Architectural Decision Record (ADR) is required whenever:

- Product philosophy changes.
- Architecture changes.
- Database structure changes.
- AI reasoning changes.
- API contracts change.
- Security strategy changes.
- Business model changes.

Minor implementation details do not require ADRs.

---

# Current Architecture Version

Version: 1.0

Status: Architecture Freeze (In Progress)

Next Milestone:

Implementation Phase

---

# Final Principle

Code explains **how** the system works.

Architecture explains **why** it works.

Architectural decisions preserve that "why" as the company grows.