import { readFile } from "node:fs/promises";

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

async function addEventCounter(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    Object.defineProperty(globalThis, "__syntheticFeedbackEvents", {
      value: { count: 0, hasDetail: false },
      configurable: true,
    });
    window.addEventListener("skillmint:workspace-updated", (event) => {
      const state = (globalThis as typeof globalThis & {
        __syntheticFeedbackEvents: { count: number; hasDetail: boolean };
      }).__syntheticFeedbackEvents;
      state.count += 1;
      state.hasDetail ||= "detail" in event && (event as CustomEvent).detail !== undefined;
    });
  });
}

async function eventCounter(page: import("@playwright/test").Page) {
  return page.evaluate(() => ({
    ...(globalThis as typeof globalThis & {
      __syntheticFeedbackEvents: { count: number; hasDetail: boolean };
    }).__syntheticFeedbackEvents,
  }));
}

async function openFeedback(page: import("@playwright/test").Page, message: string) {
  const trigger = page.getByRole("button", { name: "Feedback", exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.getByPlaceholder("What felt broken, confusing, or useful?").fill(message);
  return page.getByRole("button", { name: "Send feedback" });
}

test("signed-out feedback writes one anonymous record and one payload-free event", async ({ page, provider }) => {
  await page.goto("/settings/data");
  await addEventCounter(page);
  const submit = await openFeedback(page, "Synthetic signed-out feedback");
  await submit.click();
  const status = page.getByRole("status").filter({ hasText: /saved in this browser/i });
  await expect(status).toBeVisible();
  await expect(page.getByPlaceholder("What felt broken, confusing, or useful?")).toHaveValue("");
  expect(provider.count("feedback:insert")).toBe(0);
  expect(await eventCounter(page)).toEqual({ count: 1, hasDetail: false });
  const raw = await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"));
  expect(raw).toContain("Synthetic signed-out feedback");
  expect(raw).not.toContain("syncError");
});

test("@critical provider feedback success never enters browser fallback", async ({ page, provider }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await addEventCounter(page);
  const submit = await openFeedback(page, "Synthetic provider success");
  await submit.click();
  await expect(page.getByRole("status").filter({ hasText: /saved to your account/i })).toBeVisible();
  expect(provider.count("feedback:insert", ACCOUNT_A.id)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"))).toBeNull();
  expect(await eventCounter(page)).toEqual({ count: 0, hasDetail: false });
});

test("@critical provider failure falls back only to captured account with one event", async ({ page, provider }) => {
  provider.feedbackMode = "reject";
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await addEventCounter(page);
  const submit = await openFeedback(page, "Synthetic fallback feedback");
  await submit.click();
  await expect(page.getByRole("status").filter({ hasText: /saved in this browser/i })).toBeVisible();
  await expect(page.getByText("RAW_SYNTHETIC_PROVIDER_SECRET")).toHaveCount(0);
  expect(provider.count("feedback:insert", ACCOUNT_A.id)).toBe(1);
  expect(await eventCounter(page)).toEqual({ count: 1, hasDetail: false });
  const raw = await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"));
  expect(raw).toContain(ACCOUNT_A.id);
  expect(raw).not.toContain(ACCOUNT_B.id);
  expect(raw).not.toContain("RAW_SYNTHETIC_PROVIDER_SECRET");
});

test("provider and browser dual failure preserves same-owner draft and emits no event", async ({ page, provider }) => {
  provider.feedbackMode = "reject";
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await addEventCounter(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "skillmint:beta-feedback") throw new Error("synthetic storage failure");
      return original.call(this, key, value);
    };
  });
  const submit = await openFeedback(page, "Preserve this synthetic draft");
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: /could not be saved to your account or this browser/i })).toBeVisible();
  await expect(page.getByPlaceholder("What felt broken, confusing, or useful?")).toHaveValue("Preserve this synthetic draft");
  expect(await eventCounter(page)).toEqual({ count: 0, hasDetail: false });
  expect(provider.count("feedback:insert", ACCOUNT_A.id)).toBe(1);
});

test("malformed provider success is rejected and safely falls back without raw data", async ({ page, provider }) => {
  provider.feedbackMode = "malformed";
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  const submit = await openFeedback(page, "Malformed response fallback");
  await submit.click();
  await expect(page.getByRole("status").filter({ hasText: /saved in this browser/i })).toBeVisible();
  const raw = await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"));
  expect(raw).toContain('"syncError":"invalid_response"');
  expect(raw).not.toContain('"id":"malformed"');
});

test("@critical @race A to B to A during provider request masks the old result and permits one new submission", async ({ page, context, provider }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  const [gate] = provider.holdNext("feedback:insert");
  const submit = await openFeedback(page, "Old Account A request");
  await submit.click();
  await provider.waitFor("feedback:insert", 1, ACCOUNT_A.id);
  await expect(page.locator("form[aria-busy='true']")).toBeVisible();
  await switchAccount(context, ACCOUNT_B);
  await expect(page.getByRole("dialog", { name: "Beta feedback" })).toHaveCount(0);
  await switchAccount(context, ACCOUNT_A);
  const newSubmit = await openFeedback(page, "New Account A request");
  await newSubmit.click();
  await expect(page.getByRole("status").filter({ hasText: /saved to your account/i })).toBeVisible();
  gate.release();
  await expect(page.getByPlaceholder("What felt broken, confusing, or useful?")).toHaveValue("");
  expect(provider.count("feedback:insert", ACCOUNT_A.id)).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"))).toBeNull();
});

test("@race navigation after feedback request starts prevents late UI publication", async ({ page, provider }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  const [gate] = provider.holdNext("feedback:insert");
  const submit = await openFeedback(page, "Navigate during feedback");
  await submit.click();
  await provider.waitFor("feedback:insert", 1, ACCOUNT_A.id);
  await page.goto("/privacy");
  gate.release();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByText(/saved to your SkillMint account/i)).toHaveCount(0);
});

test("corrupt feedback variants fail closed and unsafe operational fields stay out of export", async ({ page }) => {
  await page.goto("/settings/data");
  const duplicate = syntheticFeedback("duplicate", "duplicate");
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    anonymous: [duplicate, duplicate],
  }));
  await page.reload();
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page.getByPlaceholder("What felt broken, confusing, or useful?").fill("Must not overwrite corrupt data");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /corrupted and was not replaced/i })).toBeVisible();

  const unsafe = {
    ...syntheticFeedback("Safe exported feedback", "unsafe"),
    syncError: "RAW_SYNTHETIC_PROVIDER_SECRET",
    moderationStatus: "internal-only",
  };
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    anonymous: [unsafe],
  }));
  await page.reload();
  await page.getByRole("button", { name: "Download browser data" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /does not match its export contract/i })).toBeVisible();

  const supportedOperationalRecord = {
    ...unsafe,
    moderationStatus: undefined,
  };
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    anonymous: [supportedOperationalRecord],
  }));
  await page.reload();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download browser data" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const text = await readFile(path, "utf8");
  expect(text).toContain("Safe exported feedback");
  expect(text).not.toContain("RAW_SYNTHETIC_PROVIDER_SECRET");
  expect(text).not.toContain("syncError");
  expect(text).not.toContain("moderationStatus");
});
