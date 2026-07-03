const PROJECT_HEADINGS = [
  "projects",
  "academic projects",
  "personal projects",
  "major projects",
];

const MAJOR_SECTION_HEADINGS = [
  "experience",
  "work experience",
  "internship",
  "internships",
  "professional experience",
  "education",
  "skills",
  "technical skills",
  "certifications",
  "certification",
  "achievements",
  "leadership",
  "summary",
  "profile",
];

export function extractProjects(text: string): string[] {
  if (!text.trim()) {
    return [];
  }

  return uniqueEntries(extractSectionEntries(text, PROJECT_HEADINGS)).slice(
    0,
    8,
  );
}

function extractSectionEntries(
  text: string,
  sectionHeadings: string[],
): string[] {
  const lines = getLines(text);
  const entries: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const headingMatch = getHeadingMatch(line, sectionHeadings);

    if (headingMatch) {
      collecting = true;

      if (headingMatch.inlineText) {
        entries.push(headingMatch.inlineText);
      }

      continue;
    }

    if (!collecting) {
      continue;
    }

    if (isSectionHeading(line, MAJOR_SECTION_HEADINGS)) {
      break;
    }

    const cleanedLine = cleanEntry(line);

    if (cleanedLine) {
      entries.push(cleanedLine);
    }
  }

  return entries;
}

function getLines(text: string): string[] {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getHeadingMatch(
  line: string,
  sectionHeadings: string[],
): { inlineText?: string } | null {
  const normalizedLine = normalizeHeading(line);

  for (const heading of sectionHeadings) {
    if (normalizedLine === heading) {
      return {};
    }

    const inlineMatch = line.match(
      new RegExp(`^\\s*${escapeRegExp(heading)}\\s*:\\s*(.+)$`, "i"),
    );

    if (inlineMatch?.[1]) {
      return {
        inlineText: cleanEntry(inlineMatch[1]),
      };
    }
  }

  return null;
}

function isSectionHeading(
  line: string,
  sectionHeadings: string[],
): boolean {
  const normalizedLine = normalizeHeading(line);

  return sectionHeadings.includes(normalizedLine);
}

function normalizeHeading(line: string): string {
  return line
    .toLowerCase()
    .replace(/[:|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanEntry(line: string): string {
  return line
    .replace(/^[\s\-*+\u2022\u25CF\u25E6\u2013\u2014]+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
