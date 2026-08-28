import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

test("@critical candidate public entry keeps the evidence loop ahead of privacy detail", () => {
  const candidatePage = fs.readFileSync(
    path.join(process.cwd(), "src/app/candidates/page.tsx"),
    "utf8",
  );

  for (const phrase of [
    "Synthetic example",
    "See the evidence before the score.",
    "Strongest support",
    "Main evidence gap",
    "Best next move",
    "After re-analysis",
    "See the full evidence loop",
  ]) {
    expect(candidatePage).toContain(phrase);
  }

  expect(candidatePage.indexOf("candidate-preview-title")).toBeLessThan(
    candidatePage.indexOf("candidate-privacy-title"),
  );
  expect(candidatePage).not.toMatch(
    /recruiter confidence|hire probability|shortlist probability|salary guarantee/i,
  );
});
