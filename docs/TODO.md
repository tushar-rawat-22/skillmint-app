# SkillMint Execution Roadmap

**Version:** 1.0

**Status:** Active

**Current Phase:** Architecture Freeze → MVP Development

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

Implementation: ⏳ Ready to Begin

Target:

**Private Beta → Public Launch**

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

Next:

Sprint 7.4 Real Supabase Setup + Live Account Testing
