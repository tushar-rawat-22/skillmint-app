import type {
  ParsedProofProfile,
  ProofLinkCandidate,
  ProofLinkType,
} from "./types";

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>"'`)\]}]+|\b(?:github\.com|leetcode\.com|linkedin\.com|kaggle\.com|behance\.net|figma\.com|dribbble\.com|medium\.com|hashnode\.com|dev\.to|huggingface\.co)[^\s<>"'`)\]}]*/gi;

const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?]+$/;

const LINK_LABELS: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  leetcode: "LeetCode",
  codeforces: "Codeforces",
};

export function extractProofLinks(
  resumeText = "",
  parsedProfile?: ParsedProofProfile | null,
): ProofLinkCandidate[] {
  const candidates = [
    ...extractLinksFromResumeText(resumeText),
    ...extractLinksFromParsedProfile(parsedProfile),
  ];
  const seenUrls = new Set<string>();
  const dedupedCandidates: ProofLinkCandidate[] = [];

  for (const candidate of candidates) {
    if (seenUrls.has(candidate.normalizedUrl)) {
      continue;
    }

    seenUrls.add(candidate.normalizedUrl);
    dedupedCandidates.push(candidate);
  }

  return dedupedCandidates;
}

export function createEmptyLinkTypeCounts(): Record<ProofLinkType, number> {
  return {
    github_profile: 0,
    github_repo: 0,
    leetcode: 0,
    linkedin: 0,
    portfolio: 0,
    live_project: 0,
    kaggle: 0,
    behance: 0,
    figma: 0,
    dribbble: 0,
    medium: 0,
    hashnode: 0,
    devto: 0,
    certification: 0,
    dashboard: 0,
    app_store: 0,
    huggingface: 0,
    google_drive: 0,
    other: 0,
  };
}

export function countProofLinkTypes(
  links: ProofLinkCandidate[],
): Record<ProofLinkType, number> {
  const counts = createEmptyLinkTypeCounts();

  for (const link of links) {
    counts[link.type] += 1;
  }

  return counts;
}

function extractLinksFromResumeText(text: string): ProofLinkCandidate[] {
  const matches = text.match(URL_PATTERN) ?? [];

  return matches.flatMap((rawUrl) => {
    const url = cleanUrl(rawUrl);
    const normalizedUrl = normalizeUrl(url);

    if (!normalizedUrl) {
      return [];
    }

    return [
      {
        url,
        normalizedUrl,
        type: classifyProofLink(url),
        source: "resume_text",
        label: getReadableHost(url),
      },
    ];
  });
}

function extractLinksFromParsedProfile(
  parsedProfile?: ParsedProofProfile | null,
): ProofLinkCandidate[] {
  const links = parsedProfile?.links;

  if (!links) {
    return [];
  }

  return Object.entries(links).flatMap(([key, rawValue]) => {
    if (!rawValue || key === "email" || key === "phone") {
      return [];
    }

    const url = cleanUrl(rawValue);
    const normalizedUrl = normalizeUrl(url);

    if (!normalizedUrl) {
      return [];
    }

    return [
      {
        url,
        normalizedUrl,
        type: classifyProofLink(url, key),
        source: "parsed_profile",
        label: LINK_LABELS[key] ?? getReadableHost(url),
      },
    ];
  });
}

function classifyProofLink(url: string, sourceKey?: string): ProofLinkType {
  const parsedUrl = parseUrl(url);
  const hostname = parsedUrl?.hostname.replace(/^www\./, "").toLowerCase() ??
    normalizeUrl(url);
  const pathname = parsedUrl?.pathname.toLowerCase() ?? "";

  if (sourceKey === "portfolio") {
    return "portfolio";
  }

  if (hostname.includes("github.com")) {
    return isGitHubRepoPath(pathname) ? "github_repo" : "github_profile";
  }

  if (hostname.includes("leetcode.com")) return "leetcode";
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.includes("kaggle.com")) return "kaggle";
  if (hostname.includes("behance.net")) return "behance";
  if (hostname.includes("figma.com")) return "figma";
  if (hostname.includes("dribbble.com")) return "dribbble";
  if (hostname.includes("medium.com")) return "medium";
  if (hostname.includes("hashnode")) return "hashnode";
  if (hostname === "dev.to" || hostname.endsWith(".dev.to")) return "devto";
  if (hostname.includes("huggingface.co")) return "huggingface";
  if (hostname.includes("drive.google.com")) return "google_drive";

  if (
    hostname.includes("credly.com") ||
    hostname.includes("coursera.org") ||
    hostname.includes("udemy.com") ||
    hostname.includes("certificate") ||
    pathname.includes("certificate") ||
    pathname.includes("certification")
  ) {
    return "certification";
  }

  if (
    hostname.includes("public.tableau.com") ||
    hostname.includes("powerbi.com") ||
    hostname.includes("lookerstudio.google.com") ||
    hostname.includes("datastudio.google.com")
  ) {
    return "dashboard";
  }

  if (hostname.includes("apps.apple.com") || hostname.includes("play.google.com")) {
    return "app_store";
  }

  if (
    hostname.includes("vercel.app") ||
    hostname.includes("netlify.app") ||
    hostname.includes("github.io") ||
    hostname.includes("pages.dev") ||
    hostname.includes("firebaseapp.com") ||
    hostname.includes("web.app") ||
    hostname.includes("onrender.com") ||
    hostname.includes("railway.app") ||
    hostname.includes("herokuapp.com")
  ) {
    return "live_project";
  }

  if (hostname.includes("portfolio") || pathname.includes("portfolio")) {
    return "portfolio";
  }

  return "other";
}

function cleanUrl(url: string): string {
  return url.trim().replace(TRAILING_PUNCTUATION_PATTERN, "");
}

function normalizeUrl(url: string): string {
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return cleanUrl(url).toLowerCase();
  }

  const pathname = parsedUrl.pathname.replace(/\/$/, "");

  return `${parsedUrl.hostname.replace(/^www\./, "").toLowerCase()}${pathname}`;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return null;
  }
}

function getReadableHost(url: string): string {
  const parsedUrl = parseUrl(url);

  return parsedUrl?.hostname.replace(/^www\./, "") ?? "Proof link";
}

function isGitHubRepoPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const reservedPaths = new Set([
    "about",
    "collections",
    "enterprise",
    "events",
    "explore",
    "features",
    "login",
    "marketplace",
    "pricing",
    "readme",
    "search",
    "signup",
    "topics",
    "trending",
  ]);

  return segments.length >= 2 && !reservedPaths.has(segments[0] ?? "");
}
