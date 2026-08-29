import { NextResponse } from "next/server";

import { getTrustedAppOrigin } from "@/lib/supabase/config";
import { createRouteSupabaseClient } from "@/lib/supabase/routeClient";
import {
  accountPersonaDestination,
  ensureAccountPersona,
  isAccountPersona,
} from "@/modules/accountPersona";

const MAX_FORM_LENGTH = 256;

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
  const personaValues = form.getAll("persona");
  if (personaValues.length !== 1 || !isAccountPersona(personaValues[0])) {
    return new NextResponse(null, { status: 400 });
  }

  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return redirectToPersona(appOrigin, "unavailable");
  }

  const { data, error } = await supabase.auth.getUser();
  const userId = data.user?.id?.trim();
  if (error || !userId) {
    return NextResponse.redirect(new URL("/login", appOrigin), 303);
  }

  const resolution = await ensureAccountPersona(userId, personaValues[0]);
  if (resolution.status !== "resolved") {
    return redirectToPersona(appOrigin, "unavailable");
  }

  return NextResponse.redirect(
    new URL(accountPersonaDestination(resolution.persona), appOrigin),
    303,
  );
}

function redirectToPersona(origin: string, reason: "unavailable") {
  const destination = new URL("/auth/persona", origin);
  destination.searchParams.set("error", reason);
  return NextResponse.redirect(destination, 303);
}
