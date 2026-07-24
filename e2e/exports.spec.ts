import { readFile } from "node:fs/promises";
import type { Download } from "@playwright/test";

import {
  ACCOUNT_A,
  ACCOUNT_B,
  expect,
  login,
  ownerContainer,
  switchAccount,
  syntheticFeedback,
  test,
} from "./support/runtime";

async function downloadedJson(download: Download) {
  const path = await download.path();
  return JSON.parse(await readFile(path, "utf8"));
}

test("@critical account export download has exact current-account contract and no owner fields", async ({ page }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  const button = page.getByRole("button", { name: "Download account data" });
  await expect(button).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^skillmint-account-\d{4}-\d{2}-\d{2}\.json$/);
  const payload = await downloadedJson(download);
  expect(payload.exportVersion).toBe("skillmint-account-export-v2");
  expect(payload.source).toBe("account");
  expect(payload.accountScope).toBe("current_authenticated_account");
  expect(payload.data.profiles).toEqual([expect.objectContaining({
    email: ACCOUNT_A.email,
    target_role: "Synthetic engineer",
  })]);
  expect(JSON.stringify(payload)).not.toContain(ACCOUNT_A.id);
  expect(JSON.stringify(payload)).not.toContain(ACCOUNT_B.email);
  const accountStatus = page.getByRole("status").filter({ hasText: "Account download" });
  await expect(accountStatus).toContainText("Account download was requested. Check your browser’s downloads.");
  await expect(accountStatus).not.toContainText(/saved|completed/i);
});

test("@critical browser export includes visible A data and excludes hidden B data", async ({ page }) => {
  await login(page, ACCOUNT_A);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
    key: "skillmint:beta-feedback",
    raw: ownerContainer({ accounts: {
      [ACCOUNT_A.id]: [syntheticFeedback("Visible Account A browser feedback", "a")],
      [ACCOUNT_B.id]: [syntheticFeedback("Hidden Account B browser feedback", "b")],
    } }),
  });
  await page.goto("/settings/data");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download browser data" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^skillmint-browser-account-\d{4}-\d{2}-\d{2}\.json$/);
  const payload = await downloadedJson(download);
  expect(payload.manifest.exportVersion).toBe("skillmint-browser-export-v2");
  expect(payload.manifest.requestedOwnerScope).toBe("account");
  expect(JSON.stringify(payload)).toContain("Visible Account A browser feedback");
  expect(JSON.stringify(payload)).not.toContain("Hidden Account B browser feedback");
  expect(JSON.stringify(payload)).not.toContain(ACCOUNT_A.id);
  expect(JSON.stringify(payload)).not.toContain(ACCOUNT_B.id);
  await expect(page.getByText("Browser download was requested. Check your browser’s downloads.")).toBeVisible();
});

test("signed-out browser export is anonymous and requested-only", async ({ page }) => {
  await page.goto("/settings/data");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download browser data" }).click();
  const download = await downloadPromise;
  const payload = await downloadedJson(download);
  expect(payload.manifest.requestedOwnerScope).toBe("anonymous");
  expect(download.suggestedFilename()).toContain("browser-anonymous");
  const browserStatus = page.getByRole("status").filter({ hasText: "Browser download" });
  await expect(browserStatus).toContainText(/download was requested/i);
  await expect(browserStatus).not.toContainText(/download (?:was )?(?:saved|completed)/i);
});

test("count failure renders unavailable while a later account export remains eligible", async ({ page, provider }) => {
  await login(page, ACCOUNT_A);
  provider.countMode = "reject";
  await page.goto("/settings/data");
  await expect(
    page.getByRole("alert").filter({
      hasText: "Account data could not be reached. Please try again.",
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Unavailable").first()).toBeVisible();
  provider.countMode = "success";
  const button = page.getByRole("button", { name: "Download account data" });
  await expect(button).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  await downloadPromise;
  await expect(page.getByText(/Account download was requested/i)).toBeVisible();
});

test("provider-account mismatch and unsupported snapshots fail without download", async ({ page, provider }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await expect(page.locator("article").filter({ has: page.getByText("Profile", { exact: true }) })).toContainText("1");
  await expect(page.getByRole("button", { name: "Download account data" })).toBeEnabled();
  provider.overrideNextAuthUser(ACCOUNT_B.id);
  let downloads = 0;
  page.on("download", () => { downloads += 1; });
  await page.getByRole("button", { name: "Download account data" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "signed-in account changed" })).toBeVisible();
  expect(downloads).toBe(0);

  provider.careerSnapshotCount = 1;
  await page.getByRole("button", { name: "Download account data" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /not yet supported/i })).toBeVisible();
  expect(downloads).toBe(0);
});

test("@critical @race owner A to B to A during export blocks stale download and permits only the new A request", async ({ page, context, provider }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await expect(page.locator("article").filter({ has: page.getByText("Profile", { exact: true }) })).toContainText("1");
  await expect(page.getByRole("button", { name: "Download account data" })).toBeEnabled();
  const [gate] = provider.holdNext("auth:user");
  const authUserBaseline = provider.count("auth:user", ACCOUNT_A.id);
  let downloads = 0;
  page.on("download", () => { downloads += 1; });
  await page.getByRole("button", { name: "Download account data" }).click();
  await provider.waitFor("auth:user", authUserBaseline + 1, ACCOUNT_A.id);
  await switchAccount(context, ACCOUNT_B);
  await expect(page.getByText(ACCOUNT_B.email)).toBeVisible();
  await switchAccount(context, ACCOUNT_A);
  await expect(page.getByText(ACCOUNT_A.email)).toBeVisible();
  const newDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download account data" }).click();
  await newDownload;
  gate.release();
  await expect.poll(() => downloads).toBe(1);
  await expect(page.getByText(/Account download was requested/i)).toBeVisible();
});

test("@race navigation after account export starts blocks the download side effect", async ({ page, provider }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await expect(page.locator("article").filter({ has: page.getByText("Profile", { exact: true }) })).toContainText("1");
  await expect(page.getByRole("button", { name: "Download account data" })).toBeEnabled();
  const [gate] = provider.holdNext("auth:user");
  const authUserBaseline = provider.count("auth:user", ACCOUNT_A.id);
  let downloads = 0;
  page.on("download", () => { downloads += 1; });
  await page.getByRole("button", { name: "Download account data" }).click();
  await provider.waitFor("auth:user", authUserBaseline + 1, ACCOUNT_A.id);
  await page.goto("/privacy");
  gate.release();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect.poll(() => downloads).toBe(0);
});

test("@critical corrupt, future-version, and hidden browser storage remain fail-closed", async ({ page }) => {
  await login(page, ACCOUNT_A);
  await page.evaluate(() => localStorage.setItem("skillmint:beta-feedback", "{corrupt"));
  await page.goto("/settings/data");
  await expect(page.getByText("1 unreadable item.")).toBeVisible();
  await page.getByRole("button", { name: "Download browser data" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /corrupted/i })).toBeVisible();

  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    version: 99,
    accounts: { [ACCOUNT_A.id]: [syntheticFeedback("future", "future")] },
  }));
  await page.reload();
  await page.getByRole("button", { name: "Download browser data" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /unsupported storage version/i })).toBeVisible();

  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    accounts: { [ACCOUNT_B.id]: [syntheticFeedback("Hidden B", "hidden")] },
  }));
  await page.reload();
  await expect(page.getByText(/Other SkillMint account workspace data exists/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download browser data" }).click();
  const payload = await downloadedJson(await downloadPromise);
  expect(JSON.stringify(payload)).not.toContain("Hidden B");
});

test("browser-data mutation and page-local anchor failure produce no accepted download", async ({ page }) => {
  await page.goto("/settings/data");
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    anonymous: [syntheticFeedback("mutable", "mutable")],
  }));
  await page.reload();
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    let reads = 0;
    Storage.prototype.getItem = function (key: string) {
      const value = original.call(this, key);
      if (key !== "skillmint:beta-feedback") return value;
      reads += 1;
      if (reads === 2) return `${value} `;
      return value;
    };
  });
  await page.getByRole("button", { name: "Download browser data" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /changed during export/i })).toBeVisible();

  await page.reload();
  await page.evaluate(() => {
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) throw new Error("synthetic anchor failure");
      return original.call(this);
    };
  });
  await page.getByRole("button", { name: "Download browser data" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /could not start the download/i })).toBeVisible();
});
