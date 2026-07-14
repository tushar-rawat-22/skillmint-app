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

const FEEDBACK_KEY = "skillmint:beta-feedback";

async function observeWorkspaceEvents(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const state = { custom: 0, storage: 0, customHasDetail: false };
    Object.defineProperty(globalThis, "__syntheticWorkspaceEvents", {
      value: state,
      configurable: true,
    });
    window.addEventListener("skillmint:workspace-updated", (event) => {
      state.custom += 1;
      state.customHasDetail ||= "detail" in event && (event as CustomEvent).detail !== undefined;
    });
    window.addEventListener("storage", () => { state.storage += 1; });
  });
}

async function workspaceEvents(page: import("@playwright/test").Page) {
  return page.evaluate(() => ({
    ...(globalThis as typeof globalThis & {
      __syntheticWorkspaceEvents: { custom: number; storage: number; customHasDetail: boolean };
    }).__syntheticWorkspaceEvents,
  }));
}

test("global storage unavailability is one unavailable state, not twelve corrupt records", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new Error("synthetic unavailable storage"); },
    });
  });
  await page.goto("/settings/data");
  const browserCard = page.locator("article").filter({
    has: page.getByText("This browser", { exact: true }),
  }).first();
  await expect(browserCard).toContainText("Unavailable");
  await expect(browserCard).not.toContainText("12 unreadable");
  await expect(page.getByRole("button", { name: "Download browser data" })).toBeDisabled();
});

test("anonymous import succeeds once and emits one payload-free same-tab event", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    anonymous: [syntheticFeedback("Anonymous import source", "import")],
  }));
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await expect(page.getByRole("heading", { name: "Anonymous browser workspace found" })).toBeVisible();
  await observeWorkspaceEvents(page);
  await page.getByRole("button", { name: "Import browser workspace" }).click();
  await expect(page.getByRole("status")).toContainText("Imported 1 browser item");
  expect(await workspaceEvents(page)).toEqual({ custom: 1, storage: 0, customHasDetail: false });
  const raw = await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"));
  expect(raw).toContain(ACCOUNT_A.id);
  expect(raw).not.toContain('"anonymous"');
});

test("anonymous import conflict rejects with byte-identical storage and no event", async ({ page }) => {
  await page.goto("/");
  const raw = ownerContainer({
    anonymous: [syntheticFeedback("Anonymous conflict", "anon-conflict")],
    accounts: { [ACCOUNT_A.id]: [syntheticFeedback("Existing A", "a-conflict")] },
  });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: FEEDBACK_KEY, value: raw });
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await observeWorkspaceEvents(page);
  await page.getByRole("button", { name: "Import browser workspace" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /already has browser workspace data/i })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"))).toBe(raw);
  expect(await workspaceEvents(page)).toEqual({ custom: 0, storage: 0, customHasDetail: false });
});

test("guarded import rollback emits zero for exact restore and one for residual mutation", async ({ page }) => {
  await page.goto("/");
  const originalRaw = ownerContainer({
    anonymous: [syntheticFeedback("Rollback source", "rollback")],
  });
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), originalRaw);
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await observeWorkspaceEvents(page);
  await page.evaluate(() => {
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    let finalWriteObserved = false;
    let mismatchPending = false;
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSet.call(this, key, value);
      if (key === "skillmint:beta-feedback" && !finalWriteObserved) {
        finalWriteObserved = true;
        mismatchPending = true;
      }
    };
    Storage.prototype.getItem = function (key: string) {
      const value = originalGet.call(this, key);
      if (key === "skillmint:beta-feedback" && mismatchPending) {
        mismatchPending = false;
        return `${value} `;
      }
      return value;
    };
  });
  await page.getByRole("button", { name: "Import browser workspace" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Exact pre-import browser data was restored/i })).toBeVisible();
  expect(await workspaceEvents(page)).toEqual({ custom: 0, storage: 0, customHasDetail: false });
  expect(await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"))).toBe(originalRaw);

  await page.reload();
  await observeWorkspaceEvents(page);
  await page.evaluate(() => {
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    let setCalls = 0;
    let mismatchPending = false;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key !== "skillmint:beta-feedback") return originalSet.call(this, key, value);
      setCalls += 1;
      if (setCalls === 2) throw new Error("synthetic rollback failure");
      originalSet.call(this, key, value);
      mismatchPending = true;
    };
    Storage.prototype.getItem = function (key: string) {
      const value = originalGet.call(this, key);
      if (key === "skillmint:beta-feedback" && mismatchPending) {
        mismatchPending = false;
        return `${value} `;
      }
      return value;
    };
  });
  await page.getByRole("button", { name: "Import browser workspace" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /could not be restored/i })).toBeVisible();
  expect(await workspaceEvents(page)).toEqual({ custom: 1, storage: 0, customHasDetail: false });
});

test("@critical same-tab custom event and cross-tab storage event refresh exactly once", async ({ page, context }) => {
  const secondPage = await context.newPage();
  await page.goto("/settings/data");
  await secondPage.goto("/settings/data");
  await observeWorkspaceEvents(page);
  await observeWorkspaceEvents(secondPage);

  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page.getByPlaceholder("What felt broken, confusing, or useful?").fill("Synthetic cross-tab feedback");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("status").filter({ hasText: /saved in this browser/i })).toBeVisible();
  await expect(secondPage.locator("article").filter({ hasText: "This browser" }).first()).toContainText("1 visible item");
  expect(await workspaceEvents(page)).toEqual({ custom: 1, storage: 0, customHasDetail: false });
  expect(await workspaceEvents(secondPage)).toEqual({ custom: 0, storage: 1, customHasDetail: false });
  await secondPage.close();
});

test("@critical rendered clear dialog traps focus, ignores backdrop, and clears with one event", async ({ page }) => {
  await page.goto("/settings/data");
  await page.evaluate((raw) => localStorage.setItem("skillmint:beta-feedback", raw), ownerContainer({
    anonymous: [syntheticFeedback("Clear me", "clear")],
  }));
  await page.reload();
  await observeWorkspaceEvents(page);
  const trigger = page.getByRole("button", { name: "Clear SkillMint data from this browser" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Clear SkillMint data from this browser" });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Close Clear SkillMint data from this browser" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.mouse.click(3, 3);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("dialog").getByRole("button", { name: "Clear browser data" }).click();
  await expect(page.getByRole("status")).toContainText(/cleared from this browser/i);
  expect(await page.evaluate(() => localStorage.getItem("skillmint:beta-feedback"))).toBeNull();
  expect(await workspaceEvents(page)).toEqual({ custom: 1, storage: 0, customHasDetail: false });
});

test("@critical account phrase focus is stable and owner switch removes private dialog", async ({ page, context }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Delete SkillMint account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete SkillMint account" });
  const input = page.getByLabel("Type DELETE MY ACCOUNT");
  await expect(input).toBeFocused();
  await input.pressSequentially("DELETE MY");
  await expect(input).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Delete SkillMint account", exact: true })).toBeDisabled();
  await input.pressSequentially(" ACCOUNT");
  await expect(dialog.getByRole("button", { name: "Delete SkillMint account", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const input = document.querySelector("#account-delete-confirmation");
    input?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      isComposing: true,
    }));
  });
  await expect(dialog).toBeVisible();
  await switchAccount(context, ACCOUNT_B);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(ACCOUNT_A.email)).toHaveCount(0);
});

test("@critical @race processing dialog blocks dismissal and old result under a new owner", async ({ page, context, provider }) => {
  await login(page, ACCOUNT_A);
  await page.goto("/settings/data");
  await expect(page.locator("article").filter({ has: page.getByText("Profile", { exact: true }) })).toContainText("1");
  const [gate] = provider.holdNext("rpc:delete-saved-reports");
  await page.getByRole("button", { name: "Delete saved reports" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete saved reports" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Delete saved reports", exact: true }).click();
  await provider.waitFor("rpc:delete-saved-reports", 1, ACCOUNT_A.id);
  await expect(dialog).toHaveAttribute("aria-busy", "true");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: /Working/ })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await switchAccount(context, ACCOUNT_B);
  await expect(dialog).toHaveCount(0);
  gate.release();
  await expect(page.getByText(/Resume analyses deleted:/)).toHaveCount(0);
  await expect(page.getByText(ACCOUNT_B.email)).toBeVisible();
});
