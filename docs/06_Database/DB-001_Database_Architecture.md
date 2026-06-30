# DB-001 — SkillMint Database Architecture

**Document ID:** DB-001

**Version:** 1.0

**Status:** Draft

**Owner:** Engineering

---

# Purpose

This document defines the complete database architecture of SkillMint.

It describes what information the platform stores, why it is stored, how entities relate to one another, and the principles governing all future schema decisions.

This document intentionally avoids implementation details such as SQL syntax or migrations.

Those belong in implementation.

The purpose of DB-001 is to define the permanent structure of SkillMint's business data.

---

# Database Philosophy

The database is the long-term memory of SkillMint.

Artificial Intelligence reasons.

The database remembers.

Every important user action should eventually become structured data.

Career growth is cumulative.

Therefore, SkillMint is designed around historical progression rather than isolated resume analyses.

No important business event should disappear.

Historical context is one of SkillMint's strongest competitive advantages.

---

# Design Principles

Every database decision must satisfy these principles.

## 1. Business-Driven

Tables represent business entities.

Never screens.

Never components.

Never frontend pages.

Examples:

- User
- Resume
- Recommendation
- Mission
- Achievement

NOT

- Dashboard
- Resume Page
- Profile Screen

---

## 2. Historical First

Whenever practical, information should be versioned rather than overwritten.

SkillMint measures growth.

Growth cannot exist without history.

Examples include:

- Resume Versions
- Career IQ History
- Recommendation History
- Mission History
- Achievement History

---

## 3. Single Source of Truth

Every piece of business information should have one authoritative location.

Business data should never exist in multiple tables unless intentional denormalisation is documented.

---

## 4. Explainability

Every recommendation.

Every score.

Every AI insight.

Every mission.

must be traceable back to structured information.

Nothing important should exist only inside an LLM response.

---

## 5. Auditability

Business events should be reproducible.

The platform should always be capable of answering:

- What changed?
- When did it change?
- Why did it change?
- Which data produced the result?

---

# Core Business Domains

The entire SkillMint platform is built around a small number of business domains.

These domains become the foundation of the database.

```text
Identity

↓

Career Profile

↓

Resume

↓

Career Intelligence

↓

Recommendations

↓

Growth

↓

Sharing

↓

Platform

Every table in the database belongs to exactly one domain.
No table should exist without a clearly defined business owner.
Database Domain Ownership
Identity
Responsible for:
Users
Authentication references
User preferences
Career Profile
Responsible for:
Personal information
Education
Experience
Skills
Projects
Certifications
Career goals
Resume
Responsible for:
Resume uploads
Resume versions
Parsing status
Resume metadata
Career Intelligence
Responsible for:
Career IQ
ATS Compatibility
Recruiter Confidence
Salary Intelligence
Career DNA
Historical score progression
Recommendations
Responsible for:
AI recommendations
Recommendation evidence
Recommendation acceptance
Recommendation completion
Growth
Responsible for:
Missions
Achievements
Streaks
Progress
Career milestones
Sharing
Responsible for:
Public Career Cards
Share links
Public profiles
Social assets
Platform
Responsible for:
Notifications
Feedback
Feature flags
System events
Analytics references
Entity Philosophy
Every entity should answer one business question.
Example:
User
→ Who owns this career?
Resume
→ What was uploaded?
Mission
→ What should the user do next?
Achievement
→ What has the user accomplished?
Recommendation
→ What should improve?
If an entity cannot answer a clear business question,
it probably should not exist.
Database Success Criteria
The database architecture is considered successful if:
Every business concept has a natural home.
Historical progression is preserved.
AI decisions remain explainable.
Business logic does not depend on duplicated data.
Future products can extend existing entities rather than replacing them.
This document intentionally defines principles before schemas.

---

# Core Entity Model

The SkillMint database is organised around business entities.

Every entity owns one business responsibility.

Entities communicate through relationships rather than duplicated information.

The platform currently consists of eight core domains.

```text
Identity

↓

Career Profile

↓

Resume

↓

Career Intelligence

↓

Growth

↓

Recommendations

↓

Sharing

↓

Platform
```

No entity should exist outside one of these domains.

---

# Domain Entity Map

## Identity

The Identity domain manages user ownership and authentication.

Entities:

• User
• User Settings
• User Preferences

Every other entity ultimately belongs to a User.

---

## Career Profile

The Career Profile is the permanent representation of a person's professional identity.

Unlike resumes, the Career Profile continuously evolves.

Entities:

• Career Profile

• Education

• Experience

• Skill

• Project

• Certification

• Language

• Career Goal

Relationship:

```text
User

↓

Career Profile

├── Education

├── Experience

├── Skills

├── Projects

├── Certifications

├── Languages

└── Career Goals
```

The Career Profile becomes the primary source of career truth.

---

## Resume Domain

Resumes are historical documents.

They are inputs—not identities.

Entities:

• Resume

• Resume Version

• Resume Analysis

Relationship:

```text
Career Profile

↓

Resume

↓

Resume Version

↓

Resume Analysis
```

Every uploaded resume creates a new immutable version.

Previous versions are never overwritten.

---

## Career Intelligence Domain

This domain contains measurable career metrics.

Entities:

• Career Snapshot

• Career IQ History

• ATS History

• Recruiter Confidence History

• Salary Intelligence History

• Career DNA

Relationship:

```text
Career Profile

↓

Career Snapshot

├── Career IQ

├── ATS

├── Recruiter Confidence

├── Salary Intelligence

└── Career DNA
```

Snapshots preserve historical progression.

They should never be overwritten.

---

## Recommendation Domain

Recommendations convert intelligence into action.

Entities:

• Recommendation

• Recommendation Evidence

• Recommendation Acceptance

Relationship:

```text
Career Snapshot

↓

Recommendation

↓

Evidence

↓

Accepted

↓

Completed
```

Recommendations should remain reproducible.

Every recommendation stores the evidence that produced it.

---

## Growth Domain

Growth measures improvement over time.

Entities:

• Mission

• Mission Progress

• Achievement

• Milestone

• Career Streak

Relationship:

```text
Career Profile

↓

Mission

↓

Progress

↓

Achievement

↓

Milestone
```

Growth should never depend on resumes.

Growth depends on completed actions.

---

## Sharing Domain

Sharing creates public representations.

Entities:

• Public Career Card

• Public Profile

• Share Link

Sharing never exposes sensitive information.

Public assets are generated from existing data.

They never become the primary data source.

---

## Platform Domain

Infrastructure supporting the product.

Entities:

• Notification

• Feedback

• Audit Event

• Feature Flag

Platform entities support business domains but never own business logic.

---

# Cross-Domain Relationships

The entire system can be represented as:

```text
User

↓

Career Profile

├── Resume

├── Career Snapshot

├── Mission

├── Achievement

├── Recommendation

├── Share Assets

└── Notifications
```

Every important entity ultimately belongs to one Career Profile.

This prevents fragmented ownership.

---

# Aggregate Roots

Only the following entities are allowed to become aggregate roots.

• User

• Career Profile

• Resume

• Career Snapshot

• Mission

Every other entity exists because one of these aggregate roots exists.

This dramatically simplifies future scaling.

---

# Ownership Rules

Every entity must answer three questions.

1.

Who owns me?

2.

Who created me?

3.

Who can modify me?

If these questions cannot be answered,

the entity requires redesign.

---

# Future Expansion

The entity model intentionally supports future products.

Examples:

Recruiter Workspace

University Portal

Career Coach

Enterprise Dashboard

These products extend existing entities.

They should never duplicate business data.

---

# Batch 2 Review

Current core entities:

Identity
- User
- User Settings
- User Preferences

Career
- Career Profile
- Education
- Experience
- Skill
- Project
- Certification
- Language
- Career Goal

Resume
- Resume
- Resume Version
- Resume Analysis

Intelligence
- Career Snapshot
- Career IQ History
- ATS History
- Recruiter Confidence History
- Salary Intelligence History
- Career DNA

Recommendations
- Recommendation
- Recommendation Evidence
- Recommendation Acceptance

Growth
- Mission
- Mission Progress
- Achievement
- Milestone
- Career Streak

Sharing
- Public Career Card
- Public Profile
- Share Link

Platform
- Notification
- Feedback
- Audit Event
- Feature Flag

Total Core Entities: 29

These entities should satisfy every current product requirement while remaining extensible for future products.

---

# Data Lifecycle

Every major business entity follows a predictable lifecycle.

The lifecycle defines how information is created, updated, archived and retained.

The objective is to preserve historical integrity while preventing unnecessary duplication.

---

# Entity Lifecycle

Every entity progresses through four stages.

```text
Created

↓

Active

↓

Archived

↓

Retained
```

Deletion should be considered an exceptional operation rather than a normal workflow.

---

# Versioning Strategy

SkillMint measures career growth over time.

Therefore, important business entities are versioned instead of overwritten.

Versioning applies to:

- Resume Versions
- Career Assessments
- Career IQ
- ATS Compatibility
- Recruiter Confidence
- Salary Intelligence
- Recommendations
- Missions

Historical records remain immutable once created.

Corrections generate new records rather than modifying historical data.

---

# Immutable Records

The following entities should never be edited after creation.

- Resume Version
- Career Assessment
- Career IQ Result
- ATS Result
- Recruiter Confidence Result
- Salary Intelligence Result
- Career DNA Result

Historical integrity is considered more valuable than storage efficiency.

---

# Mutable Records

Certain entities naturally evolve.

These include:

- Career Profile
- User Preferences
- User Settings
- Career Goals

These represent the user's current state rather than historical events.

---

# Soft Delete Philosophy

Business information should rarely be permanently deleted.

Instead, records should become inactive.

Soft deletion preserves:

- Historical analytics
- AI explainability
- Audit trails
- User recovery

Permanent deletion should only occur for legal or compliance requirements.

---

# Audit Strategy

Every important business action should generate an audit event.

Examples include:

- Account creation
- Resume upload
- Career assessment generation
- Recommendation acceptance
- Mission completion
- Achievement unlock
- Profile updates

Audit events should contain:

- Timestamp
- Actor
- Event type
- Resource affected
- Result

Audit logs should never be editable.

---

# Naming Conventions

Database objects should follow consistent naming rules.

## Tables

Plural nouns.

Examples:

- users
- resumes
- career_profiles
- recommendations
- missions

---

## Primary Keys

Every table contains a single primary identifier.

Use a consistent identifier strategy across the platform.

---

## Foreign Keys

Foreign keys should clearly indicate ownership.

Examples:

- user_id
- career_profile_id
- resume_id
- recommendation_id

Avoid ambiguous identifiers.

---

## Timestamps

Every major entity should record:

- Created
- Updated

Historical entities additionally record:

- Generated
- Completed
- Archived

The timestamp vocabulary should remain consistent throughout the platform.

---

# Relationship Principles

Relationships should always represent business ownership.

Examples:

User

owns

Career Profile

Career Profile

owns

Career Assessments

Career Assessment

produces

Recommendations

Recommendations

generate

Growth

Ownership must always flow in one direction.

Circular ownership should never exist.

---

# Indexing Philosophy

Indexes exist to improve user experience rather than satisfy theoretical optimisation.

Indexing should prioritise:

- User lookups
- Career history
- Resume history
- Recommendation history
- Mission progress
- Public sharing

Index decisions should be driven by observed usage patterns.

---

# Data Integrity Principles

Every stored record should satisfy the following principles.

- One owner
- One responsibility
- One source of truth
- One lifecycle

Business rules should never depend on duplicated information.

---

# Future Expansion

The database should support future products without structural redesign.

Potential future domains include:

- Recruiter Workspace
- University Workspace
- Mentor Workspace
- Enterprise Platform
- Marketplace
- Public API

New products should extend existing entities wherever possible.

---

# Database Success Metrics

The architecture is considered successful when:

- Every business concept has a natural home.
- Historical progression is preserved.
- AI outputs remain reproducible.
- Relationships remain understandable.
- Engineers can extend the schema without redesigning existing domains.

---

# Final Statement

The SkillMint database is not designed to store resumes.

It is designed to preserve careers.

Every table, relationship and business entity should contribute to understanding how a person's career evolves over time.

The database exists to support long-term career intelligence rather than isolated document analysis.

---

# Document Status

Status: 🟢 Frozen

Version: 1.0