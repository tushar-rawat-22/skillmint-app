ENG-001 — PART 1
Paste the following into the now-empty file.
ENG-001 — SkillMint Engineering Architecture
Document ID: ENG-001
Version: 1.0
Status: Frozen
Owner: Engineering
Last Updated: June 2026
Purpose
This document defines the engineering architecture of SkillMint.
It is the single source of truth for every engineering decision across the platform.
Its purpose is to ensure that every engineer—present and future—builds SkillMint using the same architectural principles, terminology, and design philosophy.
This document does not describe implementation details.
It defines how the system is engineered, why it is engineered that way, and which architectural decisions are considered permanent.
Engineering Decision Hierarchy
Whenever two documents disagree, the document higher in this hierarchy always takes precedence.
Company Constitution
        ↓
Product Requirements Specification (PRS)
        ↓
UX Documentation
        ↓
UI Documentation
        ↓
Engineering Architecture
        ↓
Database Architecture
        ↓
API Architecture
        ↓
Implementation
Architecture must always serve the product.
The product must always serve the company's mission.
Engineering Philosophy
Engineering exists to deliver product value.
Technology is a tool.
Users never pay for technology.
Users pay for outcomes.
Every engineering decision must improve at least one of the following:
Simplicity
Reliability
Scalability
Maintainability
Security
Developer Velocity
without significantly degrading another.
Whenever a trade-off exists, long-term maintainability is preferred over short-term convenience.
System Vision
SkillMint is not a resume analyzer.
SkillMint is a Career Operating System.
The web application is only one interface.
The architecture must support future products without requiring fundamental redesign.
Future interfaces may include:
Mobile Applications
Recruiter Portal
University Portal
Career Coach Dashboard
Browser Extension
Public API
Enterprise Dashboard
These products should extend the platform rather than create parallel systems.
High-Level System Architecture
                     Browser
                        │
                 Next.js Frontend
                        │
         API / Server Actions Layer
                        │
                Business Services
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
 Database         Intelligence Engine    Storage
(PostgreSQL)             │          (Documents/Assets)
     │                   │
     └──────────── Supabase Platform ────────────┘

Every request flows through the business layer.
Clients never communicate directly with the database or AI systems.
Architectural Principles
SkillMint follows the following engineering principles.
1. Business-First Architecture
The system is organised around business capabilities rather than technical layers.
Features own their business logic.
2. Explainability
Every score.
Every recommendation.
Every AI decision.
Every business rule.
must be explainable.
Hidden behaviour is prohibited.
3. Single Source of Truth
Every business rule should exist only once.
No duplicated calculations.
No duplicated scoring.
No duplicated recommendation logic.
4. Server-First
Whenever possible:
business logic
calculations
data processing
should execute on the server.
The browser is responsible for interaction—not computation.
5. Modularity
Every module owns one responsibility.
A module should be understandable in isolation.
6. Deterministic Before AI
Whenever a problem can be solved through deterministic logic, it should be.
Artificial Intelligence is reserved for reasoning, prioritisation and explanation—not arithmetic.
7. Future Scalability
Every major architectural decision should support future expansion without requiring a complete rewrite.
Core Product Engines
SkillMint is divided into independent business engines.
Each engine owns one business capability.
Resume Engine
Responsible for:
Resume upload
Resume versioning
Resume parsing
Structured profile extraction
The Resume Engine converts raw documents into structured career data.
Career Intelligence Engine
Responsible for calculating measurable career metrics.
Examples include:
Career IQ
ATS Compatibility
Recruiter Confidence
Salary Intelligence
Career DNA
Whenever possible these metrics should be generated through deterministic algorithms before invoking language models.
Decision Engine
Responsible for determining:
highest-impact recommendation
next career action
mission generation
recommendation prioritisation
This engine converts intelligence into decisions.
Growth Engine
Responsible for:
missions
achievements
streaks
progress tracking
historical improvement
Growth is measured over time rather than through isolated resume analyses.
Share Engine
Responsible for generating public assets including:
Career Cards
achievement summaries
milestone graphics
public profile snippets
The Share Engine never exposes sensitive user information.
Technology Stack
Technology choices may evolve.
Architectural responsibilities should not.
Frontend
Next.js (App Router)
TypeScript
Tailwind CSS
shadcn/ui
Framer Motion
Recharts
React Hook Form
Zod
Backend
Supabase
PostgreSQL
Edge Functions
Storage
Authentication
Intelligence Platform
The Intelligence Platform consists of:
Resume Parsing Pipeline
Feature Extraction Pipeline
Career Intelligence Engine
Recommendation Engine
LLM Reasoning Layer
Implementation details may change without affecting system architecture.
Frontend Architecture
The frontend is responsible for presentation—not business decisions.
Its responsibilities include:
rendering interfaces
collecting user input
visualising intelligence
animations
accessibility
interaction
The frontend must never calculate business scores independently.
Every displayed score originates from backend services.
Frontend Design Principles
The frontend should feel:
Immediate
Honest
Calm
Minimal
Professional
The interface should communicate confidence through clarity rather than visual complexity.
Every screen should answer one primary question.
Every interaction should reduce cognitive load.
Frontend Module Architecture
The frontend is organised around business capabilities, not technical categories.
Each feature owns its complete implementation.
A feature may contain:
Components
Hooks
Services
Types
Utilities
Validation
Tests
Features should remain as independent as possible.
Shared functionality belongs in common libraries only when multiple business domains require it.
Application Structure
The application is divided into six major layers.
Application

│

├── Public Experience

├── Authentication

├── Dashboard

├── Career Workspace

├── Shared Experiences

└── Platform Infrastructure

Each layer serves a different user journey.
Responsibilities must never overlap.
Public Experience
Purpose:
Acquire users.
Contains:
Landing Page
Features
Pricing
About
Blog
Documentation
Contact
No authenticated functionality should exist inside this layer.
Authentication Layer
Purpose:
Identity.
Contains:
Login
Signup
Email Verification
Forgot Password
Session Recovery
Authentication should only determine identity.
Permissions are handled separately.
Dashboard Layer
Purpose:
Career Operating System.
The dashboard is the primary workspace.
Every visit should immediately answer:
Where am I today?
What should I do next?
What changed?
What deserves my attention?
Everything displayed on the dashboard must contribute to answering one of these four questions.
Career Workspace
Contains the user's long-term professional information.
Examples:
Resume
Career Profile
Career Intelligence
Missions
Achievements
Progress
Career Timeline
Recommendations
This workspace represents the user's professional operating system.
Shared Experiences
Responsible for public content.
Examples:
Career Cards
Shared Progress
Public Profiles
Achievement Pages
Shared experiences should never expose sensitive information.
Platform Infrastructure
Contains platform-wide experiences.
Examples:
Notifications
Settings
Billing
Help
Feedback
System Status
Infrastructure supports the product without becoming the product.
Routing Philosophy
Routes represent business capabilities.
Examples:
/dashboard

/profile

/resume

/career

/missions

/progress

/settings

/share

Avoid deeply nested routes unless hierarchy genuinely exists.
URLs should remain readable and predictable.
Layout Architecture
SkillMint uses four permanent layouts.
Public Layout
Used for acquisition pages.
Characteristics:
Marketing Navigation
Footer
SEO Optimised
Fast Loading
Authentication Layout
Purpose:
Remove distractions.
Only identity-related actions should exist.
Dashboard Layout
Persistent application shell.
Contains:
Sidebar
Top Navigation
Workspace
Notification Centre
User Menu
Only the workspace changes between pages.
The shell remains stable.
Minimal Layout
Used for:
Public Career Cards
Shared Reports
Embedded Views
Minimal layouts maximise readability.
Component Architecture
Components follow a layered hierarchy.
UI Primitives

↓

Shared Components

↓

Feature Components

↓

Page Components

↓

Layouts
Each layer depends only on layers beneath it.
Lower layers must never depend on higher layers.
Component Responsibilities
UI Primitives
Pure presentation.
No business knowledge.
Reusable everywhere.
Shared Components
Reusable application building blocks.
Examples:
Cards
Charts
Tables
Dialogs
Empty States
Business logic is prohibited.
Feature Components
Feature-specific behaviour.
Examples:
Career IQ Card
Mission Card
Recruiter Confidence Widget
Resume Timeline
These components understand business concepts.
Page Components
Responsible for composing features into complete pages.
Pages orchestrate.
They do not calculate.
Rendering Strategy
Rendering follows three principles.
Server First
Use server rendering whenever possible.
Client Only When Necessary
Client rendering is reserved for:
Animations
Forms
Live interaction
Drag & Drop
Real-time updates
Progressive Hydration
Only interactive regions should hydrate.
Static content should remain static.
Backend Architecture
The backend is the authoritative source of business truth.
Clients never perform business calculations.
The backend owns:
Authentication
Authorisation
Resume Processing
Career Intelligence
Recommendation Generation
Mission Generation
Achievement Evaluation
Notifications
Analytics
Backend Module Structure
Business capabilities become services.
Examples:
Authentication Service

Resume Service

Career Intelligence Service

Decision Service

Mission Service

Achievement Service

Notification Service

Analytics Service

Each service owns one business domain.
Service Principles
Every service should:
Own one responsibility.
Be independently testable.
Expose a clear interface.
Avoid hidden dependencies.
Remain replaceable without affecting unrelated services.
Request Lifecycle
Every request follows a consistent lifecycle.
Client

↓

Authentication

↓

Authorization

↓

Validation

↓

Business Service

↓

Database / Intelligence

↓

Response Builder

↓

Client

AI participates only when required.
Ordinary requests should never invoke language models unnecessarily.
Validation Strategy
Validation occurs before business logic.
Every request should verify:
Authentication
Permissions
Input Schema
Business Constraints
Only valid requests enter business services.
Error Philosophy
Errors should be:
Predictable
Actionable
Human-readable
Logged
Users should always understand:
What happened
Why it happened (when appropriate)
What they can do next
Technical stack traces should never be exposed.

Platform Architecture
The platform layer provides shared infrastructure that supports every business capability.
Unlike business services, platform services do not contain product-specific logic.
They provide reusable system capabilities required by multiple domains.
Examples include:
Authentication
Authorization
Storage
File Processing
Notifications
Logging
Configuration
Business services depend on the platform.
The platform never depends on business services.
Authentication Architecture
Authentication answers one question:
Who is this user?
It does not answer:
What can this user do?
Identity and permissions remain separate responsibilities.
Authentication Provider
SkillMint currently uses Supabase Authentication.
The authentication provider is considered an implementation detail rather than an architectural dependency.
Future providers may replace it without requiring changes to business services.
Authentication Methods
Supported authentication methods include:
Email & Password
Google OAuth
GitHub OAuth
Future providers may be added without affecting application architecture.
Session Management
Every authenticated request must include a valid session.
Unauthenticated users may only access explicitly public resources.
Expired sessions should never reach business services.
Session validation occurs before authorization.
Authorization Architecture
Authorization answers:
Is this user allowed to perform this action?
Permissions should never be determined on the client.
The server is the only authoritative source of permissions.
Current Roles
Only three permanent roles currently exist.
Guest

↓

Member

↓

Administrator
Additional roles should only be introduced when corresponding products exist.
Architecture should never anticipate products that have not yet been built.
Permission Principles
Permissions should always be:
Explicit
Predictable
Auditable
Server-enforced
Every protected resource should define who may:
View
Create
Update
Delete
Share
Storage Architecture
Storage exists for binary assets.
Structured information belongs inside the database.
Examples of stored assets include:
Resume PDFs
Generated Career Cards
Profile Images
Public Share Images
Generated Reports
Storage should never become a secondary database.
Resume Versioning
Every uploaded resume creates a new immutable version.
Example
Resume v1

↓

Resume v2

↓

Resume v3
Previous versions remain accessible for historical comparison.
Historical career progression is one of SkillMint's competitive advantages.
No uploaded resume should ever be overwritten.
File Processing Pipeline
Uploaded files follow a predictable processing pipeline.
Upload

↓

Virus Validation

↓

Storage

↓

Resume Parsing

↓

Structured Profile

↓

Career Intelligence

↓

Recommendations
Each stage owns one responsibility.
Pipeline failures should be recoverable without requiring another upload.
Configuration Management
Configuration should never be hardcoded.
Environment-specific configuration includes:
API Keys
Database Connections
Authentication Secrets
Feature Flags
Deployment Configuration
Business logic must never depend directly on environment variables.
Configuration should be accessed through centralized configuration services.
Secrets Management
Sensitive values must never exist inside:
source code
repositories
frontend bundles
documentation
Secrets are loaded securely during runtime.
Secrets should always be rotatable.
Notification Infrastructure
Notifications are platform capabilities.
Business services emit events.
The notification system determines:
delivery method
timing
formatting
Supported notification channels include:
In-App
Email
Future channels may include:
SMS
Push Notifications
Slack
WhatsApp
Business services should never know how notifications are delivered.
Event Philosophy
Business services communicate using events whenever practical.
Examples
Resume Uploaded

↓

Resume Parsed

↓

Career Analysis Completed

↓

Mission Generated

↓

Achievement Unlocked
Loose coupling improves scalability and maintainability.
Logging Principles
Every meaningful system event should generate structured logs.
Examples include:
Login
Logout
Resume Upload
AI Request
Payment
Mission Completion
Recommendation Acceptance
Critical Errors
Logs should support both debugging and business analytics.
Monitoring Philosophy
Monitoring exists to discover problems before users report them.
The platform should continuously monitor:
Availability
Performance
Error Rates
Background Jobs
AI Latency
Storage Failures
Database Health
Monitoring should support proactive engineering rather than reactive maintenance.
Platform Design Principles
The platform should remain:
Reliable
Observable
Secure
Replaceable
Independent
Business services should continue functioning even if individual infrastructure providers are replaced.

Database Philosophy
The database is the permanent memory of SkillMint.
Artificial Intelligence reasons.
The database remembers.
Every important business event should exist as structured data rather than embedded inside prompts or temporary application state.
Historical information is considered a strategic asset.
Nothing important should be lost.
Database Design Principles
The database should satisfy the following principles.
Business First
Tables represent business entities.
Never UI screens.
Version Everything Important
Career growth is longitudinal.
Historical progression is more valuable than isolated snapshots.
Important entities should preserve history whenever practical.
Examples include:
Resume Versions
Career Scores
Recommendations
Missions
Achievements
Explicit Relationships
Relationships should be obvious.
Business rules should never depend on hidden assumptions.
Auditability
Every important business decision should be traceable.
A recommendation should always answer:
Why was it generated?
Which evidence supported it?
When was it generated?
Intelligence Architecture
Artificial Intelligence is one component of SkillMint.
It is not the product.
SkillMint's competitive advantage comes from combining deterministic systems with explainable reasoning.
Intelligence Pipeline
Every career analysis follows the same progression.
Resume

↓

Resume Parsing

↓

Feature Extraction

↓

Deterministic Intelligence

↓

LLM Reasoning

↓

Decision Engine

↓

Recommendations

↓

User
This sequence is permanent.
Language models should never replace deterministic calculations that can be reproduced reliably.
Deterministic Intelligence
Deterministic intelligence calculates measurable facts.
Examples include:
Resume completeness
Keyword coverage
Skills identified
Experience duration
Project count
Education quality signals
Portfolio availability
Profile completeness
These calculations should always produce identical results for identical inputs.
LLM Reasoning
The language model is responsible for interpretation rather than calculation.
Its responsibilities include:
Explaining scores
Identifying career risks
Prioritising recommendations
Generating actionable advice
Personalising guidance
Communicating trade-offs
The model should never fabricate evidence.
Every conclusion should be supported by structured information.
Explainability
Every recommendation generated by SkillMint must answer four questions.
What happened?

↓

Why does it matter?

↓

How confident are we?

↓

What should the user do next?
Users should never receive unexplained scores.
Trust is built through transparency.
Performance Philosophy
Performance is a product feature.
Users should never feel that the system is slow because of unnecessary engineering complexity.
Optimisation should focus on perceived responsiveness before raw benchmarks.
Engineering Targets
The platform should continuously strive for:
Fast initial page rendering
Responsive interactions
Progressive loading
Background processing for expensive work
Minimal unnecessary network requests
Performance goals should be reviewed as the product evolves rather than treated as fixed numbers.
Security Philosophy
Security is designed into the system rather than added afterwards.
Every request should assume zero trust.
Every action should require explicit verification.
Every permission should be enforced on the server.
Security Principles
The platform should protect:
Identity
Personal Information
Uploaded Documents
Career History
Payment Information
AI Results
Security decisions should favour protecting user trust over engineering convenience.
Observability
A production system must explain itself.
Every important system event should be observable through logs, metrics or traces.
Monitoring should enable engineers to answer:
What happened?
Why did it happen?
Who was affected?
How often does it happen?
without reproducing the issue manually.
Deployment Philosophy
Deployment should be predictable.
Every release should be repeatable.
No engineer should rely on undocumented manual steps.
The deployment process should be automated as the platform matures.
Continuous Integration
Every contribution should automatically verify:
Formatting
Type Safety
Linting
Unit Tests
Build Success
Broken code should never reach production.
Continuous Delivery
Deployments should be:
Incremental
Reversible
Observable
Every deployment should include a rollback strategy.
Recovery should always be faster than rebuilding.
Coding Standards
SkillMint values readability over cleverness.
Code should optimise for future engineers rather than present authors.
Every engineer should prefer:
Small functions
Explicit naming
Strong typing
Minimal duplication
Clear boundaries
Comprehensive documentation for public interfaces
The simplest correct solution is usually the preferred solution.
Definition of Done
A feature is complete only when all of the following are true.
Product
Product requirements satisfied
User Experience
UX requirements satisfied
Accessibility requirements satisfied
Engineering
Architecture respected
Business rules documented
Code reviewed
Tests passing
No critical technical debt introduced
Operations
Logging implemented
Monitoring supported
Documentation updated
Implementation alone does not constitute completion.
Engineering Principles
Every engineer contributing to SkillMint should internalise the following principles.
Product before technology.
Architecture before implementation.
Simplicity before cleverness.
Deterministic systems before AI.
Explainability before automation.
Long-term maintainability before short-term speed.
User trust before feature quantity.
Documentation before assumptions.
These principles are considered permanent unless the company intentionally changes its engineering philosophy.
Future Expansion
The architecture intentionally supports future products without requiring structural redesign.
Examples include:
Mobile Applications
Browser Extension
Recruiter Workspace
University Workspace
Career Coach Workspace
Enterprise Platform
Public Developer API
Future products should extend existing business engines rather than introducing competing architectures.
Final Statement
Engineering architecture is not a collection of technical decisions.
It is the operational expression of the company's philosophy.
Every line of code written for SkillMint should ultimately reinforce one objective:
Help people make better career decisions through honest, explainable intelligence.