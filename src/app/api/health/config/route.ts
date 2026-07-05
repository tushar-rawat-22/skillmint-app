import { NextResponse } from "next/server";

import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  const configStatus = getSupabaseConfigStatus();

  return NextResponse.json({
    supabaseConfigured: configStatus.isConfigured,
    missingEnvVars: configStatus.missingEnvVars,
  });
}
