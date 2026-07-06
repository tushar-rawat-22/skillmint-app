import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type { ResumeRewritePlan } from "@/intelligence/core/resumeRewrite";
import type { UserProfile } from "@/intelligence/types/profile";

export interface RoadmapTask {
  title: string;
  reason: string;
  action: string;
  category:
    | "Skills"
    | "Projects"
    | "Resume"
    | "ATS"
    | "GitHub"
    | "Portfolio"
    | "Applications"
    | "Interview";
  priority: "High" | "Medium" | "Low";
  estimatedTime: string;
}

export interface RoadmapPhase {
  title: string;
  goal: string;
  tasks: RoadmapTask[];
}

export interface CareerRoadmap {
  targetRole: string;
  readiness:
    | "Not ready"
    | "Getting ready"
    | "Apply selectively"
    | "Ready to apply";
  brutalSummary: string;
  currentBlockers: string[];
  thirtyDayPlan: RoadmapPhase;
  sixtyDayPlan: RoadmapPhase;
  ninetyDayPlan: RoadmapPhase;
  weeklyMissions: RoadmapTask[];
  projectRoadmap: RoadmapTask[];
  skillRoadmap: RoadmapTask[];
  applicationStrategy: string[];
}

export interface CareerRoadmapContext {
  targetRole?: string;
  setupTargetRole?: string;
  jobDescription?: string;
}

type RoadmapDomain =
  | "fullStack"
  | "frontend"
  | "backend"
  | "ai"
  | "devops"
  | "data"
  | "general";

export function generateCareerRoadmap(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult | null,
  improvementPlan: ResumeImprovementPlan | null,
  rewritePlan: ResumeRewritePlan | null,
  context: CareerRoadmapContext = {},
): CareerRoadmap {
  const readiness = getReadiness(matchResult);
  const domain = detectRoadmapDomain(
    profile,
    matchResult,
    rewritePlan,
    context,
  );
  const targetRole = getTargetRole(
    domain,
    matchResult,
    rewritePlan,
    context,
  );
  const missingTerms = getMissingTerms(matchResult, improvementPlan);
  const currentBlockers = getCurrentBlockers(
    profile,
    matchResult,
    improvementPlan,
  );

  return {
    targetRole,
    readiness,
    brutalSummary: getBrutalSummary(readiness, matchResult),
    currentBlockers,
    thirtyDayPlan: getThirtyDayPlan(
      profile,
      domain,
      missingTerms,
      rewritePlan,
    ),
    sixtyDayPlan: getSixtyDayPlan(domain, missingTerms),
    ninetyDayPlan: getNinetyDayPlan(readiness, profile),
    weeklyMissions: getWeeklyMissions(
      readiness,
      profile,
      domain,
      missingTerms,
    ),
    projectRoadmap: getProjectRoadmap(domain),
    skillRoadmap: getSkillRoadmap(missingTerms, matchResult),
    applicationStrategy: getApplicationStrategy(readiness),
  };
}

function getReadiness(
  matchResult: JobDescriptionMatchResult | null,
): CareerRoadmap["readiness"] {
  if (!matchResult) return "Not ready";
  if (matchResult.matchScore >= 78) return "Ready to apply";
  if (matchResult.matchScore >= 65) return "Apply selectively";
  if (matchResult.matchScore >= 50) return "Getting ready";

  return "Not ready";
}

function getBrutalSummary(
  readiness: CareerRoadmap["readiness"],
  matchResult: JobDescriptionMatchResult | null,
): string {
  if (!matchResult) {
    return "You do not have a target JD match yet, so this roadmap is generic. Pick a real role before trusting your application strategy.";
  }

  if (readiness === "Not ready") {
    return "You are not ready for this role yet. Your biggest gap is proof, not motivation.";
  }

  if (readiness === "Getting ready") {
    return "You have partial overlap, but your resume needs stronger project evidence before applying.";
  }

  if (readiness === "Apply selectively") {
    return "You can apply selectively, but tailor your resume and add proof first.";
  }

  return "You are close enough to apply, but still improve keywords and interview readiness.";
}

function getCurrentBlockers(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult | null,
  improvementPlan: ResumeImprovementPlan | null,
): string[] {
  const blockers: string[] = [];

  if (!matchResult) {
    blockers.push(
      "No job description match yet, so SkillMint cannot judge role-specific readiness.",
    );
  } else if (matchResult.matchScore < 50) {
    blockers.push(
      `Your latest JD match is only ${matchResult.matchScore}%, so applying now would likely be too early.`,
    );
  } else if (matchResult.matchScore < 65) {
    blockers.push(
      `Your latest JD match is ${matchResult.matchScore}%, which means you need more proof before this becomes a strong application.`,
    );
  }

  if (matchResult?.missingSkills.length) {
    blockers.push(
      `Missing JD skills: ${formatInlineList(
        matchResult.missingSkills.slice(0, 5),
      )}.`,
    );
  }

  if (matchResult?.missingKeywords.length) {
    blockers.push(
      `Missing ATS keywords: ${formatInlineList(
        matchResult.missingKeywords.slice(0, 5),
      )}.`,
    );
  }

  if (!profile.projects.length || profile.projectsScore < 9) {
    blockers.push(
      "Project proof is weak. Recruiters need concrete work, not only listed skills.",
    );
  }

  if (!profile.github && !profile.analysisFlags?.hasProofLink) {
    blockers.push(
      "Public proof is thin. Add GitHub, live demos, or portfolio links where possible.",
    );
  }

  if (!profile.analysisFlags?.hasMeasurableImpact) {
    blockers.push(
      "Resume bullets need truthful metrics, scale, or before-after outcomes.",
    );
  }

  if (!profile.analysisFlags?.hasSectionClarity || profile.atsScore <= 2) {
    blockers.push(
      "ATS section clarity needs work before the resume is easy to scan.",
    );
  }

  improvementPlan?.priorityFixes.slice(0, 2).forEach((fix) => {
    blockers.push(fix.title);
  });

  if (!blockers.length) {
    blockers.push(
      "No major blocker detected, but keep improving proof, keywords, and interview readiness.",
    );
  }

  return uniqueValues(blockers).slice(0, 7);
}

function getThirtyDayPlan(
  profile: UserProfile,
  domain: RoadmapDomain,
  missingTerms: string[],
  rewritePlan: ResumeRewritePlan | null,
): RoadmapPhase {
  return {
    title: "30-Day Plan",
    goal: "Clean up the resume, expose honest proof, and plan one role-aligned project before applying seriously.",
    tasks: [
      createTask({
        title: "Fix resume structure for ATS scanning",
        reason:
          "Clear sections help both ATS systems and recruiters find skills, projects, education, experience, links, and certifications.",
        action:
          "Use simple headings, remove dense paragraphs, and keep every section easy to scan.",
        category: "ATS",
        priority: profile.atsScore <= 2 ? "High" : "Medium",
        estimatedTime: "2-3 hours",
      }),
      createTask({
        title: "Add missing keywords only when truthful",
        reason: missingTerms.length
          ? `The latest JD is missing ${formatInlineList(
              missingTerms.slice(0, 5),
            )} from your detected proof.`
          : "A generic resume is weaker than a resume tailored to one real JD.",
        action:
          "Learn or build proof for each missing term before adding it to the resume.",
        category: "Skills",
        priority: missingTerms.length ? "High" : "Medium",
        estimatedTime: "3-5 hours",
      }),
      createTask({
        title: "Rewrite project bullets into proof",
        reason:
          "Project bullets should show stack, feature scope, implementation detail, links, and measurable outcome.",
        action: rewritePlan
          ? "Use the rewrite suggestions as templates, then replace every placeholder with truthful project evidence."
          : "Rewrite each project with problem, stack, your role, key features, GitHub/live link, and one truthful outcome.",
        category: "Resume",
        priority: "High",
        estimatedTime: "2-4 hours",
      }),
      createTask({
        title: "Add GitHub and live proof links",
        reason:
          "Recruiters should be able to inspect your work instead of trusting unsupported claims.",
        action:
          "Attach GitHub repositories, live demos, screenshots, or portfolio links for your strongest projects.",
        category: "GitHub",
        priority: profile.github ? "Medium" : "High",
        estimatedTime: "2-4 hours",
      }),
      createTask({
        title: "Plan one focused proof project",
        reason:
          "A focused project gives you evidence for the target role without inventing experience.",
        action: getProjectPlanAction(domain),
        category: "Projects",
        priority: "High",
        estimatedTime: "2-3 hours",
      }),
    ],
  };
}

function getSixtyDayPlan(
  domain: RoadmapDomain,
  missingTerms: string[],
): RoadmapPhase {
  return {
    title: "60-Day Plan",
    goal: "Build one strong role-aligned project and turn it into inspectable proof.",
    tasks: [
      createTask({
        title: "Build or upgrade the role-aligned project",
        reason:
          "Proof beats buzzwords. One complete project is stronger than a long list of unsupported skills.",
        action: getProjectBuildAction(domain),
        category: "Projects",
        priority: "High",
        estimatedTime: "20-35 hours",
      }),
      createTask({
        title: "Ship deployment and a clean README",
        reason:
          "A deployed project with setup steps is easier for recruiters and interviewers to trust.",
        action:
          "Deploy the project, write setup steps, explain architecture, list features, and add screenshots.",
        category: "Portfolio",
        priority: "High",
        estimatedTime: "5-8 hours",
      }),
      createTask({
        title: "Add measurable project outcomes",
        reason:
          "Numbers make project claims more credible than generic feature descriptions.",
        action:
          "Measure truthful outcomes such as load time, API latency, model accuracy, data volume, test coverage, or workflow time saved.",
        category: "Projects",
        priority: "Medium",
        estimatedTime: "3-5 hours",
      }),
      createTask({
        title: "Practice JD-relevant interview topics",
        reason:
          "A better resume can earn interviews, but interviews still require clear technical explanations.",
        action: missingTerms.length
          ? `Study and explain ${formatInlineList(
              missingTerms.slice(0, 4),
            )} through your project work.`
          : "Practice explaining your projects, tradeoffs, debugging decisions, and fundamentals.",
        category: "Interview",
        priority: "Medium",
        estimatedTime: "6-10 hours",
      }),
    ],
  };
}

function getNinetyDayPlan(
  readiness: CareerRoadmap["readiness"],
  profile: UserProfile,
): RoadmapPhase {
  const needsSecondProject =
    readiness === "Not ready" ||
    readiness === "Getting ready" ||
    profile.projectsScore < 12;

  return {
    title: "90-Day Plan",
    goal: "Apply selectively, track outcomes, and keep improving proof from real feedback.",
    tasks: [
      createTask({
        title: "Apply selectively to reasonable matches",
        reason:
          "Blind applications burn time and make it harder to learn what is working.",
        action:
          "Prioritize roles where your skills and project proof overlap with the JD, then tailor before submitting.",
        category: "Applications",
        priority:
          readiness === "Ready to apply" ||
          readiness === "Apply selectively"
            ? "High"
            : "Medium",
        estimatedTime: "3-5 hours/week",
      }),
      createTask({
        title: "Create an application tracker",
        reason:
          "Tracking responses helps you see which roles, keywords, and projects are getting traction.",
        action:
          "Track company, role, JD match score, resume version, date applied, response, interview stage, and follow-up.",
        category: "Applications",
        priority: "Medium",
        estimatedTime: "1-2 hours",
      }),
      createTask({
        title: "Prepare interview proof stories",
        reason:
          "Interviewers need evidence that you personally made technical decisions and solved problems.",
        action:
          "Prepare concise stories for your strongest project, hardest bug, tradeoff, teamwork moment, and measurable outcome.",
        category: "Interview",
        priority: "High",
        estimatedTime: "4-6 hours",
      }),
      createTask({
        title: needsSecondProject
          ? "Build a second proof project if gaps remain"
          : "Polish your strongest proof project",
        reason: needsSecondProject
          ? "If the first project still does not cover the JD, a second focused project can close a real evidence gap."
          : "At higher readiness, polish and explanation quality matter more than adding more unfinished work.",
        action: needsSecondProject
          ? "Choose one missing role requirement and build a smaller second project that proves it clearly."
          : "Improve README clarity, screenshots, tests, deployment stability, and project walkthrough notes.",
        category: "Projects",
        priority: needsSecondProject ? "Medium" : "Low",
        estimatedTime: "10-20 hours",
      }),
      createTask({
        title: "Repeat ATS matching after edits",
        reason:
          "Your roadmap should respond to improved proof, not stay frozen after one resume version.",
        action:
          "Re-run SkillMint after resume/project edits and compare new JD matches against the old ones.",
        category: "ATS",
        priority: "Medium",
        estimatedTime: "30 minutes per JD",
      }),
    ],
  };
}

function getWeeklyMissions(
  readiness: CareerRoadmap["readiness"],
  profile: UserProfile,
  domain: RoadmapDomain,
  missingTerms: string[],
): RoadmapTask[] {
  const firstMissingTerm = missingTerms[0] ?? "one target-role skill";

  return [
    createTask({
      title: "Week 1: Audit the latest JD against your resume",
      reason:
        "You need a grounded gap list before editing or applying.",
      action:
        "Mark which JD requirements are already proven, weakly proven, or not proven at all.",
      category: "ATS",
      priority: "High",
      estimatedTime: "1-2 hours",
    }),
    createTask({
      title: "Week 2: Rewrite the top resume proof sections",
      reason:
        "Strong bullets make existing work easier for recruiters to understand.",
      action:
        "Rewrite summary, skills, and project bullets with truthful stack, scope, links, and outcomes.",
      category: "Resume",
      priority: "High",
      estimatedTime: "2-4 hours",
    }),
    createTask({
      title: `Week 3: Build proof for ${firstMissingTerm}`,
      reason:
        "Missing skills should become real evidence before they become resume keywords.",
      action:
        "Create a small feature, project module, notebook, API, dashboard, or deployment that proves the skill.",
      category: "Skills",
      priority: missingTerms.length ? "High" : "Medium",
      estimatedTime: "4-8 hours",
    }),
    createTask({
      title: "Week 4: Publish GitHub evidence",
      reason:
        "Private or unclear projects do not help much in applications.",
      action:
        "Clean the repository, add README steps, screenshots, feature list, and a short architecture note.",
      category: profile.github ? "GitHub" : "Portfolio",
      priority: "Medium",
      estimatedTime: "3-5 hours",
    }),
    createTask({
      title: "Week 5: Ship one role-aligned project milestone",
      reason:
        "Progress should create visible evidence, not just more learning notes.",
      action: getProjectBuildAction(domain),
      category: "Projects",
      priority: "High",
      estimatedTime: "6-10 hours",
    }),
    createTask({
      title: "Week 6: Practice technical explanations",
      reason:
        "You need to explain tradeoffs, debugging, and implementation choices clearly.",
      action:
        "Record or write answers for project walkthrough, hardest bug, design decision, and next improvement.",
      category: "Interview",
      priority: "Medium",
      estimatedTime: "2-3 hours",
    }),
    createTask({
      title: "Week 7: Apply only after tailoring",
      reason:
        readiness === "Ready to apply" ||
        readiness === "Apply selectively"
          ? "Your match is reasonable enough to test the market with targeted applications."
          : "Applying too early should be limited until the proof gaps are smaller.",
      action:
        "Submit a small batch of tailored applications and log every response before increasing volume.",
      category: "Applications",
      priority:
        readiness === "Ready to apply" ||
        readiness === "Apply selectively"
          ? "High"
          : "Low",
      estimatedTime: "2-4 hours",
    }),
  ];
}

function getProjectRoadmap(domain: RoadmapDomain): RoadmapTask[] {
  const projectTasksByDomain: Record<RoadmapDomain, RoadmapTask[]> = {
    fullStack: [
      createProjectTask("Add authentication", "Build login, logout, protected routes, and secure session handling."),
      createProjectTask("Use a real database", "Design models, relationships, validation, and useful seed data."),
      createProjectTask("Expose REST APIs", "Create documented endpoints with error handling and realistic request flows."),
      createProjectTask("Deploy the full app", "Ship frontend, backend, database, environment setup, and a live demo link."),
    ],
    frontend: [
      createProjectTask("Build responsive UI", "Cover mobile, tablet, and desktop layouts without horizontal overflow."),
      createProjectTask("Integrate real APIs", "Fetch, cache, validate, and render real or realistic backend data."),
      createProjectTask("Improve performance", "Measure loading, reduce unnecessary rendering, and optimize heavy assets."),
      createProjectTask("Add accessibility basics", "Use semantic HTML, keyboard states, labels, and readable contrast."),
    ],
    backend: [
      createProjectTask("Build REST API coverage", "Create practical endpoints for create, read, update, delete, and search flows."),
      createProjectTask("Use a database cleanly", "Add schema design, validation, relationships, and migration notes."),
      createProjectTask("Add authentication", "Protect routes and handle authorization without pretending it is production security."),
      createProjectTask("Add validation and tests", "Cover request validation, error states, and core service behavior."),
    ],
    ai: [
      createProjectTask("Use a real dataset", "Document source, cleaning steps, limits, and why the dataset fits the problem."),
      createProjectTask("Build a model or LLM workflow", "Show baseline, approach, prompting or modeling choices, and implementation details."),
      createProjectTask("Report metrics honestly", "Include accuracy, precision, recall, latency, cost, or qualitative evaluation where relevant."),
      createProjectTask("Explain and deploy the workflow", "Add limitations, examples, screenshots, and a lightweight demo."),
    ],
    devops: [
      createProjectTask("Containerize the app", "Add Docker files, local run steps, and environment configuration."),
      createProjectTask("Add CI/CD", "Run lint, tests, and build checks automatically before deployment."),
      createProjectTask("Deploy to cloud or hosted infrastructure", "Document deployment architecture, secrets handling, and rollback basics."),
      createProjectTask("Add basic monitoring", "Track logs, uptime, errors, and one useful performance signal."),
    ],
    data: [
      createProjectTask("Write practical SQL", "Use joins, aggregations, filters, and explain the questions answered."),
      createProjectTask("Build an ETL flow", "Extract, clean, transform, and document data quality decisions."),
      createProjectTask("Create a dashboard", "Show trends, filters, key metrics, and business interpretation."),
      createProjectTask("Document the pipeline", "Explain source, schema, refresh process, limitations, and next improvements."),
    ],
    general: [
      createProjectTask("Pick a role-aligned problem", "Choose one realistic problem that maps to the jobs you want."),
      createProjectTask("Build a complete core flow", "Implement one end-to-end workflow instead of many unfinished features."),
      createProjectTask("Publish proof", "Add GitHub, README, screenshots, setup steps, and a short walkthrough."),
      createProjectTask("Measure one outcome", "Add one truthful signal such as speed, scale, tests, or user workflow improvement."),
    ],
  };

  return projectTasksByDomain[domain];
}

function getSkillRoadmap(
  missingTerms: string[],
  matchResult: JobDescriptionMatchResult | null,
): RoadmapTask[] {
  if (missingTerms.length) {
    return missingTerms.slice(0, 6).map((term) =>
      createTask({
        title: `Build proof for ${term}`,
        reason:
          "Adding a skill without evidence weakens trust and can backfire in interviews.",
        action:
          "Learn the concept, build a small feature or project slice with it, then add it to the resume only if you can explain the proof.",
        category: "Skills",
        priority: matchResult && matchResult.matchScore < 65
          ? "High"
          : "Medium",
        estimatedTime: "4-8 hours",
      }),
    );
  }

  return [
    createTask({
      title: "Strengthen proven technical fundamentals",
      reason:
        "When no exact missing skills are available, fundamentals and proof quality are the safest investment.",
      action:
        "Practice one core topic from your target role and connect it to a project example.",
      category: "Skills",
      priority: "Medium",
      estimatedTime: "3-5 hours",
    }),
    createTask({
      title: "Convert listed skills into evidence",
      reason:
        "Skill lists are more credible when every important skill appears in project or experience bullets.",
      action:
        "Pick your top five skills and make sure each one has a matching project bullet, repository, or explanation.",
      category: "Resume",
      priority: "Medium",
      estimatedTime: "2-3 hours",
    }),
  ];
}

function getApplicationStrategy(
  readiness: CareerRoadmap["readiness"],
): string[] {
  const strategy = [
    "Do not mass apply with a generic resume.",
    "Apply only to roles where the match is reasonable and the proof gaps are manageable.",
    "Tailor the resume per JD before submitting.",
    "Track company, role, match score, resume version, response, and next action.",
    "Re-run SkillMint after resume edits, project changes, or a new JD.",
    "Use projects as proof in interviews, not as decorative resume filler.",
  ];

  if (readiness === "Not ready") {
    return [
      "Limit applications until the largest proof gaps are fixed.",
      ...strategy,
    ];
  }

  if (readiness === "Getting ready") {
    return [
      "Apply only to a small number of stretch-fit roles while building proof.",
      ...strategy,
    ];
  }

  return [
    "Send a focused weekly batch of tailored applications instead of spraying resumes.",
    ...strategy,
  ];
}

function detectRoadmapDomain(
  profile: UserProfile,
  matchResult: JobDescriptionMatchResult | null,
  rewritePlan: ResumeRewritePlan | null,
  context: CareerRoadmapContext,
): RoadmapDomain {
  const explicitRoleText = [
    context.targetRole ?? "",
    context.setupTargetRole ?? "",
    context.jobDescription ?? "",
  ].join(" ").toLowerCase();

  if (/\b(ai|ml|machine learning|deep learning|llm|rag|langchain|tensorflow|pytorch|model|data science)\b/i.test(explicitRoleText)) {
    return "ai";
  }

  if (/\b(data analyst|data analytics|data engineer|etl|pipeline|sql|dashboard|warehouse|power bi|tableau)\b/i.test(explicitRoleText)) {
    return "data";
  }

  if (/\b(devops|cloud|aws|azure|gcp|docker|kubernetes|ci\/cd|terraform|jenkins|deployment)\b/i.test(explicitRoleText)) {
    return "devops";
  }

  if (/\b(frontend|front-end|ui engineer|react|next\.?js|vue|angular)\b/i.test(explicitRoleText)) {
    return "frontend";
  }

  if (/\b(backend|back-end|api engineer|node\.?js|django|flask|spring)\b/i.test(explicitRoleText)) {
    return "backend";
  }

  if (/\b(full stack|full-stack|fullstack)\b/i.test(explicitRoleText)) {
    return "fullStack";
  }

  const evidenceText = [
    rewritePlan?.headline ?? "",
    matchResult?.matchedSkills.join(" ") ?? "",
    matchResult?.missingSkills.join(" ") ?? "",
    matchResult?.missingKeywords.join(" ") ?? "",
    matchResult?.recommendations.join(" ") ?? "",
    profile.skills.join(" "),
    profile.projects.join(" "),
  ].join(" ");
  const text = evidenceText.toLowerCase();
  const frontend = /\b(frontend|front-end|react|next\.?js|vue|angular|tailwind|responsive|ui|accessibility)\b/i.test(text);
  const backend = /\b(backend|back-end|node\.?js|express|django|flask|spring|api|rest|graphql|database|mongodb|postgres|mysql|redis)\b/i.test(text);

  if (/\b(full stack|full-stack|fullstack)\b/i.test(text) ||
    (frontend && backend)) {
    return "fullStack";
  }

  if (/\b(ai|ml|machine learning|deep learning|llm|rag|langchain|tensorflow|pytorch|model)\b/i.test(text)) {
    return "ai";
  }

  if (/\b(devops|cloud|aws|azure|gcp|docker|kubernetes|ci\/cd|terraform|jenkins|nginx|deployment)\b/i.test(text)) {
    return "devops";
  }

  if (/\b(data|sql|etl|pipeline|analytics|dashboard|pandas|numpy|tableau|power bi|warehouse)\b/i.test(text)) {
    return "data";
  }

  if (frontend) return "frontend";
  if (backend) return "backend";

  return "general";
}

function getTargetRole(
  domain: RoadmapDomain,
  matchResult: JobDescriptionMatchResult | null,
  rewritePlan: ResumeRewritePlan | null,
  context: CareerRoadmapContext,
): string {
  if (context.targetRole?.trim()) {
    return formatRoadmapTargetRole(context.targetRole);
  }

  if (context.setupTargetRole?.trim()) {
    return formatRoadmapTargetRole(context.setupTargetRole);
  }

  const headline = rewritePlan?.headline.toLowerCase() ?? "";

  if (headline.includes("this target role")) {
    return "Target role from latest JD match";
  }

  const roleByDomain: Record<RoadmapDomain, string> = {
    fullStack: "Full-stack development role",
    frontend: "Frontend development role",
    backend: "Backend development role",
    ai: "AI/ML engineering role",
    devops: "Cloud or DevOps role",
    data: "Data role",
    general: matchResult
      ? "Target role from latest JD match"
      : "Entry-level role after choosing a target JD",
  };

  return roleByDomain[domain];
}

function formatRoadmapTargetRole(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(ai|ml|sql|llm|jd)\b/gi, (match) => match.toUpperCase())
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\b(At|For|Of|And|Or|In)\b/g, (match) =>
      match.toLowerCase()
    );
}

function getMissingTerms(
  matchResult: JobDescriptionMatchResult | null,
  improvementPlan: ResumeImprovementPlan | null,
): string[] {
  const terms = [
    ...(matchResult?.missingSkills ?? []),
    ...(matchResult?.missingKeywords ?? []),
    ...(improvementPlan?.keywordAdditions.map((keyword) =>
      keyword.split(":")[0]?.trim() ?? keyword,
    ) ?? []),
  ];

  return uniqueValues(terms)
    .filter(Boolean)
    .slice(0, 10);
}

function getProjectPlanAction(domain: RoadmapDomain): string {
  const actions: Record<RoadmapDomain, string> = {
    fullStack:
      "Plan a full-stack app with auth, database, REST APIs, deployment, screenshots, and measurable usage or performance notes.",
    frontend:
      "Plan a polished frontend project with responsive UI, API integration, performance checks, and accessibility basics.",
    backend:
      "Plan a backend service with REST APIs, database schema, auth, validation, tests, and deployment notes.",
    ai:
      "Plan an AI/ML project with dataset, model or LLM workflow, metrics, explanation, limitations, and a demo.",
    devops:
      "Plan a DevOps project with Docker, CI/CD, cloud deployment, environment setup, logs, and monitoring notes.",
    data:
      "Plan a data project with SQL, ETL, dashboard, pipeline notes, data quality checks, and insights.",
    general:
      "Plan one practical project that maps to the jobs you want and produces visible proof.",
  };

  return actions[domain];
}

function getProjectBuildAction(domain: RoadmapDomain): string {
  const actions: Record<RoadmapDomain, string> = {
    fullStack:
      "Build auth, database-backed workflows, REST APIs, validation, and a deployed full-stack demo.",
    frontend:
      "Build responsive screens, real API integration, loading/error states, performance improvements, and accessibility checks.",
    backend:
      "Build REST endpoints, database persistence, auth, validation, tests, and clear API documentation.",
    ai:
      "Build with a real dataset or LLM workflow, report metrics honestly, explain limitations, and deploy a small demo.",
    devops:
      "Containerize an app, add CI/CD, deploy it, and document monitoring, logs, and rollback basics.",
    data:
      "Build an ETL flow, SQL analysis, dashboard, and documented pipeline with data quality notes.",
    general:
      "Build one complete project flow that shows real implementation detail and can be inspected publicly.",
  };

  return actions[domain];
}

function createProjectTask(title: string, action: string): RoadmapTask {
  return createTask({
    title,
    reason:
      "This creates concrete project evidence that can support resume bullets and interview answers.",
    action,
    category: "Projects",
    priority: "High",
    estimatedTime: "4-8 hours",
  });
}

function createTask(task: RoadmapTask): RoadmapTask {
  return task;
}

function formatInlineList(items: string[]): string {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function uniqueValues<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}
