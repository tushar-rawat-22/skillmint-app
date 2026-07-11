import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSupabaseAdminConfigStatus,
  getSupabasePublicConfig,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";

type AccountDeleteRequestBody = {
  confirmation?: unknown;
  userId?: unknown;
};

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);

  if (originError) {
    return originError;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return createJsonError("Expected application/json request.", 415);
  }

  const token = getBearerToken(request);

  if (!token) {
    return createJsonError("Sign in again before deleting your account.", 401);
  }

  const body = await parseRequestBody(request);

  if (!body.ok) {
    return createJsonError(body.error, 400);
  }

  if ("userId" in body.data) {
    return createJsonError("Client-supplied user identity is not accepted.", 400);
  }

  if (body.data.confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    return createJsonError("Type DELETE MY ACCOUNT to confirm.", 400);
  }

  const publicConfig = getSupabasePublicConfig();
  const adminConfigStatus = getSupabaseAdminConfigStatus();
  const adminClient = createSupabaseAdminClient();

  if (!publicConfig || !adminConfigStatus.isConfigured || !adminClient) {
    return createJsonError(
      "Account deletion is not configured on this server.",
      503,
    );
  }

  const userClient = createClient<Database>(
    publicConfig.url,
    publicConfig.publishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  const { data: userData, error: userError } =
    await userClient.auth.getUser(token);

  if (userError || !userData.user) {
    return createJsonError("Sign in again before deleting your account.", 401);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    userData.user.id,
  );

  if (deleteError) {
    return createJsonError(
      "Account deletion did not finish. Please try again.",
      500,
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: true,
  });
}

async function parseRequestBody(
  request: Request,
): Promise<
  | {
      ok: true;
      data: AccountDeleteRequestBody;
    }
  | {
      ok: false;
      error: string;
    }
> {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {
        ok: false,
        error: "Invalid request body.",
      };
    }

    return {
      ok: true,
      data: body as AccountDeleteRequestBody,
    };
  } catch {
    return {
      ok: false,
      error: "Invalid JSON request body.",
    };
  }
}

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

function validateSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  try {
    const requestOrigin = new URL(request.url).origin;

    if (origin !== requestOrigin) {
      return createJsonError("Request origin is not allowed.", 403);
    }
  } catch {
    return createJsonError("Request origin could not be verified.", 403);
  }

  return null;
}

function createJsonError(message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
    },
  );
}
