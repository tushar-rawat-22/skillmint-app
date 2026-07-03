import type { ParsedResumeProfile } from "@/lib/parser/profileBuilder";

const URL_PATTERN =
  /\b(?:https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|(?:github|linkedin|leetcode|codeforces)\.com\/[^\s<>()]+)/gi;
const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const INDIAN_PHONE_PATTERN =
  /\b(?:\+91[\s-]?|91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/;

export function extractLinks(
  text: string,
): ParsedResumeProfile["links"] {
  if (!text.trim()) {
    return {};
  }

  const links: ParsedResumeProfile["links"] = {};
  const urls = extractUrls(text);

  for (const url of urls) {
    if (!links.github && /github\.com/i.test(url)) {
      links.github = normalizeUrl(url);
      continue;
    }

    if (!links.linkedin && /linkedin\.com/i.test(url)) {
      links.linkedin = normalizeUrl(url);
      continue;
    }

    if (!links.leetcode && /leetcode\.com/i.test(url)) {
      links.leetcode = normalizeUrl(url);
      continue;
    }

    if (!links.codeforces && /codeforces\.com/i.test(url)) {
      links.codeforces = normalizeUrl(url);
      continue;
    }

    if (!links.portfolio) {
      links.portfolio = normalizeUrl(url);
    }
  }

  const emailMatch = text.match(EMAIL_PATTERN);

  if (emailMatch?.[0]) {
    links.email = emailMatch[0];
  }

  const phoneMatch = text.match(INDIAN_PHONE_PATTERN);

  if (phoneMatch?.[0]) {
    links.phone = phoneMatch[0].replace(/\s+/g, " ").trim();
  }

  return links;
}

function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];

  return uniqueEntries(
    matches.map((url) => url.replace(/[),.;]+$/g, "").trim()),
  );
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

function uniqueEntries(entries: string[]): string[] {
  const seenEntries = new Set<string>();
  const unique: string[] = [];

  for (const entry of entries) {
    const key = entry.toLowerCase();

    if (!key || seenEntries.has(key)) {
      continue;
    }

    seenEntries.add(key);
    unique.push(entry);
  }

  return unique;
}
