import { NextResponse } from "next/server";

import {
  isPublicOAuthProviderEnabled,
  type PublicOAuthProvider,
} from "@/config/publicOAuth";
import { getTrustedAppOrigin } from "@/lib/supabase/config";
import { createRouteSupabaseClient } from "@/lib/supabase/routeClient";

const MAX_FORM_LENGTH = 1_024;
const PROVIDERS = new Set<PublicOAuthProvider>(["google", "github"]);

export async function POST(request: Request) {
  const appOrigin = getTrustedAppOrigin();
  if (!appOrigin || request.headers.get("origin") !== appOrigin) {
    return new NextResponse(null, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return new NextResponse(null, { status: 415 });
  }

  const body = await request.text();
  if (body.length > MAX_FORM_LENGTH) {
    return new NextResponse(null, { status: 413 });
  }

  const form = new URLSearchParams(body);
  const providerValues = form.getAll("provider");
  if (providerValues.length !== 1) {
    return new NextResponse(null, { status: 400 });
  }

  const provider = providerValues[0] as PublicOAuthProvider;
  if (!PROVIDERS.has(provider) || !isPublicOAuthProviderEnabled(provider)) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return redirectToLogin(appOrigin, "unavailable");
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appOrigin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return redirectToLogin(appOrigin, "unavailable");
    }

    const destination = new URL(data.url);
    if (destination.protocol !== "https:" && destination.protocol !== "http:") {
      return redirectToLogin(appOrigin, "unavailable");
    }

    return NextResponse.redirect(destination, 303);
  } catch {
    return redirectToLogin(appOrigin, "unavailable");
  }
}

function redirectToLogin(origin: string, reason: "unavailable") {
  const destination = new URL("/login", origin);
  destination.searchParams.set("oauth", reason);
  return NextResponse.redirect(destination, 303);
}
