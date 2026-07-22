import type { Page } from "@playwright/test";

import {
  ACCOUNT_A,
  ACCOUNT_B,
  APP_ORIGIN,
  expect,
  login,
  PROVIDER_ORIGIN,
  SYNTHETIC_RECOVERY_CODE,
  SYNTHETIC_RECOVERY_VERIFIER,
  type SyntheticProvider,
  test,
} from "./support/runtime";

const INVALID_LINK_COPY =
  /reset link is invalid or has expired/i;

const RAW_PROVIDER_COPY =
  "RAW_SYNTHETIC_PROVIDER_SECRET";

const RAW_RECOVERY_PROVIDER_COPY =
  "RAW_SYNTHETIC_RECOVERY_PROVIDER_SECRET";

const RAW_PASSWORD_UPDATE_COPY =
  "RAW_SYNTHETIC_PASSWORD_UPDATE_SECRET";

const SAFE_PASSWORD_UPDATE_ERROR =
  "We could not update your password. Please try again or request a new reset link.";

const NEW_PASSWORD = "synthetic-new-password";

test(
  "@password-recovery @password-recovery-page direct visit never exposes an active reset form",
  async ({ page }) => {
    await page.goto("/reset-password");

    await expect(
      page.getByText(INVALID_LINK_COPY),
    ).toBeVisible();

    await expectResetFormUnavailable(page);

    await expect(
      page.getByRole("link", {
        name: "Request a new reset link",
      }),
    ).toHaveAttribute("href", "/forgot-password");
  },
);

test(
  "@password-recovery @password-recovery-page explicit callback error is sanitized and remains fail-closed",
  async ({ page }) => {
    await page.goto(
      "/reset-password" +
        "?error=access_denied" +
        "&error_code=otp_expired" +
        `&error_description=${RAW_PROVIDER_COPY}`,
    );

    await expect(
      page.getByText(INVALID_LINK_COPY),
    ).toBeVisible();

    await expectResetFormUnavailable(page);

    await expect(page.locator("body")).not.toContainText(
      RAW_PROVIDER_COPY,
    );

    await expect(page).toHaveURL(/\/reset-password$/);
  },
);

test(
  "@password-recovery @password-recovery-page an ordinary signed-in session is not recovery authorization",
  async ({ page }) => {
    await login(page);

    await page.goto("/reset-password");

    await expect(
      page.getByText(INVALID_LINK_COPY),
    ).toBeVisible();

    await expectResetFormUnavailable(page);

    await expect(
      page.getByRole("link", {
        name: "Request a new reset link",
      }),
    ).toHaveAttribute("href", "/forgot-password");
  },
);

async function expectResetFormUnavailable(
  page: Page,
): Promise<void> {
  const controls = [
    page.getByLabel("New password"),
    page.getByLabel("Confirm password"),
    page.getByRole("button", {
      name: "Update password",
    }),
  ];

  for (const control of controls) {
    if ((await control.count()) > 0) {
      await expect(control).toBeDisabled();
    }
  }
}

async function seedRecoveryVerifier(
  page: Page,
): Promise<void> {
  const storedVerifier =
    `${SYNTHETIC_RECOVERY_VERIFIER}/recovery`;

  await page.context().addCookies([{
    name: "sb-127-auth-token-code-verifier",
    value:
      `base64-${Buffer.from(JSON.stringify(storedVerifier)).toString("base64url")}`,
    url: APP_ORIGIN,
  }]);
}

async function expectResetFormReady(
  page: Page,
): Promise<void> {
  await expect(page.getByLabel("New password")).toBeEnabled();
  await expect(page.getByLabel("Confirm password")).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "Update password",
    }),
  ).toBeEnabled();
}

async function expectSanitizedResetUrl(
  page: Page,
): Promise<void> {
  await expect(page).toHaveURL(/\/reset-password$/);

  const visibleUrl = page.url();
  const forbiddenFragments = [
    "access_token",
    "refresh_token",
    RAW_PROVIDER_COPY,
    RAW_RECOVERY_PROVIDER_COPY,
    RAW_PASSWORD_UPDATE_COPY,
    SYNTHETIC_RECOVERY_CODE,
    SYNTHETIC_RECOVERY_VERIFIER,
  ];

  for (const fragment of forbiddenFragments) {
    expect(visibleUrl).not.toContain(fragment);
  }
}

async function expectRawSecretsAbsent(
  page: Page,
): Promise<void> {
  const body = page.locator("body");

  for (const secret of [
    RAW_PROVIDER_COPY,
    RAW_RECOVERY_PROVIDER_COPY,
    RAW_PASSWORD_UPDATE_COPY,
  ]) {
    await expect(body).not.toContainText(secret);
    expect(page.url()).not.toContain(secret);
  }
}

async function establishValidRecovery(
  page: Page,
  provider: SyntheticProvider,
): Promise<void> {
  await seedRecoveryVerifier(page);
  await page.goto(
    `/reset-password?code=${SYNTHETIC_RECOVERY_CODE}`,
  );

  await expectResetFormReady(page);
  expect(provider.count("auth:recovery-exchange")).toBe(1);
  expect(provider.count("auth:user")).toBe(1);
  expect(
    provider.count("auth:recovery-exchange", ACCOUNT_A.id),
  ).toBe(1);
  expect(provider.count("auth:user", ACCOUNT_A.id)).toBe(1);
  expect(provider.count("auth:update-user")).toBe(0);
  await expectSanitizedResetUrl(page);
}

test(
  "@password-recovery @password-recovery-page valid PKCE recovery waits for exchange and verified-user readiness",
  async ({ page, provider }) => {
    const [exchangeGate] = provider.holdNext(
      "auth:recovery-exchange",
    );
    const [getUserGate] = provider.holdNext("auth:user");

    await seedRecoveryVerifier(page);
    await page.goto(
      `/reset-password?code=${SYNTHETIC_RECOVERY_CODE}`,
    );

    await provider.waitFor("auth:recovery-exchange", 1);
    await expectResetFormUnavailable(page);
    expect(provider.count("auth:recovery-exchange")).toBe(1);
    expect(provider.count("auth:user")).toBe(0);
    expect(provider.count("auth:update-user")).toBe(0);

    exchangeGate.release();

    await provider.waitFor("auth:user", 1, ACCOUNT_A.id);
    await expectResetFormUnavailable(page);
    expect(
      provider.count(
        "auth:recovery-exchange",
        ACCOUNT_A.id,
      ),
    ).toBe(1);
    expect(provider.count("auth:user", ACCOUNT_A.id)).toBe(1);
    expect(provider.count("auth:update-user")).toBe(0);

    getUserGate.release();

    await expectResetFormReady(page);
    expect(provider.count("auth:recovery-exchange")).toBe(1);
    expect(provider.count("auth:user")).toBe(1);
    expect(provider.count("auth:update-user")).toBe(0);
    await expectSanitizedResetUrl(page);
    await expectRawSecretsAbsent(page);
  },
);

test(
  "@password-recovery @password-recovery-page rejected or expired recovery code fails closed and is sanitized",
  async ({ page, provider }) => {
    provider.recoveryExchangeMode = "reject";
    await seedRecoveryVerifier(page);

    await page.goto(
      `/reset-password?code=${SYNTHETIC_RECOVERY_CODE}`,
    );

    await expect(page.getByText(INVALID_LINK_COPY)).toBeVisible();
    await expectResetFormUnavailable(page);
    await expect(
      page.getByRole("link", {
        name: "Request a new reset link",
      }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(provider.count("auth:recovery-exchange")).toBe(1);
    expect(provider.count("auth:user")).toBe(0);
    expect(provider.count("auth:update-user")).toBe(0);
    await expectSanitizedResetUrl(page);
    await expectRawSecretsAbsent(page);
  },
);

test(
  "@password-recovery @password-recovery-page successful exchange without expected getUser verification fails closed",
  async ({ page, provider }) => {
    provider.overrideNextAuthUser(ACCOUNT_B.id);
    await seedRecoveryVerifier(page);

    await page.goto(
      `/reset-password?code=${SYNTHETIC_RECOVERY_CODE}`,
    );

    await expect(page.getByText(INVALID_LINK_COPY)).toBeVisible();
    await expectResetFormUnavailable(page);
    expect(
      provider.count(
        "auth:recovery-exchange",
        ACCOUNT_A.id,
      ),
    ).toBe(1);
    expect(provider.count("auth:recovery-exchange")).toBe(1);
    expect(provider.count("auth:user", ACCOUNT_B.id)).toBe(1);
    expect(provider.count("auth:user")).toBe(1);
    expect(provider.count("auth:update-user")).toBe(0);
    await expectSanitizedResetUrl(page);
    await expectRawSecretsAbsent(page);
  },
);

test(
  "@password-recovery @password-recovery-page valid recovery updates ACCOUNT_A password once and clears the form",
  async ({ page, provider }) => {
    await establishValidRecovery(page, provider);

    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByLabel("Confirm password").fill(NEW_PASSWORD);
    await page.getByRole("button", {
      name: "Update password",
    }).click();

    await expect(
      page.getByText(
        "Password updated. You can continue to SkillMint.",
      ),
    ).toBeVisible();
    expect(
      provider.count("auth:update-user", ACCOUNT_A.id),
    ).toBe(1);
    expect(provider.count("auth:update-user")).toBe(1);
    await expect(page.getByLabel("New password")).toHaveValue("");
    await expect(page.getByLabel("Confirm password")).toHaveValue("");
    await expect(
      page.getByRole("button", {
        name: "Update password",
      }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /Updating/i }),
    ).toHaveCount(0);
    await expectSanitizedResetUrl(page);
    await expectRawSecretsAbsent(page);
  },
);

test(
  "@password-recovery @password-recovery-page rejected password update is sanitized and recovery remains retryable",
  async ({ page, provider }) => {
    await establishValidRecovery(page, provider);
    provider.passwordUpdateMode = "reject";

    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByLabel("Confirm password").fill(NEW_PASSWORD);
    await page.getByRole("button", {
      name: "Update password",
    }).click();

    await expect(
      page.getByText(SAFE_PASSWORD_UPDATE_ERROR),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Password updated. You can continue to SkillMint.",
      ),
    ).toHaveCount(0);
    expect(
      provider.count("auth:update-user", ACCOUNT_A.id),
    ).toBe(1);
    expect(provider.count("auth:update-user")).toBe(1);
    expect(provider.count("auth:recovery-exchange")).toBe(1);
    expect(provider.count("auth:user")).toBe(1);
    await expectResetFormReady(page);
    await expectSanitizedResetUrl(page);
    await expectRawSecretsAbsent(page);
  },
);

test(
  "@password-recovery @password-recovery-page duplicate password submission is prevented while update is pending",
  async ({ page, provider }) => {
    await establishValidRecovery(page, provider);
    const [updateGate] = provider.holdNext("auth:update-user");

    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByLabel("Confirm password").fill(NEW_PASSWORD);
    await page.locator("form").evaluate((form) => {
      if (!(form instanceof HTMLFormElement)) {
        throw new Error("Reset form was not an HTML form");
      }

      form.requestSubmit();
      form.requestSubmit();
    });

    await provider.waitFor(
      "auth:update-user",
      1,
      ACCOUNT_A.id,
    );

    try {
      expect(provider.count("auth:update-user")).toBe(1);
      await expect(
        page.getByRole("button", { name: /Updating/i }),
      ).toBeDisabled();
    } finally {
      updateGate.release();
    }

    await expect(
      page.getByText(
        "Password updated. You can continue to SkillMint.",
      ),
    ).toBeVisible();
    expect(
      provider.count("auth:update-user", ACCOUNT_A.id),
    ).toBe(1);
    expect(provider.count("auth:update-user")).toBe(1);
  },
);

test(
  "@password-recovery @password-recovery-page remount without a callback cannot reuse stale recovery readiness",
  async ({ page, provider }) => {
    await establishValidRecovery(page, provider);
    const exchangeCount = provider.count(
      "auth:recovery-exchange",
    );
    const getUserCount = provider.count("auth:user");

    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/reset-password");

    await expect(page.getByText(INVALID_LINK_COPY)).toBeVisible();
    await expectResetFormUnavailable(page);
    expect(provider.count("auth:recovery-exchange")).toBe(
      exchangeCount,
    );
    expect(provider.count("auth:user")).toBe(getUserCount);
    expect(provider.count("auth:update-user")).toBe(0);
    await expectSanitizedResetUrl(page);
    await expectRawSecretsAbsent(page);
  },
);

test(
  "@password-recovery synthetic provider exchanges a valid one-time PKCE recovery code",
  async ({ page, provider }) => {
    await page.goto("/login");

    const result = await page.evaluate(
      async ({
        providerOrigin,
        recoveryCode,
        recoveryVerifier,
      }) => {
        const exchangeResponse = await fetch(
          `${providerOrigin}/auth/v1/token?grant_type=pkce`,
          {
            method: "POST",
            headers: {
              apikey: "synthetic-publishable-key",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              auth_code: recoveryCode,
              code_verifier: recoveryVerifier,
            }),
          },
        );

        const session = (await exchangeResponse.json()) as {
          access_token?: string;
          user?: {
            id?: string;
          };
        };

        const userResponse = await fetch(
          `${providerOrigin}/auth/v1/user`,
          {
            method: "GET",
            headers: {
              apikey: "synthetic-publishable-key",
              authorization:
                `Bearer ${session.access_token ?? ""}`,
            },
          },
        );

        const user = (await userResponse.json()) as {
          id?: string;
        };

        return {
          exchangeStatus: exchangeResponse.status,
          session,
          userStatus: userResponse.status,
          user,
        };
      },
      {
        providerOrigin: PROVIDER_ORIGIN,
        recoveryCode: SYNTHETIC_RECOVERY_CODE,
        recoveryVerifier: SYNTHETIC_RECOVERY_VERIFIER,
      },
    );

    expect(result.exchangeStatus).toBe(200);
    expect(result.session.user?.id).toBe(ACCOUNT_A.id);
    expect(result.session.access_token).toBeTruthy();

    expect(result.userStatus).toBe(200);
    expect(result.user.id).toBe(ACCOUNT_A.id);

    expect(
      provider.count(
        "auth:recovery-exchange",
        ACCOUNT_A.id,
      ),
    ).toBe(1);

    expect(
      provider.count("auth:user", ACCOUNT_A.id),
    ).toBe(1);
  },
);

test(
  "@password-recovery synthetic provider accepts an authenticated password update and rejects code replay",
  async ({ page, provider }) => {
    await page.goto("/login");

    const result = await page.evaluate(
      async ({
        providerOrigin,
        recoveryCode,
        recoveryVerifier,
      }) => {
        const exchange = async () => {
          const response = await fetch(
            `${providerOrigin}/auth/v1/token?grant_type=pkce`,
            {
              method: "POST",
              headers: {
                apikey: "synthetic-publishable-key",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                auth_code: recoveryCode,
                code_verifier: recoveryVerifier,
              }),
            },
          );

          return {
            status: response.status,
            body: (await response.json()) as {
              access_token?: string;
            },
          };
        };

        const firstExchange = await exchange();

        const updateResponse = await fetch(
          `${providerOrigin}/auth/v1/user`,
          {
            method: "PUT",
            headers: {
              apikey: "synthetic-publishable-key",
              authorization:
                `Bearer ${
                  firstExchange.body.access_token ?? ""
                }`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              password: "synthetic-new-password",
            }),
          },
        );

        const updatedUser =
          (await updateResponse.json()) as {
            id?: string;
          };

        const replayExchange = await exchange();

        return {
          firstExchangeStatus: firstExchange.status,
          updateStatus: updateResponse.status,
          updatedUser,
          replayStatus: replayExchange.status,
        };
      },
      {
        providerOrigin: PROVIDER_ORIGIN,
        recoveryCode: SYNTHETIC_RECOVERY_CODE,
        recoveryVerifier: SYNTHETIC_RECOVERY_VERIFIER,
      },
    );

    expect(result.firstExchangeStatus).toBe(200);
    expect(result.updateStatus).toBe(200);
    expect(result.updatedUser.id).toBe(ACCOUNT_A.id);
    expect(result.replayStatus).toBe(400);

    expect(
      provider.count(
        "auth:recovery-exchange",
        ACCOUNT_A.id,
      ),
    ).toBe(1);

    expect(
      provider.count("auth:recovery-exchange", null),
    ).toBe(1);

    expect(
      provider.count("auth:update-user", ACCOUNT_A.id),
    ).toBe(1);
  },
);
