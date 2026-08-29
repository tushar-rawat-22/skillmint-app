import { NextResponse } from "next/server";

import { getPublicOAuthConfiguration } from "@/config/publicOAuth";
import { getTrustedAppOrigin } from "@/lib/supabase/config";
import { createRouteSupabaseClient } from "@/lib/supabase/routeClient";
import {
  accountPersonaDestination,
  getAccountPersona,
} from "@/modules/accountPersona";

const MAX_CODE_LENGTH = 4_096;

export async function GET(request: Request) {
  const appOrigin = getTrustedAppOrigin();
  const { enabled } = getPublicOAuthConfiguration();
  if (!appOrigin || !enabled) {
    return new NextResponse(null, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const codes = requestUrl.searchParams.getAll("code");
  const code = codes.length === 1 ? codes[0]?.trim() : "";

  if (!code || code.length > MAX_CODE_LENGTH) {
    return redirectToLogin(appOrigin, "invalid_callback");
  }

  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return redirectToLogin(appOrigin, "unavailable");
  }

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return redirectToLogin(appOrigin, "invalid_callback");
    }

    const { data, error: userError } = await supabase.auth.getUser();
    const userId = data.user?.id?.trim();
    if (userError || !userId) {
      return redirectToLogin(appOrigin, "unavailable");
    }

    const persona = await getAccountPersona(userId);
    if (persona.status === "resolved") {
      return NextResponse.redirect(
        new URL(accountPersonaDestination(persona.persona), appOrigin),
        303,
      );
    }
    if (persona.status === "missing") {
      return NextResponse.redirect(new URL("/auth/persona", appOrigin), 303);
    }

    return redirectToLogin(appOrigin, "unavailable");
  } catch {
    return redirectToLogin(appOrigin, "unavailable");
  }
}

function redirectToLogin(
  origin: string,
  reason: "invalid_callback" | "unavailable",
) {
  const destination = new URL("/login", origin);
  destination.searchParams.set("oauth", reason);
  return NextResponse.redirect(destination, 303);
}
