export const env = {
  appName: "SkillMint",

  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",

  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",

  environment:
    process.env.NODE_ENV ?? "development",
} as const;