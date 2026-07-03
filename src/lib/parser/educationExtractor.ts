const EDUCATION_PATTERN =
  /\b(?:b\.?\s?tech|btech|bachelor|b\.?\s?e\.?|computer\s+science|cse|university|college|school|cgpa|gpa|10th|12th)\b/i;

export function extractEducation(text: string): string[] {
  if (!text.trim()) {
    return [];
  }

  const entries = text
    .replace(/\r/g, "\n")
    .split("\n")
    .map(cleanEntry)
    .filter((line) => line && EDUCATION_PATTERN.test(line));

  return uniqueEntries(entries).slice(0, 6);
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
