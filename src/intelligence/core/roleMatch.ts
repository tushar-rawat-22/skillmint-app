import { UserProfile } from "../types/profile";
import { RoleMatchResult } from "../types/results";
import { calculateCodingProfileScore } from "./coding";

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
      (matchedRequired.length / careerRole.requiredSkills.length) * 75;

    const bonusScore =
      (matchedBonus.length / careerRole.bonusSkills.length) * 15;

    const codingBonus =
      codingScore >= 80
        ? 10
        : codingScore >= 60
          ? 6
          : codingScore >= 40
            ? 3
            : 0;

    const matchScore = Math.min(
      Math.round(requiredScore + bonusScore + codingBonus),
      100
    );

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