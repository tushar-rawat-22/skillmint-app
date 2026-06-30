# API-001 — SkillMint API Architecture

**Document ID:** API-001

**Version:** 1.0

**Status:** Draft

**Owner:** Backend Platform

---

# Purpose

This document defines the public API architecture of SkillMint.

The objective is to create a stable contract between the frontend, backend, AI platform and database.

This document specifies behaviour rather than implementation.

---

# API Philosophy

The API exists to expose business capabilities.

Endpoints should represent user actions rather than database tables.

Good:

POST /career-assessments

Bad:

POST /career_iq

Business operations should remain stable even if internal implementation changes.

---

# Design Principles

Every endpoint should satisfy:

• One responsibility

• Predictable behaviour

• Stateless execution

• Idempotent where appropriate

• Versionable

• Explainable

---

# Authentication

Every authenticated request carries a verified user identity.

Authentication is handled through Supabase Auth.

Business logic should never trust client-provided user IDs.

User identity always comes from the authenticated session.

---

# API Layers

```text
Client

↓

API

↓

Business Services

↓

AI Platform

↓

Database
```

The API never talks directly to database tables.

Business Services own business logic.

---

# Resource Groups

The API is organised into business domains.

Authentication

Career Profile

Resume

Career Assessments

Recommendations

Growth

Sharing

Notifications

Platform

---

# Authentication Endpoints

POST /auth/login

POST /auth/signup

POST /auth/logout

GET /auth/session

---

# Career Profile Endpoints

GET /career-profile

PATCH /career-profile

GET /career-profile/history

---

# Resume Endpoints

POST /resumes/upload

GET /resumes

GET /resumes/{id}

DELETE /resumes/{id}

---

# Career Assessment Endpoints

POST /career-assessments

GET /career-assessments

GET /career-assessments/{id}

GET /career-assessments/latest

Career Assessments are immutable.

Every request generates a new assessment.

---

# Recommendation Endpoints

GET /recommendations

PATCH /recommendations/{id}/accept

PATCH /recommendations/{id}/complete

Recommendations are never edited.

Only their lifecycle changes.

---

# Growth Endpoints

GET /missions

PATCH /missions/{id}/complete

GET /achievements

GET /career-progress

---

# Sharing Endpoints

POST /share

GET /share/{id}

DELETE /share/{id}

---

# Notification Endpoints

GET /notifications

PATCH /notifications/read

---

# Response Structure

Every response follows one consistent format.

Successful response

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error response

```json
{
  "success": false,
  "error": {
    "code": "",
    "message": ""
  }
}
```

Consistency reduces frontend complexity.

---

# Error Philosophy

Errors should explain:

What failed.

Why it failed.

How the client should recover.

Internal implementation details should never be exposed.

---

# Pagination

Large collections use cursor pagination.

Never offset pagination.

Cursor pagination scales significantly better.

---

# Versioning

The API supports explicit versioning.

Example:

/v1/

Future versions should coexist without breaking clients.

---

# Rate Limiting

Rate limiting protects infrastructure.

Higher-cost endpoints receive stricter limits.

Examples:

Career Assessments

Resume Upload

AI Recommendations

Authentication

Simple read endpoints receive more generous limits.

---

# Security Principles

Never trust client input.

Validate every request.

Sanitize uploaded content.

Authorise every protected resource.

Prevent mass assignment.

Never expose internal IDs unnecessarily.

---

# Success Metrics

The API architecture is successful when:

Frontend teams can build independently.

Backend services remain modular.

AI services remain replaceable.

Endpoints reflect business capabilities rather than database implementation.

---

# Final Statement

The SkillMint API is a business interface.

It exists to expose career capabilities rather than technical implementation.

Stable APIs enable rapid product development while preserving architectural flexibility.

---

# Document Status

Status: 🟢 Frozen

Version: 1.0