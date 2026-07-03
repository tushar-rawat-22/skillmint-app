import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicConfig } from "./config";

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  const config = getSupabasePublicConfig();
  let response = NextResponse.next({
    request,
  });

  if (!config) {
    return response;
  }

  try {
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });

            response = NextResponse.next({
              request,
            });

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });

            Object.entries(headers).forEach(([key, value]) => {
              response.headers.set(key, value);
            });
          },
        },
      },
    );

    await supabase.auth.getUser();
  } catch {
    return response;
  }

  return response;
}
