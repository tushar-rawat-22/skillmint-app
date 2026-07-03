import { UserProfile } from "../types/profile";
import { RoleMatchResult } from "../types/results";
import { calculateCodingProfileScore } from "./coding";
import { clamp, hasPlaceholderText, scaleScore } from "./utils";

type CareerRole = {
  role: string;
  category: string;
  salaryRange: string;
  difficulty: "Easy" | "Medium" | "Hard";
  requiredSkills: string[];
  bonusSkills: string[];
};

const CAREER_ROLES: CareerRole[] = [
  {
    role: "Frontend Engineer",
    category: "Software Engineering",
    salaryRange: "₹6–18 LPA",
    difficulty: "Easy",
    requiredSkills: [
      "html",
      "css",
      "javascript",
      "typescript",
      "react",
      "next.js",
    ],
    bonusSkills: ["tailwind css", "figma", "testing", "accessibility"],
  },
  {
    role: "Backend Engineer",
    category: "Software Engineering",
    salaryRange: "₹8–24 LPA",
    difficulty: "Medium",
    requiredSkills: [
      "node.js",
      "java",
      "python",
      "sql",
      "rest api",
      "mongodb",
    ],
    bonusSkills: ["docker", "redis", "kubernetes", "system design"],
  },
  {
    role: "Full Stack Engineer",
    category: "Software Engineering",
    salaryRange: "₹7–22 LPA",
    difficulty: "Medium",
    requiredSkills: [
      "javascript",
      "typescript",
      "react",
      "node.js",
      "sql",
      "rest api",
    ],
    bonusSkills: ["next.js", "mongodb", "docker", "aws"],
  },
  {
    role: "Data Engineer",
    category: "Data",
    salaryRange: "₹8–26 LPA",
    difficulty: "Medium",
    requiredSkills: [
      "python",
      "sql",
      "etl",
      "spark",
      "hadoop",
      "database",
    ],
    bonusSkills: ["aws", "airflow", "kafka", "snowflake"],
  },
  {
    role: "AI Engineer",
    category: "Artificial Intelligence",
    salaryRange: "₹10–30 LPA",
    difficulty: "Hard",
    requiredSkills: [
      "python",
      "machine learning",
      "deep learning",
      "tensorflow",
      "pytorch",
      "llm",
    ],
    bonusSkills: ["rag", "vector database", "langchain", "agents"],
  },
  {
    role: "Cloud / DevOps Engineer",
    category: "Infrastructure",
    salaryRange: "₹8–28 LPA",
    difficulty: "Medium",
    requiredSkills: [
      "linux",
      "docker",
      "kubernetes",
      "aws",
      "ci/cd",
      "terraform",
    ],
    bonusSkills: ["monitoring", "nginx", "devops", "cloud"],
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getCandidateSkillSet(profile: UserProfile): Set<string> {
  return new Set(profile.skills.map(normalize));
}

export function calculateRoleMatches(
  profile: UserProfile
): RoleMatchResult[] {
  const candidateSkills = getCandidateSkillSet(profile);
  const codingScore = calculateCodingProfileScore(profile.codingProfiles);
  const projectText = profile.projects.join(" ").toLowerCase();

  return CAREER_ROLES.map((careerRole) => {
    const matchedRequired = careerRole.requiredSkills.filter((skill) =>
      candidateSkills.has(normalize(skill))
    );

    const matchedBonus = careerRole.bonusSkills.filter((skill) =>
      candidateSkills.has(normalize(skill))
    );

    const missingRequired = careerRole.requiredSkills.filter((skill) =>
      !candidateSkills.has(normalize(skill))
    );

    const requiredScore =
      (matchedRequired.length / careerRole.requiredSkills.length) * 55;

    const bonusScore =
      (matchedBonus.length / careerRole.bonusSkills.length) * 10;

    const proofScore =
      scaleScore(profile.projectsScore, 15, 15) +
      scaleScore(profile.experienceScore, 12, 7) +
      scaleScore(profile.githubScore, 8, 5) +
      getRoleCodingBonus(careerRole, codingScore);

    let matchScore = requiredScore + bonusScore + proofScore;

    if (matchedRequired.length && profile.projectsScore < 9) {
      matchScore = Math.min(matchScore, 60);
    }

    if (!profile.experience.length && !profile.github) {
      matchScore = Math.min(matchScore, 58);
    }

    if (profile.projectsScore < 9) {
      matchScore = Math.min(matchScore, 62);
    }

    matchScore = applyRoleCaps(
      careerRole,
      profile,
      candidateSkills,
      projectText,
      matchScore,
    );

    if (hasPlaceholderText(profile)) {
      matchScore = Math.min(matchScore, 25);
    }

    matchScore = Math.round(clamp(matchScore, 0, 100));

    return {
      role: careerRole.role,
      category: careerRole.category,
      salaryRange: careerRole.salaryRange,
      difficulty: careerRole.difficulty,
      matchScore,
      why: [...matchedRequired, ...matchedBonus].slice(0, 6),
      gaps: missingRequired.slice(0, 5),
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

function getRoleCodingBonus(
  careerRole: CareerRole,
  codingScore: number,
): number {
  if (
    careerRole.role === "AI Engineer" ||
    careerRole.role === "Backend Engineer" ||
    careerRole.role === "Full Stack Engineer"
  ) {
    if (codingScore >= 80) return 8;
    if (codingScore >= 60) return 5;
    if (codingScore >= 40) return 2;
  }

  return 0;
}

function applyRoleCaps(
  careerRole: CareerRole,
  profile: UserProfile,
  candidateSkills: Set<string>,
  projectText: string,
  currentScore: number,
): number {
  let score = currentScore;

  if (careerRole.role === "Full Stack Engineer") {
    const hasFrontend = hasAnySkill(candidateSkills, [
      "html",
      "css",
      "javascript",
      "typescript",
      "react",
      "next.js",
    ]);
    const hasBackend = hasAnySkill(candidateSkills, [
      "node.js",
      "java",
      "python",
      "sql",
      "rest api",
      "mongodb",
    ]);

    if (!hasFrontend || !hasBackend) {
      score = Math.min(score, 65);
    }
  }

  if (
    careerRole.role === "AI Engineer" &&
    !/\b(?:machine learning|deep learning|ai|tensorflow|pytorch|model|llm)\b/i.test(
      projectText,
    )
  ) {
    score = Math.min(score, 55);
  }

  if (
    careerRole.role === "Cloud / DevOps Engineer" &&
    !/\b(?:docker|kubernetes|linux|aws|azure|gcp|cloud|ci\/cd|terraform)\b/i.test(
      `${projectText} ${profile.skills.join(" ")}`,
    )
  ) {
    score = Math.min(score, 55);
  }

  if (
    careerRole.role === "Data Engineer" &&
    !/\b(?:sql|python|pandas|numpy|etl|spark|hadoop|database|analytics)\b/i.test(
      `${projectText} ${profile.skills.join(" ")}`,
    )
  ) {
    score = Math.min(score, 60);
  }

  return score;
}

function hasAnySkill(
  candidateSkills: Set<string>,
  skills: string[],
): boolean {
  return skills.some((skill) => candidateSkills.has(normalize(skill)));
}
