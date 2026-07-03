type SkillDefinition = {
  name: string;
  patterns: RegExp[];
};

const KNOWN_SKILLS: SkillDefinition[] = [
  {
    name: "JavaScript",
    patterns: [/\bjavascript\b/i, /\bjs\b/i],
  },
  {
    name: "TypeScript",
    patterns: [/\btypescript\b/i],
  },
  {
    name: "React",
    patterns: [/\breact(?:\.js|js)?\b/i],
  },
  {
    name: "Next.js",
    patterns: [/\bnext(?:\.js|js)?\b/i],
  },
  {
    name: "Node.js",
    patterns: [/\bnode(?:\.js|js)?\b/i],
  },
  {
    name: "Express",
    patterns: [/\bexpress(?:\.js|js)?\b/i],
  },
  {
    name: "MongoDB",
    patterns: [/\bmongodb\b/i],
  },
  {
    name: "SQL",
    patterns: [/\bsql\b/i],
  },
  {
    name: "MySQL",
    patterns: [/\bmysql\b/i],
  },
  {
    name: "PostgreSQL",
    patterns: [/\bpostgresql\b/i, /\bpostgres\b/i],
  },
  {
    name: "Python",
    patterns: [/\bpython\b/i],
  },
  {
    name: "Java",
    patterns: [/\bjava\b/i],
  },
  {
    name: "C++",
    patterns: [/\bc\+\+\b/i, /\bcpp\b/i],
  },
  {
    name: "C",
    patterns: [/(?<![a-z0-9+#.])c(?![a-z0-9+#.])/i],
  },
  {
    name: "HTML",
    patterns: [/\bhtml\b/i],
  },
  {
    name: "CSS",
    patterns: [/\bcss\b/i],
  },
  {
    name: "Tailwind CSS",
    patterns: [/\btailwind(?:\s+css)?\b/i],
  },
  {
    name: "Git",
    patterns: [/\bgit\b/i],
  },
  {
    name: "GitHub",
    patterns: [/\bgithub\b/i, /\bgithub\.com\b/i],
  },
  {
    name: "AWS",
    patterns: [/\baws\b/i, /\bamazon\s+web\s+services\b/i],
  },
  {
    name: "Azure",
    patterns: [/\bazure\b/i],
  },
  {
    name: "GCP",
    patterns: [/\bgcp\b/i, /\bgoogle\s+cloud\b/i],
  },
  {
    name: "Docker",
    patterns: [/\bdocker\b/i],
  },
  {
    name: "Kubernetes",
    patterns: [/\bkubernetes\b/i, /\bk8s\b/i],
  },
  {
    name: "Linux",
    patterns: [/\blinux\b/i],
  },
  {
    name: "Firebase",
    patterns: [/\bfirebase\b/i],
  },
  {
    name: "Supabase",
    patterns: [/\bsupabase\b/i],
  },
  {
    name: "REST API",
    patterns: [/\brest(?:ful)?\s+api\b/i, /\brestful\b/i],
  },
  {
    name: "GraphQL",
    patterns: [/\bgraphql\b/i],
  },
  {
    name: "Machine Learning",
    patterns: [/\bmachine\s+learning\b/i, /\bml\b/i],
  },
  {
    name: "Deep Learning",
    patterns: [/\bdeep\s+learning\b/i],
  },
  {
    name: "TensorFlow",
    patterns: [/\btensorflow\b/i],
  },
  {
    name: "PyTorch",
    patterns: [/\bpytorch\b/i],
  },
  {
    name: "Pandas",
    patterns: [/\bpandas\b/i],
  },
  {
    name: "NumPy",
    patterns: [/\bnumpy\b/i],
  },
  {
    name: "Scikit-learn",
    patterns: [/\bscikit[-\s]?learn\b/i, /\bsklearn\b/i],
  },
  {
    name: "Power BI",
    patterns: [/\bpower\s*bi\b/i],
  },
  {
    name: "Tableau",
    patterns: [/\btableau\b/i],
  },
];

export function extractSkills(text: string): string[] {
  if (!text.trim()) {
    return [];
  }

  const detectedSkills = new Set<string>();

  for (const skill of KNOWN_SKILLS) {
    if (skill.patterns.some((pattern) => pattern.test(text))) {
      detectedSkills.add(skill.name);
    }
  }

  return Array.from(detectedSkills);
}
