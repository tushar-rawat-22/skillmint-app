import { extractCertifications } from "@/lib/parser/certificationExtractor";
import { extractEducation } from "@/lib/parser/educationExtractor";
import { extractExperience } from "@/lib/parser/experienceExtractor";
import { extractLinks } from "@/lib/parser/linkExtractor";
import { extractProjects } from "@/lib/parser/projectExtractor";
import { extractSkills } from "@/lib/parser/skillExtractor";

export interface ParsedResumeProfile {
  skills: string[];
  projects: string[];
  education: string[];
  experience: string[];
  certifications: string[];
  links: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    leetcode?: string;
    codeforces?: string;
    email?: string;
    phone?: string;
  };
  rawSections: {
    skills?: string;
    projects?: string;
    education?: string;
    experience?: string;
    certifications?: string;
  };
}

const EMPTY_PROFILE: ParsedResumeProfile = {
  skills: [],
  projects: [],
  education: [],
  experience: [],
  certifications: [],
  links: {},
  rawSections: {},
};

const SECTION_HEADINGS = {
  skills: ["skills", "technical skills"],
  projects: [
    "projects",
    "academic projects",
    "personal projects",
    "major projects",
  ],
  education: ["education"],
  experience: [
    "experience",
    "work experience",
    "internship",
    "internships",
    "professional experience",
  ],
  certifications: [
    "certifications",
    "certification",
    "licenses and certifications",
    "licenses & certifications",
    "courses",
  ],
} as const;

const MAJOR_SECTION_HEADINGS = [
  ...SECTION_HEADINGS.skills,
  ...SECTION_HEADINGS.projects,
  ...SECTION_HEADINGS.education,
  ...SECTION_HEADINGS.experience,
  ...SECTION_HEADINGS.certifications,
  "achievements",
  "leadership",
  "summary",
  "profile",
  "contact",
];

export function parseResumeText(text: string): ParsedResumeProfile {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return createEmptyProfile();
  }

  return {
    skills: safeExtract(() => extractSkills(normalizedText), []),
    projects: safeExtract(() => extractProjects(normalizedText), []),
    education: safeExtract(() => extractEducation(normalizedText), []),
    experience: safeExtract(() => extractExperience(normalizedText), []),
    certifications: safeExtract(
      () => extractCertifications(normalizedText),
      [],
    ),
    links: safeExtract(() => extractLinks(normalizedText), {}),
    rawSections: buildRawSections(normalizedText),
  };
}

function buildRawSections(
  text: string,
): ParsedResumeProfile["rawSections"] {
  return {
    skills: extractRawSection(text, SECTION_HEADINGS.skills),
    projects: extractRawSection(text, SECTION_HEADINGS.projects),
    education: extractRawSection(text, SECTION_HEADINGS.education),
    experience: extractRawSection(text, SECTION_HEADINGS.experience),
    certifications: extractRawSection(
      text,
      SECTION_HEADINGS.certifications,
    ),
  };
}

function extractRawSection(
  text: string,
  sectionHeadings: readonly string[],
): string | undefined {
  const lines = getLines(text);
  const sectionLines: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const headingMatch = getHeadingMatch(line, sectionHeadings);

    if (headingMatch) {
      collecting = true;

      if (headingMatch.inlineText) {
        sectionLines.push(headingMatch.inlineText);
      }

      continue;
    }

    if (!collecting) {
      continue;
    }

    if (isSectionHeading(line, MAJOR_SECTION_HEADINGS)) {
      break;
    }

    sectionLines.push(line);
  }

  const rawSection = sectionLines.join("\n").trim();

  return rawSection || undefined;
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
  sectionHeadings: readonly string[],
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
        inlineText: inlineMatch[1].trim(),
      };
    }
  }

  return null;
}

function isSectionHeading(
  line: string,
  sectionHeadings: readonly string[],
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

function safeExtract<T>(extractor: () => T, fallback: T): T {
  try {
    return extractor();
  } catch {
    return fallback;
  }
}

function createEmptyProfile(): ParsedResumeProfile {
  return {
    skills: [...EMPTY_PROFILE.skills],
    projects: [...EMPTY_PROFILE.projects],
    education: [...EMPTY_PROFILE.education],
    experience: [...EMPTY_PROFILE.experience],
    certifications: [...EMPTY_PROFILE.certifications],
    links: {},
    rawSections: {},
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
