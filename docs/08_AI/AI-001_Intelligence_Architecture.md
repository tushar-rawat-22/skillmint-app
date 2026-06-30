# AI-001 — SkillMint Intelligence Architecture

**Document ID:** AI-001

**Version:** 1.0

**Status:** Draft

**Owner:** AI Platform

---

# Purpose

This document defines how intelligence is created inside SkillMint.

It does not define prompts.

It defines reasoning.

Its purpose is to explain how SkillMint transforms raw career information into trustworthy, explainable career decisions.

Every AI feature built inside SkillMint should follow the principles described here.

---

# Intelligence Philosophy

Artificial Intelligence is not the product.

Career intelligence is the product.

Language models are tools used by the intelligence system.

SkillMint's competitive advantage comes from combining deterministic algorithms, structured career knowledge and explainable reasoning.

The objective is not to impress users with AI.

The objective is to help users make better career decisions.

---

# Intelligence Principles

Every intelligence decision should satisfy the following principles.

## Honest

SkillMint should never inflate scores to make users feel better.

Improvement begins with accurate assessment.

False encouragement destroys trust.

---

## Explainable

Every recommendation must explain:

- What was observed.
- Why it matters.
- How confident the system is.
- What the user should do next.

No recommendation should appear without evidence.

---

## Deterministic First

Whenever information can be calculated through rules, it should never be delegated to an LLM.

Examples include:

- Resume completeness
- Experience duration
- Skill frequency
- ATS keyword coverage
- Missing sections

These calculations must always produce identical outputs for identical inputs.

---

## AI Second

Language models are responsible for reasoning rather than calculation.

They transform structured evidence into understandable career advice.

They should never invent evidence.

---

## User Growth

SkillMint exists to maximise long-term career growth.

Recommendations should optimise for future outcomes rather than immediate satisfaction.

The system should prioritise uncomfortable truths over comforting generalisations whenever evidence supports them.

---

# Intelligence Pipeline

Every career assessment follows the same pipeline.

```text
User

↓

Resume

↓

Resume Parsing

↓

Structured Career Profile

↓

Deterministic Analysis

↓

Career Assessment

↓

Reasoning Layer

↓

Decision Engine

↓

Recommendations

↓

Growth System
```

Every stage owns one responsibility.

Outputs from one stage become inputs for the next.

No stage should perform multiple unrelated tasks.

---

# Intelligence Layers

The SkillMint intelligence platform is divided into five permanent layers.

## Layer 1

Data Collection

Collects structured information.

Sources include:

- Resume
- Profile
- User Actions
- Career History

---

## Layer 2

Feature Extraction

Transforms raw information into structured career signals.

Examples:

- Skills
- Seniority
- Experience
- Domains
- Education
- Leadership
- Portfolio

---

## Layer 3

Deterministic Intelligence

Calculates measurable metrics.

No language model participates here.

---

## Layer 4

Reasoning Engine

Interprets deterministic evidence.

Generates explanations.

Prioritises opportunities.

Identifies risks.

Produces actionable insights.

---

## Layer 5

Decision Engine

Selects the highest-value next action.

The Decision Engine determines what the user should focus on next.

It is the heart of SkillMint.

---

# Success Criteria

The intelligence architecture is considered successful when:

- Every AI decision is explainable.
- Deterministic calculations remain reproducible.
- Recommendations improve career outcomes.
- Users understand why they received advice.
- Intelligence becomes more valuable as career history grows.

This document defines architecture.

Scoring engines and recommendation systems are defined in subsequent sections.

---

# Intelligence Engines

SkillMint's intelligence is composed of specialised engines.

Each engine owns one measurable responsibility.

Engines communicate through structured outputs rather than hidden prompt chaining.

Every engine should be independently testable.

---

# Career IQ Engine

Career IQ is SkillMint's primary career health metric.

It measures the overall strength of a user's professional profile.

Career IQ is not a resume score.

It is a career score.

The engine evaluates multiple dimensions simultaneously.

Dimensions include:

- Profile Completeness
- Professional Experience
- Technical Skills
- Projects
- Education
- Certifications
- Portfolio Strength
- Career Progression
- Professional Credibility

Career IQ is expressed as a score from 0–100.

The score is deterministic.

The explanation is AI-generated.

---

# ATS Compatibility Engine

This engine evaluates how well a resume performs against modern Applicant Tracking Systems.

Evaluation dimensions include:

- Section Structure
- Keyword Coverage
- Formatting
- Readability
- Contact Information
- Experience Formatting
- Skills Visibility
- ATS Parsing Reliability

The objective is compatibility rather than keyword stuffing.

---

# Recruiter Confidence Engine

This engine estimates how confident a recruiter would feel when shortlisting the candidate.

Unlike ATS Compatibility, this engine focuses on human perception.

Signals include:

- Career consistency
- Achievement quality
- Leadership
- Professional impact
- Project credibility
- Resume clarity
- Career progression
- Supporting evidence

This metric intentionally rewards credibility over quantity.

---

# Salary Intelligence Engine

Salary Intelligence estimates the user's current market value.

The estimate considers:

- Experience
- Skills
- Geography
- Industry
- Seniority
- Technology stack
- Career trajectory

Salary estimates should always include confidence levels rather than false precision.

---

# Career DNA Engine

Career DNA identifies behavioural career patterns.

It attempts to answer:

- What kind of professional is this?
- Where are they strongest?
- Which environments suit them?
- Which careers naturally fit them?

Career DNA is descriptive rather than predictive.

It should never restrict future career choices.

---

# Career Momentum Engine

Momentum measures improvement velocity.

A user with a lower Career IQ but rapid improvement may have higher momentum than someone with a stagnant profile.

Momentum considers:

- Skill acquisition
- Mission completion
- Resume improvement
- Project additions
- Achievement frequency
- Learning consistency

Momentum encourages continuous growth rather than perfection.

---

# Career Risk Engine

Career Risk identifies threats that may reduce employability.

Examples include:

- Outdated technologies
- Long employment gaps
- Missing portfolio
- Weak project evidence
- Poor ATS compatibility
- Low recruiter confidence
- Missing certifications

The objective is prevention rather than punishment.

---

# Career Potential Engine

Potential estimates future career upside.

Potential considers:

- Learning velocity
- Adaptability
- Career momentum
- Skill diversity
- Market demand
- Evidence of growth

Potential should never be confused with current ability.

---

# Intelligence Hierarchy

The engines operate together.

```text
Career Profile

↓

Career IQ

↓

Specialised Engines

├── ATS

├── Recruiter Confidence

├── Salary Intelligence

├── Career DNA

├── Career Momentum

├── Career Risk

└── Career Potential
```

No engine should directly modify another engine's score.

Each produces independent evidence.

---

# Career Assessment

A Career Assessment represents the complete output generated after an intelligence run.

Every assessment contains:

- Career IQ
- ATS Compatibility
- Recruiter Confidence
- Salary Intelligence
- Career DNA
- Career Momentum
- Career Risk
- Career Potential

A Career Assessment is immutable.

Every new assessment creates a new historical record.

---

# Assessment Philosophy

SkillMint evaluates careers rather than resumes.

Resumes are evidence.

Career Assessments are conclusions.

Every recommendation should originate from the latest Career Assessment.

---

# Decision Engine

The Decision Engine transforms intelligence into prioritised actions.

Its responsibility is simple:

Determine the highest-value next action.

The Decision Engine does not generate explanations.

It selects priorities.

Examples include:

- Build portfolio
- Improve ATS compatibility
- Add measurable achievements
- Learn a high-demand skill
- Complete a certification
- Improve LinkedIn profile

Only one recommendation should be marked as the user's highest priority.

---

# Priority Philosophy

Recommendations should maximise career return on investment.

Small improvements with high impact should be prioritised over large improvements with minimal impact.

The Decision Engine should optimise for:

- Career growth
- Employability
- Recruiter confidence
- Long-term earning potential

---

# Recommendation Engine

The Recommendation Engine converts priorities into actionable guidance.

Every recommendation must satisfy four requirements.

## Observable

The recommendation must originate from measurable evidence.

---

## Actionable

The user must be capable of acting on it.

Avoid vague advice.

Poor example:

Improve your resume.

Better example:

Replace responsibility-focused bullet points with measurable achievements.

---

## Prioritised

Recommendations are ranked by expected impact.

Higher-impact actions appear before lower-impact improvements.

---

## Measurable

Completion should be objectively verifiable whenever possible.

---

# Recommendation Lifecycle

Every recommendation progresses through a fixed lifecycle.

```text
Generated

↓

Presented

↓

Accepted

↓

In Progress

↓

Completed

↓

Reassessed
```

Recommendations should never disappear without explanation.

---

# Explainability Model

Every recommendation answers four questions.

1.

What did we observe?

2.

Why does it matter?

3.

How much does it affect your career?

4.

What should you do next?

SkillMint should never ask users to blindly trust AI.

---

# Confidence System

Every AI conclusion includes a confidence score.

Confidence reflects evidence quality rather than model certainty.

Factors include:

- Data completeness
- Resume quality
- Career history
- Supporting evidence
- Deterministic agreement

Low-confidence conclusions should be communicated cautiously.

---

# Hallucination Prevention

SkillMint should minimise hallucinations by enforcing strict reasoning rules.

The AI may only:

- Explain structured evidence.
- Prioritise improvements.
- Personalise recommendations.

The AI must never:

- Invent experience.
- Invent achievements.
- Guess missing information.
- Fabricate salary data.
- Create unsupported claims.

---

# Human Trust Principles

SkillMint earns trust through consistency rather than optimism.

Users should always receive:

- Honest assessments
- Evidence-based reasoning
- Practical actions
- Transparent confidence

Truth is considered more valuable than reassurance.

---

# Learning Loop

Every completed recommendation becomes new evidence.

The intelligence system continuously improves through user progress.

```text
Career Assessment

↓

Recommendation

↓

User Action

↓

Career Improvement

↓

New Career Assessment
```

SkillMint is designed as a continuous improvement system rather than a one-time analysis tool.

---

# AI Success Criteria

The intelligence platform is successful when:

- Users understand every score.
- Recommendations lead to measurable improvement.
- Career Assessments become more accurate over time.
- Trust increases after repeated use.
- Users rely on SkillMint for ongoing career decisions rather than isolated resume reviews.

---

# Model Abstraction Layer

SkillMint should never depend on a single Large Language Model provider.

The intelligence platform communicates with an abstraction layer rather than directly with individual vendors.

Benefits include:

- Provider independence
- Cost optimisation
- Easier experimentation
- Better reliability
- Future model support

Supported providers may include:

- OpenAI
- Anthropic
- Google
- Local models

Changing providers should never require changes to business logic.

---

# Prompt Orchestration

Prompts are implementation details.

Business services communicate with the Intelligence Platform through structured requests.

Every AI request should contain:

- Objective
- Structured evidence
- Expected output schema
- Confidence requirements
- Validation rules

Prompt templates should be versioned independently from application code.

---

# AI Safety Principles

The intelligence platform must follow strict safety rules.

The AI must never:

- Invent user achievements.
- Fabricate work experience.
- Guess missing information.
- Produce unsupported salary figures.
- Claim certainty where evidence is insufficient.

When evidence is incomplete, the system should acknowledge uncertainty rather than generate confident speculation.

---

# Cost Optimisation

Language models are expensive.

The platform should minimise unnecessary inference.

Strategies include:

- Cache deterministic calculations.
- Reuse structured career features.
- Generate recommendations only when inputs change.
- Avoid repeated analyses for identical career states.
- Prefer deterministic engines whenever possible.

LLMs should be reserved for reasoning, explanation and prioritisation.

---

# Intelligence Evaluation

Every intelligence engine should be continuously evaluated.

Evaluation dimensions include:

## Accuracy

Are deterministic calculations correct?

## Explainability

Can every recommendation be traced back to evidence?

## Actionability

Can the user realistically complete the recommendation?

## Outcome

Did following the recommendation improve future Career Assessments?

The objective is not to maximise model performance.

The objective is to maximise user career growth.

---

# Future Intelligence

The architecture supports future intelligence capabilities including:

- Interview preparation
- Career path simulation
- Skill-gap forecasting
- Market trend analysis
- Personal learning plans
- Recruiter matching
- Company fit analysis

These capabilities should extend the existing intelligence platform rather than introducing independent AI systems.

---

# Final Principles

Every intelligence feature built for SkillMint should satisfy the following principles.

1. Truth before optimism.
2. Evidence before opinion.
3. Deterministic calculation before AI reasoning.
4. Explainability before automation.
5. Career growth before engagement.
6. Long-term trust before short-term delight.

These principles define SkillMint's intelligence philosophy.

---

# Final Statement

SkillMint is not an AI chatbot.

It is a Career Intelligence Platform.

Artificial Intelligence exists to transform structured career evidence into honest, explainable and actionable career guidance.

The user's trust is the platform's most valuable asset.

Every intelligence decision should strengthen that trust.

---

# Document Status

Status: 🟢 Frozen

Version: 1.0
