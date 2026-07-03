import type { TargetRoleSetup } from "@/modules/onboarding/types";

export function getTargetRoleRecommendation(
  setup: TargetRoleSetup,
): {
  headline: string;
  message: string;
  nextActions: string[];
} {
  if (setup.preferredJobType === "not_sure") {
    return {
      headline: "Start broad, then narrow with evidence.",
      message:
        "You do not need to guess your perfect role yet. Upload your resume first and use SkillMint signals to discover where your current proof is strongest.",
      nextActions: [
        "Upload your resume and review detected skills, projects, and gaps.",
        "Compare two or three beginner-friendly job descriptions before choosing a track.",
        "Pick one direction only after you see where your resume already has proof.",
      ],
    };
  }

  if (
    setup.preferredJobType === "full_stack" &&
    (setup.experienceLevel === "student" ||
      setup.experienceLevel === "fresher")
  ) {
    return {
      headline: "Build one full-stack proof project before applying widely.",
      message:
        "For early-career full-stack roles, proof matters more than listing every framework. Show that you can connect UI, backend, database, and deployment.",
      nextActions: [
        "Upload your resume so SkillMint can find missing proof and keywords.",
        "Build one full-stack project with auth, database, REST APIs, and deployment.",
        "Run ATS Match against one real internship or fresher JD before applying.",
      ],
    };
  }

  const recommendationByType = {
    frontend: {
      headline: "Lead with a polished UI project.",
      message:
        "Frontend direction needs visible proof: responsive layout, API integration, accessibility, and performance signals.",
      projectAction:
        "Build a portfolio UI project with responsive screens, API data, accessibility checks, and a live link.",
    },
    backend: {
      headline: "Lead with API, database, and auth proof.",
      message:
        "Backend direction needs evidence that you can design reliable services, validate data, and work with persistence.",
      projectAction:
        "Build an API project with database models, auth, validation, error handling, and basic tests.",
    },
    full_stack: {
      headline: "Show one complete product flow.",
      message:
        "Full-stack direction needs proof that you can connect frontend, backend, database, and deployment into one usable workflow.",
      projectAction:
        "Build one focused full-stack app with auth, database, REST APIs, deployment, and a clear README.",
    },
    ai_ml: {
      headline: "Show model work with measurable evaluation.",
      message:
        "AI/ML direction needs more than notebooks. Show data handling, model choices, metrics, explanation, and a small deployed demo if possible.",
      projectAction:
        "Build a dataset-to-model project with preprocessing, evaluation metrics, explanation, and a simple deployment or demo.",
    },
    data: {
      headline: "Show SQL, pipelines, and decision-ready dashboards.",
      message:
        "Data direction needs proof that you can clean, query, transform, and present data clearly.",
      projectAction:
        "Build a SQL/dashboard/data pipeline project with ETL notes, queries, charts, and a business-style summary.",
    },
    devops: {
      headline: "Show deployment automation proof.",
      message:
        "DevOps direction needs evidence that you can package, ship, and monitor a project repeatably.",
      projectAction:
        "Build deployment proof with Docker, CI/CD, cloud deployment, environment setup, and monitoring notes.",
    },
    product: {
      headline: "Show product thinking with execution proof.",
      message:
        "Product direction needs evidence that you can define a user problem, prioritize scope, and communicate outcomes.",
      projectAction:
        "Create a product case study with problem framing, user flow, MVP scope, metrics, and a clickable prototype or shipped project.",
    },
  } satisfies Record<
    Exclude<TargetRoleSetup["preferredJobType"], "not_sure">,
    {
      headline: string;
      message: string;
      projectAction: string;
    }
  >;

  const recommendation = recommendationByType[setup.preferredJobType];

  return {
    headline: recommendation.headline,
    message: recommendation.message,
    nextActions: [
      "Upload your resume so SkillMint can compare your current proof against the role.",
      recommendation.projectAction,
      "Paste a real job description into ATS Match before applying.",
    ],
  };
}
