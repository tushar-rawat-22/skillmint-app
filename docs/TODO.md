# SkillMint Execution Roadmap

**Version:** 1.0

**Status:** Active

**Current Phase:** Beta Freeze QA → Closed Beta Preparation

---

# Purpose

This document defines the execution roadmap for SkillMint.

It is **not** a backlog.

It is the master implementation plan that takes SkillMint from architecture to public launch.

Every task should directly contribute to shipping the product.

Tasks should only be added if they support an approved product objective.

---

# Overall Roadmap

```text
Architecture Freeze

↓

Project Foundation

↓

Authentication

↓

Resume Pipeline

↓

Career Intelligence Engine

↓

Dashboard

↓

Growth System

↓

Public Sharing

↓

Private Beta

↓

Public Launch
```

---

# Phase 0 — Architecture Freeze

## Objective

Freeze the technical direction of SkillMint.

### Deliverables

- [x] Constitution
- [x] Product Requirements
- [x] UX Architecture
- [x] UI Design System
- [x] Engineering Architecture
- [x] Database Architecture
- [x] AI Architecture
- [x] API Architecture
- [x] Repository Documentation

**Exit Criteria**

Architecture Version 1.0 approved.

---

# Phase 1 — Project Foundation

## Objective

Create a production-ready development environment.

### Deliverables

- [ ] Initialize Next.js project
- [ ] Configure TypeScript
- [ ] Configure Tailwind CSS
- [ ] Install shadcn/ui
- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Setup environment variables
- [ ] Connect Supabase
- [ ] Configure GitHub repository
- [ ] Configure deployment pipeline

**Exit Criteria**

Application runs locally and deploys successfully.

---

# Phase 2 — Authentication

## Objective

Allow users to securely create and access accounts.

### Deliverables

- [ ] Sign Up
- [ ] Login
- [ ] Logout
- [ ] Session Management
- [ ] Protected Routes
- [ ] User Profile Initialization

**Exit Criteria**

Users can securely authenticate and access protected pages.

---

# Phase 3 — Resume Pipeline

## Objective

Convert uploaded resumes into structured career data.

### Deliverables

- [ ] Resume Upload
- [ ] Storage Integration
- [ ] Resume Parsing
- [ ] Resume Versioning
- [ ] Parsing Validation
- [ ] Structured Career Profile Generation

**Exit Criteria**

Users receive a validated Career Profile from an uploaded resume.

---

# Phase 4 — Career Intelligence

## Objective

Generate explainable Career Assessments.

### Deliverables

- [ ] Career IQ
- [ ] ATS Compatibility
- [ ] Recruiter Confidence
- [ ] Salary Intelligence
- [ ] Career DNA
- [ ] Career Momentum
- [ ] Career Risk
- [ ] Career Potential

**Exit Criteria**

Every Career Assessment is deterministic, explainable and stored historically.

---

# Phase 5 — Recommendations

## Objective

Convert intelligence into action.

### Deliverables

- [ ] Decision Engine
- [ ] Recommendation Engine
- [ ] Recommendation Ranking
- [ ] Recommendation Lifecycle
- [ ] Confidence Indicators

**Exit Criteria**

Every user receives prioritised, evidence-based recommendations.

---

# Phase 6 — Dashboard

## Objective

Build the Career Operating System interface.

### Deliverables

- [ ] Dashboard Layout
- [ ] Career IQ Card
- [ ] Recruiter Confidence Card
- [ ] Salary Intelligence Card
- [ ] Career DNA Card
- [ ] Momentum Card
- [ ] Mission Panel
- [ ] Recommendation Panel
- [ ] Progress Timeline

**Exit Criteria**

Users can understand their current career state within one minute.

---

# Phase 7 — Growth System

## Objective

Encourage continuous improvement.

### Deliverables

- [ ] Missions
- [ ] Achievements
- [ ] Streaks
- [ ] Progress Tracking
- [ ] Milestones

**Exit Criteria**

Users are rewarded for measurable career progress.

---

# Phase 8 — Sharing

## Objective

Enable users to showcase achievements.

### Deliverables

- [ ] Public Career Cards
- [ ] Share Links
- [ ] Social Preview Images
- [ ] Privacy Controls

**Exit Criteria**

Users can confidently share career achievements online.

---

# Phase 9 — Private Beta

## Objective

Validate the product with real users.

### Deliverables

- [ ] Internal Testing
- [ ] Bug Fixes
- [ ] Performance Optimisation
- [ ] User Feedback Collection
- [ ] Analytics

**Exit Criteria**

Core workflows validated by early adopters.

---

# Phase 10 — Public Launch

## Objective

Release SkillMint publicly.

### Deliverables

- [ ] Production Deployment
- [ ] Monitoring
- [ ] Error Tracking
- [ ] Marketing Website
- [ ] Launch Campaign

**Exit Criteria**

SkillMint is publicly accessible and stable.

---

# Development Rules

Every feature follows the same lifecycle.

```text
Design

↓

Implement

↓

Test

↓

Review

↓

Merge

↓

Deploy
```

No feature skips a stage.

---

# Success Metrics

The MVP is successful when:

- A new user can create an account.
- Upload a resume.
- Receive a Career Assessment.
- Understand their strengths and weaknesses.
- Receive actionable recommendations.
- Begin improving through missions.
- Share progress publicly.

If these outcomes are achieved, SkillMint delivers on its core promise.

---

# Current Status

Architecture: ✅ Complete

Implementation: Production beta build active

Current target:

**Beta freeze QA → closed beta launch**

---

# Locked SkillMint Beta Hierarchy

```text
Resume Reality
-> Profile-fit Roles
-> Active Target
-> Proof Confidence
-> Career IQ
-> Latest JD Match
-> Roadmap / Missions
-> Re-score Loop
```

Future work must not confuse Profile-fit Roles with Latest JD Match.

Profile-fit Roles are general role suggestions from the resume. Latest JD Match is the user's fit against one specific pasted job description. Active Target should prefer the latest JD when present.

---

# Sprint Status Update

Sprint 5 Resume Intelligence: Frozen

Next major focus:

Sprint 6 — Authentication, Database, Persistent Profiles

Sprint 6.1 Supabase Foundation: Completed

Sprint 6.2 Auth Screens + Session Flow: Completed

Sprint 6.3 Profile Persistence Foundation: Completed

Sprint 6.4 Save Resume Analysis to Database: Completed

Sprint 6.5 Persist ATS Matches, Rewrite Plans, and Roadmaps: Completed

Sprint 6.6 User Account Dashboard + Sprint 6 QA Freeze: Completed

Sprint 6 Account Persistence: Complete

Sprint 7.1 Onboarding Foundation and First-Run Experience: Completed

Sprint 7.2 Guided Target Role Setup: Completed

Sprint 7.3 Beta Landing/App Entry Polish: Completed

Sprint 7.4 Real Supabase Setup + Live Account Testing: Completed

Sprint 7.5 Beta UI QA + Visual Polish: Completed

Sprint 7.5D Visual System + Motion Polish: Completed

Sprint 7.6A Feedback System Foundation: Completed

Sprint 7.6B Run Feedback SQL + Live Feedback Test: Completed

Sprint 7.6C Deployment Prep + Production Checklist: Completed

Sprint 7.6E Production QA Fixes + Flow Clarity: Completed

Sprint 7.7 Beta UX Simplification + Landing Flow: Completed

Sprint 7.8 Activation Funnel + Upgrade Interest + Documentation: Completed

Sprint 7.9 Beta Freeze QA + UX Regression Fixes: Completed

Sprint 7.10 Premium Visual Redesign + Founder Appeal Pass: Completed

Sprint 7.10B Visual Cohesion + Shareable Trust Fixes: Completed

Sprint 7.10C Password Recovery + Proof Engine Direction: Completed

Sprint 7.11 Proof-Aware Scoring MVP + Conversion UX Cleanup: Completed

Sprint 7.11F SkillMint Doctrine + Hierarchy Lock: Completed

RC-1A — Explainability + First-Time Clarity: Completed

- Landing differentiation
- Setup guidance
- Free beta clarity
- Proof Confidence explanation
- Score guide
- Upload processing feedback

RC-1B — Role Reasoning + Roadmap Actionability: Completed

- Profile-fit role reasoning
- Roadmap priority / effort / impact labels
- Dashboard mission clarity
- Latest JD vs Profile-fit role clarity

RC-1C/D — Workspace State + Mobile/Empty QA: Completed

- Active workspace state handling
- Clear active workspace control
- No stale dashboard metrics after local data is cleared
- Saved-analysis empty state clarity
- Mobile responsiveness
- Empty states
- Dashboard readability
- Roadmap readability
- Copy consistency
- Feedback button check

Next:

Beta freeze QA, then beta freeze tag
