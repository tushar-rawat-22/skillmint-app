# Product Requirements Specification (PRS)

**Document ID:** PRS-001

**Version:** 1.0.0

**Status:** DRAFT

**Owner:** Founders

**Depends On:** DOC-000 (The SkillMint Constitution)

---

# 1. Executive Summary

SkillMint is an AI-powered Career Operating System designed to guide students and professionals through every stage of their career development.

Rather than solving isolated problems such as resume optimization or interview preparation, SkillMint provides a unified ecosystem that continuously evaluates a user's employability, identifies improvement opportunities, and generates personalized actions to accelerate career growth.

The objective is to become the default platform users rely on throughout their professional journey.

---

# 2. Problem Statement

The career development ecosystem is highly fragmented.

A typical user relies on multiple independent platforms for learning, portfolio management, resume creation, interview preparation, networking, job searching, and career planning.

Because these platforms operate independently, users struggle to answer fundamental questions:

* Am I job-ready?
* What should I improve next?
* Which skills matter most?
* Is my resume competitive?
* Which companies should I target?
* What salary can I realistically expect?

This fragmentation creates confusion, inconsistent progress, duplicated effort, and poor decision-making.

---

# 3. Proposed Solution

SkillMint consolidates the entire career journey into a single intelligent platform.

The platform continuously analyzes the user's profile, projects, resume, technical skills, career goals, and market trends to produce actionable recommendations.

Instead of displaying static information, SkillMint generates personalized daily guidance that helps users improve measurable employability over time.

---

# 4. Product Vision

To become the world's most trusted AI Career Operating System that enables anyone to continuously improve their employability through intelligent analysis, structured roadmaps, measurable progress, and personalized recommendations.

---

# 5. Product Mission

Remove uncertainty from career development.

Every user should always know:

* their current position,
* their strengths,
* their weaknesses,
* their next priority,
* and the impact of every completed task.

---

# 6. Target Audience

## Primary Users

* University students
* Final-year students
* Fresh graduates
* Entry-level professionals

---

## Secondary Users

* Career switchers
* Bootcamp graduates
* Self-taught developers
* Working professionals seeking better opportunities

---

## Future Customers

* Universities
* Placement cells
* Recruiters
* Hiring companies
* Career coaches
* Training institutes

---

# 7. Product Goals

SkillMint should enable users to:

* Understand current employability.
* Improve resumes.
* Build stronger portfolios.
* Track measurable progress.
* Receive AI-generated career roadmaps.
* Prepare for interviews.
* Discover relevant opportunities.
* Increase recruiter confidence.
* Make informed career decisions.

---

# 8. Non-Goals (Version 1)

The first release of SkillMint will NOT attempt to become:

* A social media platform.
* A freelance marketplace.
* A full online learning platform.
* A coding judge like LeetCode.
* A traditional job board.
* A project hosting platform.
* A messaging platform.

These capabilities may be explored after establishing the core Career Operating System.

---

# 9. Product Success Criteria

SkillMint succeeds when users consistently return because the platform provides clear, actionable guidance that leads to measurable improvements in employability.

Success will be evaluated through long-term user progress rather than short-term engagement metrics.

---

# 10. Product Philosophy

Every feature implemented within SkillMint must satisfy at least one of the following objectives:

* Reduce uncertainty.
* Increase employability.
* Save user time.
* Improve measurable progress.
* Increase confidence.
* Simplify career planning.

Features that do not satisfy these objectives should not be included in the product.

---

# End of Section 1

The remaining sections of this document will define personas, user journeys, functional requirements, non-functional requirements, constraints, assumptions, acceptance criteria, and traceability.


# 11. Stakeholders

## Primary Stakeholders

* Students
* Fresh Graduates
* Working Professionals
* Career Switchers

## Secondary Stakeholders

* Universities
* Placement Cells
* Recruiters
* Hiring Managers
* Companies
* Bootcamps

---

# 12. User Personas

## Persona P-001 — College Student

Goal:
Secure internships and first job offers.

Pain Points:

* Doesn't know industry expectations.
* Weak resume.
* No roadmap.
* Unsure which skills matter.

Success Definition:

Receives internship offers.

---

## Persona P-002 — Final Year Student

Goal:

Become placement ready.

Pain Points:

* ATS rejection.
* Weak projects.
* Interview anxiety.
* Poor portfolio.

Success Definition:

Receives multiple placement opportunities.

---

## Persona P-003 — Early Career Professional

Goal:

Switch to a better company.

Pain Points:

* Resume outdated.
* Doesn't know market value.
* Doesn't know required skills.

Success Definition:

Receives interviews from target companies.

---

## Persona P-004 — Career Switcher

Goal:

Move into another industry.

Pain Points:

* Doesn't know skill gaps.
* Unsure where to start.
* Limited guidance.

Success Definition:

Successfully transitions into the desired role.

---

# 13. Jobs To Be Done (JTBD)

When users interact with SkillMint, they are trying to accomplish one or more of the following jobs:

* Understand current employability.
* Improve resume quality.
* Increase ATS compatibility.
* Improve recruiter confidence.
* Learn relevant skills.
* Build stronger projects.
* Prepare for interviews.
* Understand salary potential.
* Track career progress.
* Discover suitable opportunities.

---

# 14. Product Scope

## MVP Scope

Included:

* Authentication
* Resume Upload
* Resume Parsing
* Career IQ
* ATS Analysis
* Recruiter Confidence
* Salary Estimation
* Skills Analysis
* AI Recommendations
* Dashboard
* Profile Management

---

## Version 2

* AI Interview Coach
* AI Mock Interviews
* Company Insights
* Job Tracking
* Networking Features
* Team Accounts

---

## Future Vision

* University Dashboard
* Recruiter Dashboard
* Hiring Platform
* API Platform
* Enterprise Plans

---

# 15. Product Modules

PM-001 Authentication

PM-002 Dashboard

PM-003 Resume Studio

PM-004 Career Intelligence

PM-005 Career Roadmap

PM-006 AI Engine

PM-007 Profile

PM-008 Settings

PM-009 Billing

PM-010 Admin

---

# 16. Feature Inventory

## Authentication

F-001 Email Signup

F-002 Google Login

F-003 Password Reset

---

## Resume

F-004 Resume Upload

F-005 Resume History

F-006 Resume Parsing

F-007 Resume Analysis

---

## Dashboard

F-008 Career IQ

F-009 ATS Score

F-010 Recruiter Confidence

F-011 Salary Prediction

F-012 Skills Radar

F-013 Weekly Progress

F-014 AI Summary

---

## Roadmap

F-015 Daily Missions

F-016 Weekly Goals

F-017 Career Milestones

F-018 Progress Tracking

---

## Profile

F-019 Skills

F-020 Experience

F-021 Education

F-022 Certifications

F-023 Portfolio

---

## AI

F-024 Resume Suggestions

F-025 Skill Recommendations

F-026 Career Recommendations

F-027 Interview Preparation

F-028 Learning Suggestions

---

# 17. Functional Requirements

## Authentication

FR-001

Users shall be able to register using email.

FR-002

Users shall be able to authenticate using Google OAuth.

FR-003

Users shall be able to securely log in and log out.

---

## Resume

FR-004

Users shall upload PDF resumes.

FR-005

The system shall parse uploaded resumes.

FR-006

The system shall extract structured information.

FR-007

Users shall view historical resume analyses.

---

## Dashboard

FR-008

The dashboard shall display Career IQ.

FR-009

The dashboard shall display ATS Score.

FR-010

The dashboard shall display Recruiter Confidence.

FR-011

The dashboard shall display salary estimation.

FR-012

The dashboard shall display personalized recommendations.

FR-013

The dashboard shall update after each successful analysis.

---

## AI

FR-014

The AI engine shall generate personalized improvement recommendations.

FR-015

Recommendations shall be prioritized by expected impact.

FR-016

The system shall explain recommendations whenever possible.

---

## Roadmap

FR-017

Users shall receive personalized career missions.

FR-018

Progress shall be measurable over time.

FR-019

Completed tasks shall update Career IQ where applicable.

# 18. Non-Functional Requirements

## Performance

NFR-001

The application shall achieve a Lighthouse Performance score of at least 90 on desktop.

NFR-002

Dashboard pages should load in under 2 seconds under normal network conditions.

NFR-003

Resume analysis results should be returned within 30 seconds for typical resume sizes.

NFR-004

The application shall remain responsive during AI processing by displaying progress states.

---

## Scalability

NFR-005

The architecture shall support horizontal scaling of backend services.

NFR-006

Frontend components shall be modular and reusable.

NFR-007

Business logic shall remain independent of presentation components.

---

## Reliability

NFR-008

User data shall not be lost during normal application usage.

NFR-009

Unexpected failures shall produce graceful error messages.

NFR-010

The application shall recover safely from temporary API failures whenever possible.

---

## Security

NFR-011

Passwords shall never be stored in plaintext.

NFR-012

Sensitive data shall always be transmitted using HTTPS.

NFR-013

Authentication shall require secure session management.

NFR-014

User files shall only be accessible to authorized users.

NFR-015

API secrets shall never exist inside frontend source code.

---

## Accessibility

NFR-016

The application shall support keyboard navigation.

NFR-017

Color contrast shall satisfy WCAG AA guidelines.

NFR-018

Interactive elements shall contain accessible labels.

---

## Maintainability

NFR-019

Every major feature shall have independent modules.

NFR-020

Shared types shall exist only inside the /types directory.

NFR-021

Reusable UI shall exist only inside shared component libraries.

---

## Compatibility

NFR-022

The application shall support modern desktop browsers.

NFR-023

The application shall provide a fully responsive mobile experience.

NFR-024

The application shall function correctly across varying screen sizes.

---

# 19. Technical Constraints

The first public version of SkillMint shall:

* Operate with minimal infrastructure costs.
* Prioritize open-source technologies.
* Use TypeScript across the application.
* Use Next.js as the frontend framework.
* Use Supabase for authentication and database services.
* Use Git for version control.
* Be deployable on Vercel.

---

# 20. Product Constraints

The MVP shall intentionally exclude:

* Social networking
* Messaging
* Video conferencing
* Learning management systems
* Coding playgrounds
* Job marketplace functionality
* Recruiter CRM
* Enterprise administration

These capabilities may be introduced in future versions.

---

# 21. Assumptions

The product assumes that:

* Users possess a digital resume.
* Users seek career improvement.
* AI recommendations supplement—not replace—human judgment.
* Users have reliable internet access during analysis.
* Resume quality influences employability.

---

# 22. Risks

## Product Risks

* AI recommendations may occasionally be inaccurate.
* Users may overestimate score precision.
* Resume parsing quality depends on document structure.

---

## Technical Risks

* Third-party AI provider downtime.
* Resume parsing inconsistencies.
* External API rate limits.

---

## Business Risks

* Competitive products.
* AI service pricing changes.
* Low user retention if recommendations lack value.

---

# 23. Success Metrics

The success of SkillMint shall be evaluated using measurable indicators.

## User Metrics

* Weekly Active Users
* Monthly Active Users
* User Retention
* Resume Upload Completion Rate

---

## Product Metrics

* Average Career IQ Improvement
* Mission Completion Rate
* Resume Improvement Rate
* Recommendation Acceptance Rate

---

## Business Metrics

* Conversion to Paid Plans
* Customer Acquisition Cost
* Monthly Recurring Revenue
* Churn Rate

---

# 24. Acceptance Criteria

The MVP shall be considered complete when users can:

✓ Create an account.

✓ Upload a resume.

✓ Receive structured resume analysis.

✓ View Career IQ.

✓ View ATS Score.

✓ View Recruiter Confidence.

✓ Receive AI-generated recommendations.

✓ View salary insights.

✓ Access their dashboard.

✓ Revisit previous analyses.

---

# 25. Release Criteria

Before public launch:

* All critical bugs resolved.
* Authentication tested.
* Resume analysis verified.
* Dashboard verified.
* Mobile responsiveness verified.
* Accessibility review completed.
* Production deployment completed.

---

# 26. Out of Scope (Version 1)

The following are explicitly excluded from the MVP:

* AI voice interviews
* Company hiring dashboards
* University portals
* Recruiter portals
* Team workspaces
* Browser extensions
* Native mobile applications
* Public APIs

---

# 27. Revision History

| Version | Date      | Description                                         |
| ------- | --------- | --------------------------------------------------- |
| 1.0.0   | June 2026 | Initial Product Requirements Specification created. |

---

# End of Document
