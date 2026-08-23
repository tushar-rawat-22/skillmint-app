import { expect, test as base, type BrowserContext, type Page, type Route } from "@playwright/test";

export const APP_ORIGIN = "http://127.0.0.1:3100";
export const PROVIDER_ORIGIN = "http://127.0.0.1:54321";
export const ACCOUNT_A = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "account-a@example.test",
  name: "Account A",
};
export const ACCOUNT_B = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "account-b@example.test",
  name: "Account B",
};
export const SYNTHETIC_PASSWORD = "synthetic-password";
export const SYNTHETIC_RECOVERY_CODE =
  "synthetic-recovery-code";
export const SYNTHETIC_RECOVERY_VERIFIER =
  "synthetic-recovery-verifier";
const CREATED_AT = "2026-01-02T03:04:05.000Z";

type Account = typeof ACCOUNT_A;
type ProviderMode = "success" | "reject" | "abort" | "malformed";
type RequestRecord = { kind: string; accountId: string | null; url: string };

class Deferred {
  promise: Promise<void>;
  private resolvePromise!: () => void;

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  release() {
    this.resolvePromise();
  }
}

export class SyntheticProvider {
  readonly requests: RequestRecord[] = [];
  readonly unexpectedRequests: string[] = [];
  loginMode: ProviderMode = "success";
  signupMode: ProviderMode = "success";
  recoveryExchangeMode: ProviderMode = "success";
  passwordResetMode: ProviderMode = "success";
  passwordUpdateMode: ProviderMode = "success";
  countMode: "success" | "reject" = "success";
  feedbackMode: ProviderMode = "success";
  savedReportsMode: ProviderMode = "success";
  careerSnapshotCount = 0;
  private gates = new Map<string, Deferred[]>();
  private failures = new Map<string, number>();
  private authUserOverrides: string[] = [];
  private usedRecoveryCodes = new Set<string>();
  private passwordResetBodies: Record<string, unknown>[] = [];
  private proofBriefs = new Map<string, Record<string, unknown>>();

  async install(context: BrowserContext) {
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === PROVIDER_ORIGIN) {
        await this.handleProviderRoute(route, url);
        return;
      }
      if (url.origin === APP_ORIGIN) {
        await route.continue();
        return;
      }
      this.unexpectedRequests.push(route.request().url());
      await route.abort("blockedbyclient");
    });
  }

  holdNext(kind: string, count = 1): Deferred[] {
    const output = Array.from({ length: count }, () => new Deferred());
    this.gates.set(kind, [...(this.gates.get(kind) ?? []), ...output]);
    return output;
  }

  failNext(kind: string, count = 1) {
    this.failures.set(kind, (this.failures.get(kind) ?? 0) + count);
  }

  overrideNextAuthUser(accountId: string) {
    this.authUserOverrides.push(accountId);
  }

  latestPasswordResetBody(): Record<string, unknown> | null {
    return this.passwordResetBodies.at(-1) ?? null;
  }

  latestPasswordResetUrl(): URL | null {
    const record = this.requests.findLast(
      (request) => request.kind === "auth:password-reset",
    );
    return record ? new URL(record.url) : null;
  }

  count(kind: string, accountId?: string | null): number {
    return this.requests.filter((request) =>
      request.kind === kind && (accountId === undefined || request.accountId === accountId)
    ).length;
  }

  proofBriefFor(accountId: string): Record<string, unknown> | null {
    return this.proofBriefs.get(accountId) ?? null;
  }

  async waitFor(kind: string, count = 1, accountId?: string) {
    await expect.poll(() => this.count(kind, accountId), {
      message: `waiting for ${count} ${kind} request(s)`,
      timeout: 10_000,
    }).toBeGreaterThanOrEqual(count);
  }

  private async handleProviderRoute(route: Route, url: URL) {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    if (url.pathname === "/auth/v1/token") {
      const grant = url.searchParams.get("grant_type");
      const body = parseJson(request.postData());

      if (grant === "pkce") {
        const authCode =
          typeof body.auth_code === "string"
            ? body.auth_code
            : "";

        const codeVerifier =
          typeof body.code_verifier === "string"
            ? body.code_verifier
            : "";

        const account =
          authCode === SYNTHETIC_RECOVERY_CODE &&
          codeVerifier === SYNTHETIC_RECOVERY_VERIFIER &&
          !this.usedRecoveryCodes.has(authCode)
            ? ACCOUNT_A
            : null;

        const kind = "auth:recovery-exchange";

        this.record(kind, account?.id ?? null, url);
        await this.releaseGate(kind);

        if (this.recoveryExchangeMode === "abort") {
          await route.abort("connectionfailed");
          return;
        }

        if (
          this.recoveryExchangeMode === "reject" ||
          !account
        ) {
          await json(route, 400, {
            error: "invalid_grant",
            error_code: "otp_expired",
            error_description:
              "RAW_SYNTHETIC_RECOVERY_PROVIDER_SECRET",
            msg: "RAW_SYNTHETIC_RECOVERY_PROVIDER_SECRET",
          });
          return;
        }

        if (this.recoveryExchangeMode === "malformed") {
          await json(route, 200, {
            access_token: "malformed",
          });
          return;
        }

        this.usedRecoveryCodes.add(authCode);

        await json(route, 200, createSession(account));
        return;
      }

      const account =
        grant === "refresh_token"
          ? accountForRefreshToken(body.refresh_token)
          : accountForEmail(body.email);

      const kind =
        grant === "refresh_token"
          ? "auth:refresh"
          : "auth:login";

      this.record(kind, account?.id ?? null, url);
      await this.releaseGate(kind);

      if (this.loginMode === "abort") {
        await route.abort("connectionfailed");
        return;
      }

      if (this.loginMode === "reject" || !account) {
        await json(route, 400, {
          error: "invalid_grant",
          error_description: "RAW_SYNTHETIC_PROVIDER_SECRET",
          msg: "RAW_SYNTHETIC_PROVIDER_SECRET",
        });
        return;
      }

      await json(route, 200, createSession(account));
      return;
    }

    if (
      url.pathname === "/auth/v1/recover" &&
      request.method() === "POST"
    ) {
      const body = parseJson(request.postData());
      const kind = "auth:password-reset";
      this.passwordResetBodies.push(body);
      this.record(kind, null, url);
      await this.releaseGate(kind);

      if (this.passwordResetMode === "abort") {
        await route.abort("connectionfailed");
        return;
      }

      if (this.passwordResetMode === "reject") {
        await json(route, 503, {
          error_code: "provider_failure",
          msg: "RAW_SYNTHETIC_PASSWORD_RESET_SECRET",
        });
        return;
      }

      if (this.passwordResetMode === "malformed") {
        await json(route, 200, {
          unexpected: "response",
        });
        return;
      }

      await json(route, 200, {});
      return;
    }

    const bearerAccount = accountFromAuthorization(
      request.headers().authorization,
    );

    if (
      url.pathname === "/auth/v1/signup" &&
      request.method() === "POST"
    ) {
      const body = parseJson(request.postData());
      const account = accountForEmail(body.email);
      const kind = "auth:signup";

      this.record(kind, account?.id ?? null, url);
      await this.releaseGate(kind);

      if (this.signupMode === "abort") {
        await route.abort("connectionfailed");
        return;
      }

      if (this.signupMode === "reject" || !account) {
        await json(route, 422, {
          error_code: "signup_disabled",
          msg: "RAW_SYNTHETIC_SIGNUP_PROVIDER_SECRET",
        });
        return;
      }

      if (this.signupMode === "malformed") {
        await json(route, 200, {
          unexpected: "response",
        });
        return;
      }

      await json(route, 200, createSession(account));
      return;
    }

    if (
      url.pathname === "/auth/v1/user" &&
      request.method() === "PUT"
    ) {
      const body = parseJson(request.postData());
      const account = bearerAccount;
      const kind = "auth:update-user";

      this.record(kind, account?.id ?? null, url);
      await this.releaseGate(kind);

      if (this.passwordUpdateMode === "abort") {
        await route.abort("connectionfailed");
        return;
      }

      if (!account) {
        await json(route, 401, {
          message: "Synthetic session missing",
        });
        return;
      }

      if (
        this.passwordUpdateMode === "reject" ||
        typeof body.password !== "string" ||
        body.password.length < 6
      ) {
        await json(route, 422, {
          error_code: "weak_password",
          msg: "RAW_SYNTHETIC_PASSWORD_UPDATE_SECRET",
        });
        return;
      }

      if (this.passwordUpdateMode === "malformed") {
        await json(route, 200, {
          id: "malformed",
        });
        return;
      }

      await json(route, 200, createUser(account));
      return;
    }

    if (
      url.pathname === "/auth/v1/user" &&
      request.method() === "GET"
    ) {
      const overrideId = this.authUserOverrides.shift();
      const account = overrideId
        ? accountForId(overrideId)
        : bearerAccount;

      this.record("auth:user", account?.id ?? null, url);
      await this.releaseGate("auth:user");

      if (!account) {
        await json(route, 401, {
          message: "Synthetic session missing",
        });
        return;
      }

      await json(route, 200, createUser(account));
      return;
    }

    if (url.pathname === "/auth/v1/logout") {
      this.record("auth:logout", bearerAccount?.id ?? null, url);
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    if (url.pathname.startsWith("/rest/v1/rpc/delete_current_user_saved_reports")) {
      this.record("rpc:delete-saved-reports", bearerAccount?.id ?? null, url);
      await this.releaseGate("rpc:delete-saved-reports");
      if (this.savedReportsMode !== "success") {
        await json(route, 503, { message: "RAW_SYNTHETIC_RPC_FAILURE" });
        return;
      }
      await json(route, 200, {
        resume_analyses_deleted: 1,
        job_matches_deleted: 1,
        career_snapshots_deleted: 0,
      });
      return;
    }

    if (url.pathname === "/rest/v1/beta_feedback" && request.method() === "POST") {
      const input = parseJson(request.postData());
      this.record("feedback:insert", bearerAccount?.id ?? null, url);
      await this.releaseGate("feedback:insert");
      if (this.feedbackMode === "abort") {
        await route.abort("connectionfailed");
        return;
      }
      if (this.feedbackMode === "reject") {
        await json(route, 503, { message: "RAW_SYNTHETIC_PROVIDER_SECRET" });
        return;
      }
      if (this.feedbackMode === "malformed") {
        await json(route, 200, { id: "malformed" });
        return;
      }
      await json(route, 200, {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        user_id: bearerAccount?.id,
        feedback_type: input.feedback_type,
        sentiment: input.sentiment,
        message: input.message,
        page_path: input.page_path,
        status: "new",
        created_at: CREATED_AT,
      });
      return;
    }

    const table = url.pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
    if (table) {
      const accountId = bearerAccount?.id ?? null;
      if (
        table === "proof_briefs" &&
        request.method() === "POST" &&
        bearerAccount
      ) {
        const input = parseJson(request.postData());
        const row = {
          id: bearerAccount.id === ACCOUNT_A.id
            ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
            : "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
          user_id: bearerAccount.id,
          source_resume_analysis_id: input.source_resume_analysis_id,
          brief_payload: input.brief_payload,
          visibility: "PRIVATE",
          share_token_hash: null,
          share_created_at: null,
          revoked_at: null,
          created_at: CREATED_AT,
          updated_at: CREATED_AT,
        };
        this.proofBriefs.set(bearerAccount.id, row);
        this.record("proof-brief:insert", accountId, url);
        await this.releaseGate("proof-brief:insert");
        await json(route, 200, row);
        return;
      }
      if (
        table === "proof_briefs" &&
        request.method() === "PATCH" &&
        bearerAccount
      ) {
        const current = this.proofBriefs.get(bearerAccount.id);
        if (!current) {
          await json(route, 404, { message: "Synthetic Proof Brief missing" });
          return;
        }
        const input = parseJson(request.postData());
        const row = { ...current, ...input, updated_at: CREATED_AT };
        this.proofBriefs.set(bearerAccount.id, row);
        const kind = input.visibility === "LINK_ONLY"
          ? "proof-brief:publish"
          : input.revoked_at
            ? "proof-brief:revoke-or-refresh"
            : "proof-brief:update";
        this.record(kind, accountId, url);
        await this.releaseGate(kind);
        await json(route, 200, row);
        return;
      }
      if (
        table === "resume_analyses" &&
        request.method() === "POST" &&
        bearerAccount
      ) {
        const input = parseJson(request.postData());
        this.record("resume:insert", accountId, url);
        await this.releaseGate("resume:insert");
        await json(route, 200, {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          user_id: bearerAccount.id,
          file_name: input.file_name,
          file_type: input.file_type,
          extracted_text: input.extracted_text,
          parsed_profile: input.parsed_profile,
          user_profile: input.user_profile,
          created_at: CREATED_AT,
        });
        return;
      }
      if (request.method() === "HEAD" || request.headers().prefer?.includes("count=exact")) {
        const kind = `count:${table}`;
        this.record(kind, accountId, url);
        await this.releaseGate(kind);
        if (this.countMode === "reject" || this.consumeFailure(kind) || this.consumeFailure("count:*")) {
          await route.fulfill({
            status: 503,
            body: request.method() === "HEAD"
              ? ""
              : JSON.stringify({ message: "RAW_SYNTHETIC_COUNT_FAILURE" }),
            headers: {
              ...corsHeaders(),
              "content-type": "application/json",
            },
          });
          return;
        }
        const count = this.tableRows(table, bearerAccount).length;
        await route.fulfill({
          status: 200,
          body: "",
          headers: {
            ...corsHeaders(),
            "content-range": count === 0 ? "*/0" : `0-${count - 1}/${count}`,
          },
        });
        return;
      }
      if (request.method() === "GET") {
        const kind = `rows:${table}`;
        this.record(kind, accountId, url);
        await this.releaseGate(kind);
        await json(route, 200, this.tableRows(table, bearerAccount));
        return;
      }
    }

    this.unexpectedRequests.push(request.url());
    await route.abort("blockedbyclient");
  }

  private tableRows(table: string, account: Account | null): unknown[] {
    if (!account) return [];
    if (table === "profiles") {
      return [{
        id: account.id,
        full_name: account.name,
        email: account.email,
        career_goal: "Synthetic career goal",
        target_role: "Synthetic engineer",
        created_at: CREATED_AT,
        updated_at: CREATED_AT,
      }];
    }
    if (table === "beta_feedback") {
      return [{
        id: account.id === ACCOUNT_A.id
          ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
          : "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        user_id: account.id,
        feedback_type: "idea",
        sentiment: "positive",
        message: `Synthetic ${account.name} feedback`,
        page_path: "/settings/data",
        created_at: CREATED_AT,
      }];
    }
    if (table === "career_snapshots" && this.careerSnapshotCount > 0) {
      return Array.from({ length: this.careerSnapshotCount }, (_, index) => ({
        id: `cccccccc-cccc-4ccc-8ccc-${String(index + 1).padStart(12, "0")}`,
        user_id: account.id,
      }));
    }
    if (table === "proof_briefs") {
      const row = this.proofBriefs.get(account.id);
      return row ? [row] : [];
    }
    return [];
  }

  private record(kind: string, accountId: string | null, url: URL) {
    this.requests.push({ kind, accountId, url: url.toString() });
  }

  private async releaseGate(kind: string) {
    const queue = this.gates.get(kind);
    const gate = queue?.shift();
    if (gate) await gate.promise;
  }

  private consumeFailure(kind: string): boolean {
    const remaining = this.failures.get(kind) ?? 0;
    if (remaining <= 0) return false;
    this.failures.set(kind, remaining - 1);
    return true;
  }
}

type RuntimeFixtures = { provider: SyntheticProvider };

export const test = base.extend<RuntimeFixtures>({
  provider: [async ({ context }, provide) => {
      const provider = new SyntheticProvider();
      await provider.install(context);
      await provide(provider);
      expect(provider.unexpectedRequests, "unexpected external application requests").toEqual([]);
    }, { auto: true }],
});

export { expect };

export async function login(page: Page, account: Account = ACCOUNT_A) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(SYNTHETIC_PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
}

export async function switchAccount(context: BrowserContext, account: Account) {
  const controlPage = await context.newPage();
  await login(controlPage, account);
  const observingPages = context.pages().filter((page) =>
    page !== controlPage && !page.isClosed()
  );
  await Promise.all(observingPages.map((page) =>
    expect(page.getByText(account.email, { exact: true })).toBeVisible()
  ));
  await controlPage.close();
}

export async function signOut(context: BrowserContext) {
  const controlPage = await context.newPage();
  await controlPage.goto("/settings");
  await controlPage.getByRole("button", { name: "Sign out" }).click();
  await expect(controlPage).toHaveURL(/\/login$/);
  await controlPage.close();
}

export function ownerContainer(input: {
  anonymous?: unknown;
  accounts?: Record<string, unknown>;
  descriptorVersion?: number;
  version?: number;
}) {
  const partition = (value: unknown) => ({ value, updatedAt: CREATED_AT });
  return JSON.stringify({
    format: "skillmint-owner-partitions",
    version: input.version ?? 2,
    descriptorVersion: input.descriptorVersion ?? 1,
    partitions: {
      ...(input.anonymous === undefined ? {} : { anonymous: partition(input.anonymous) }),
      accounts: Object.fromEntries(
        Object.entries(input.accounts ?? {}).map(([id, value]) => [id, partition(value)]),
      ),
    },
  });
}

export function syntheticFeedback(message: string, suffix = "1") {
  return {
    id: `feedback-synthetic-${suffix}`,
    feedbackType: "idea",
    sentiment: "positive",
    message,
    pagePath: "/settings/data",
    createdAt: CREATED_AT,
    syncStatus: "local-only",
  };
}

export function expiredSessionCookie(account: Account = ACCOUNT_A) {
  const session = createSession(account, -60);
  return {
    name: "sb-127-auth-token",
    value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
    url: APP_ORIGIN,
  };
}

function corsHeaders() {
  return {
    "access-control-allow-origin": APP_ORIGIN,
    "access-control-allow-headers": "authorization, apikey, content-type, prefer, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
    "access-control-expose-headers": "content-range",
    "content-type": "application/json",
  };
}

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, headers: corsHeaders(), body: JSON.stringify(body) });
}

function parseJson(value: string | null): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function accountForEmail(email: unknown): Account | null {
  if (email === ACCOUNT_A.email) return ACCOUNT_A;
  if (email === ACCOUNT_B.email) return ACCOUNT_B;
  return null;
}

function accountForId(id: string): Account | null {
  if (id === ACCOUNT_A.id) return ACCOUNT_A;
  if (id === ACCOUNT_B.id) return ACCOUNT_B;
  return null;
}

function accountForRefreshToken(value: unknown): Account | null {
  if (value === `refresh-${ACCOUNT_A.id}`) return ACCOUNT_A;
  if (value === `refresh-${ACCOUNT_B.id}`) return ACCOUNT_B;
  return null;
}

function accountFromAuthorization(value: string | undefined): Account | null {
  const token = value?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return accountForId(payload.sub);
  } catch {
    return null;
  }
}

function createSession(account: Account, expiresIn = 3600) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: createJwt(account, now, expiresIn),
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    refresh_token: `refresh-${account.id}`,
    user: createUser(account),
  };
}

function createJwt(account: Account, now: number, expiresIn: number): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    aud: "authenticated",
    exp: now + expiresIn,
    iat: now,
    sub: account.id,
    email: account.email,
    role: "authenticated",
    aal: "aal1",
    session_id: `session-${account.id}`,
    amr: [{ method: "password", timestamp: now }],
  })}.synthetic-signature`;
}

function createUser(account: Account) {
  return {
    id: account.id,
    aud: "authenticated",
    role: "authenticated",
    email: account.email,
    email_confirmed_at: CREATED_AT,
    confirmed_at: CREATED_AT,
    last_sign_in_at: CREATED_AT,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: account.name },
    identities: [],
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    is_anonymous: false,
  };
}
