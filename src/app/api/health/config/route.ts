import { NextResponse } from "next/server";

import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  const configStatus = getSupabaseConfigStatus();
  const status = configStatus.isConfigured
    ? "healthy"
    : "degraded";

  return NextResponse.json(
    { status },
    {
      status: configStatus.isConfigured ? 200 : 503,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
