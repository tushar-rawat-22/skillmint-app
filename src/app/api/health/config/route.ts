import { NextResponse } from "next/server";

import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  getSupabaseConfigStatus,
  getTrustedAppOrigin,
} from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  const configStatus = getSupabaseConfigStatus();
  const isConfigured =
    configStatus.isConfigured &&
    isSupabaseAdminConfigured() &&
    Boolean(getTrustedAppOrigin());
  const status = isConfigured
    ? "healthy"
    : "degraded";

  return NextResponse.json(
    { status },
    {
      status: isConfigured ? 200 : 503,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
