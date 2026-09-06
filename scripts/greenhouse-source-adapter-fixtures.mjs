import assert from "node:assert/strict";
import { fetchGreenhouseJobs, normalizeGreenhouseJob } from "./experiments/greenhouse-source-adapter.mjs";

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

console.log("Greenhouse source adapter fixtures passed.");
