import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const supabaseConnectSources = getSupabaseConnectSources();
const oauthFormActionSources = getOAuthFormActionSources(
  supabaseConnectSources[0],
);
const turnstileSource = "https://challenges.cloudflare.com";

export const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${turnstileSource}${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self'${supabaseConnectSources.length ? ` ${supabaseConnectSources.join(" ")}` : ""} ${turnstileSource}`,
      `frame-src ${turnstileSource}`,
      "object-src 'none'",
      "base-uri 'self'",
      `form-action 'self'${oauthFormActionSources.length ? ` ${oauthFormActionSources.join(" ")}` : ""}`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
] as const;

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;

function getSupabaseConnectSources(): string[] {
  const configuredUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  ).trim();
  if (!configuredUrl) {
    return [];
  }

  try {
    const url = new URL(configuredUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      return [];
    }

    const socketUrl = new URL(url.origin);
    socketUrl.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    return [url.origin, socketUrl.origin];
  } catch {
    return [];
  }
}

function getOAuthFormActionSources(
  supabaseOrigin: string | undefined,
): string[] {
  const googleOauthEnabled = [
    process.env.SKILLMINT_PUBLIC_OAUTH_ENABLED,
    process.env.SKILLMINT_PUBLIC_OAUTH_GOOGLE_ENABLED,
  ].every((value) => (value ?? "").trim().toLowerCase() === "true");

  if (!googleOauthEnabled || !supabaseOrigin) {
    return [];
  }

  return [supabaseOrigin, "https://accounts.google.com"];
}
