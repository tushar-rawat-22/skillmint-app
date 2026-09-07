import assert from "node:assert/strict";
import {
  fetchGreenhouseJobs,
  normalizeGreenhouseJob,
  reconcileGreenhouseRefresh,
} from "./experiments/greenhouse-source-adapter.mjs";

const fetchedAt = "2026-09-07T00:00:00.000Z";

const complete = normalizeGreenhouseJob({
  boardToken: "example-board",
  fetchedAt,
  rawJob: {
    id: 123,
    title: "Software Engineer",
    absolute_url: "https://boards.greenhouse.io/example/jobs/123",
    company_name: "Example Co",
    updated_at: "2026-09-06T18:00:00Z",
    first_published: "2026-09-01T09:30:00Z",
    location: { name: "Bengaluru, India" },
    departments: [{ name: "Engineering" }],
    offices: [{ name: "Bengaluru" }],
  },
});
assert.equal(complete.ok, true);
assert.equal(complete.job.sourceKey, "greenhouse:example-board:123");
assert.equal(complete.job.originalApplyUrl, "https://boards.greenhouse.io/example/jobs/123");
assert.equal(complete.job.location, "Bengaluru, India");
assert.equal(complete.job.remote, null);
assert.equal(complete.job.salary, null);
assert.ok(complete.job.missingFields.includes("remote"));
assert.ok(complete.job.missingFields.includes("salary"));
assert.match(complete.job.contentHash, /^[a-f0-9]{64}$/);

const malformedTimestamp = normalizeGreenhouseJob({
  boardToken: "example-board",
  fetchedAt,
  rawJob: {
    id: "124",
    title: "Data Analyst",
    absolute_url: "https://boards.greenhouse.io/example/jobs/124",
    updated_at: "not-a-date",
  },
});
assert.equal(malformedTimestamp.ok, true);
assert.equal(malformedTimestamp.job.sourceUpdatedAt, null);
assert.ok(malformedTimestamp.job.missingFields.includes("sourceUpdatedAt"));
assert.equal(malformedTimestamp.job.companyName, null);

const invalid = normalizeGreenhouseJob({
  boardToken: "example-board",
  fetchedAt,
  rawJob: { id: 125, title: "", absolute_url: "javascript:alert(1)" },
});
assert.deepEqual(invalid, {
  ok: false,
  error: { kind: "invalid_job", postingId: "125", missing: ["title", "absolute_url"] },
});

const duplicateResult = await fetchGreenhouseJobs({
  boardToken: "example-board",
  fetchedAt,
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      jobs: [
        { id: 126, title: "Engineer", absolute_url: "https://example.com/jobs/126" },
        { id: 126, title: "Engineer", absolute_url: "https://example.com/jobs/126?duplicate=1" },
      ],
    }),
  }),
});
assert.equal(duplicateResult.ok, true);
assert.equal(duplicateResult.jobs.length, 1);
assert.deepEqual(duplicateResult.duplicateSourceKeys, ["greenhouse:example-board:126"]);

const unavailableResult = await fetchGreenhouseJobs({
  boardToken: "missing-board",
  fetchedAt,
  fetchImpl: async () => ({ ok: false, status: 404 }),
});
assert.deepEqual(unavailableResult, {
  ok: false,
  error: { kind: "source_unavailable", status: 404, message: "Greenhouse returned HTTP 404." },
});

const invalidPayload = await fetchGreenhouseJobs({
  boardToken: "example-board",
  fetchedAt,
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ nope: [] }) }),
});
assert.equal(invalidPayload.ok, false);
assert.equal(invalidPayload.error.kind, "invalid_payload");

const firstSnapshot = await fetchGreenhouseJobs({
  boardToken: "example-board",
  fetchedAt: "2026-09-07T01:00:00Z",
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      jobs: [
        { id: 201, title: "Frontend Engineer", absolute_url: "https://example.com/jobs/201" },
        { id: 202, title: "Backend Engineer", absolute_url: "https://example.com/jobs/202" },
      ],
    }),
  }),
});
const firstReconciliation = reconcileGreenhouseRefresh({ previousJobs: [], currentResult: firstSnapshot });
assert.equal(firstReconciliation.ok, true);
assert.equal(firstReconciliation.jobs.length, 2);
assert.equal(firstReconciliation.jobs[0].availability, "available");
assert.equal(firstReconciliation.jobs[0].stale, false);
assert.equal(firstReconciliation.jobs[0].firstSeenAt, "2026-09-07T01:00:00.000Z");

const secondSnapshot = await fetchGreenhouseJobs({
  boardToken: "example-board",
  fetchedAt: "2026-09-07T02:00:00Z",
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      jobs: [{ id: 201, title: "Frontend Engineer II", absolute_url: "https://example.com/jobs/201" }],
    }),
  }),
});
const secondReconciliation = reconcileGreenhouseRefresh({
  previousJobs: firstReconciliation.jobs,
  currentResult: secondSnapshot,
});
assert.equal(secondReconciliation.ok, true);
const stillAvailable = secondReconciliation.jobs.find((job) => job.postingId === "201");
const disappeared = secondReconciliation.jobs.find((job) => job.postingId === "202");
assert.equal(stillAvailable.availability, "available");
assert.equal(stillAvailable.stale, false);
assert.equal(stillAvailable.firstSeenAt, "2026-09-07T01:00:00.000Z");
assert.equal(disappeared.availability, "stale");
assert.equal(disappeared.stale, true);
assert.equal(disappeared.closedAt, null);

const failedRefresh = reconcileGreenhouseRefresh({
  previousJobs: secondReconciliation.jobs,
  currentResult: { ok: false, error: { kind: "network_error", message: "offline" } },
});
assert.equal(failedRefresh.ok, false);
assert.deepEqual(failedRefresh.jobs, secondReconciliation.jobs);
assert.equal(failedRefresh.jobs.find((job) => job.postingId === "201").availability, "available");

const thirdSnapshot = await fetchGreenhouseJobs({
  boardToken: "example-board",
  fetchedAt: "2026-09-07T03:00:00Z",
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      jobs: [
        { id: 201, title: "Frontend Engineer II", absolute_url: "https://example.com/jobs/201" },
        { id: 202, title: "Backend Engineer", absolute_url: "https://example.com/jobs/202" },
      ],
    }),
  }),
});
const reappeared = reconcileGreenhouseRefresh({
  previousJobs: secondReconciliation.jobs,
  currentResult: thirdSnapshot,
});
assert.equal(reappeared.ok, true);
const restored = reappeared.jobs.find((job) => job.postingId === "202");
assert.equal(restored.availability, "available");
assert.equal(restored.stale, false);
assert.equal(restored.firstSeenAt, "2026-09-07T01:00:00.000Z");

const duplicatePrevious = reconcileGreenhouseRefresh({
  previousJobs: [firstReconciliation.jobs[0], firstReconciliation.jobs[0]],
  currentResult: secondSnapshot,
});
assert.equal(duplicatePrevious.ok, false);
assert.equal(duplicatePrevious.error.kind, "duplicate_previous_source_key");

console.log("Greenhouse source adapter fixtures passed.");
