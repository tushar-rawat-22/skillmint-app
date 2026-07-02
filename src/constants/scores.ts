export const SCORE_LIMITS = {
  MIN: 0,
  MAX: 100,

  EXCELLENT: 90,
  STRONG: 75,
  AVERAGE: 60,
  WEAK: 40,
  CRITICAL: 20,
} as const;

export const SCORE_WEIGHTS = {
  CAREER_IQ: 1,
  ATS: 1,
  RECRUITER_CONFIDENCE: 1,
  SALARY_INTELLIGENCE: 1,
} as const;