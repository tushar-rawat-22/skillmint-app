import assert from "node:assert/strict";
import { explainJobFit } from "./experiments/explainable-job-fit.mjs";

const baseJob = {
  source: "greenhouse",
  sourceKey: "greenhouse:example:123",
  boardToken: "example",
  postingId: "123",
  companyName: "Example Co",
  title: "Frontend Engineer",
  originalApplyUrl: "https://boards.greenhouse.io/example/jobs/123",
  sourceUpdatedAt: "2026-09-07T10:00:00.000Z",
  fetchedAt: "2026-09-07T10:05:00.000Z",
  location: "Bengaluru, India",
  availability: "available",
  stale: false,
};

const requirements = [
  {
    id: "typescript",
    text: "Build production interfaces with TypeScript",
    importance: "required",
    evidenceTerms: ["TypeScript"],
  },
  {
    id: "testing",
    text: "Own component testing",
    importance: "required",
    evidenceTerms: ["component testing", "Playwright"],
  },
  {
    id: "apis",
    text: "Integrate frontend features with APIs",
    importance: "preferred",
    evidenceTerms: ["API integration", "REST API"],
  },
];

const resumeEvidence = [
  {
    id: "project-skillmint",
    label: "SkillMint project",
    text: "Built TypeScript interfaces and component testing for a career evidence product.",
  },
];

const result = explainJobFit({
  job: baseJob,
  requirements,
  resumeEvidence,
  targetRole: "Frontend Engineer",
});

assert.equal(result.ok, true);
assert.equal(result.result.job.originalApplyUrl, baseJob.originalApplyUrl);
assert.equal(result.result.job.source, "greenhouse");
assert.equal(result.result.summary.supportedCount, 2);
assert.equal(result.result.summary.notEvidencedCount, 1);
assert.equal(result.result.summary.totalRequirements, 3);
assert.equal(result.result.requirements[0].evidenceState, "supported_by_resume");
assert.equal(result.result.requirements[1].evidenceState, "supported_by_resume");
assert.equal(result.result.requirements[2].evidenceState, "not_evidenced_in_resume");
assert.match(result.result.disclaimer, /does not predict hiring/i);
assert.doesNotMatch(result.result.whyShown, /probability|chance|likely to be hired/i);

const unavailable = explainJobFit({
  job: { ...baseJob, availability: "stale", stale: true },
  requirements,
  resumeEvidence,
});
assert.deepEqual(unavailable, { ok: false, error: { kind: "job_unavailable" } });

const badApplyUrl = explainJobFit({
  job: { ...baseJob, originalApplyUrl: "javascript:alert(1)" },
  requirements,
  resumeEvidence,
});
assert.deepEqual(badApplyUrl, { ok: false, error: { kind: "invalid_apply_url" } });

const invalidRequirement = explainJobFit({
  job: baseJob,
  requirements: [{ id: "missing-terms", text: "A requirement", evidenceTerms: [] }],
  resumeEvidence,
});
assert.deepEqual(invalidRequirement, {
  ok: false,
  error: { kind: "invalid_requirement", requirementId: "missing-terms" },
});

const duplicateRequirement = explainJobFit({
  job: baseJob,
  requirements: [requirements[0], { ...requirements[0], text: "Duplicate" }],
  resumeEvidence,
});
assert.deepEqual(duplicateRequirement, {
  ok: false,
  error: { kind: "duplicate_requirement", requirementId: "typescript" },
});

const noEvidence = explainJobFit({
  job: baseJob,
  requirements,
  resumeEvidence: [],
});
assert.equal(noEvidence.ok, true);
assert.equal(noEvidence.result.summary.supportedCount, 0);
assert.equal(noEvidence.result.summary.notEvidencedCount, 3);
assert.match(noEvidence.result.whyShown, /review the gaps before applying/i);

console.log("explainable-job-fit fixtures: PASS");
