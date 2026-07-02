export type CertificationTier = "S" | "A" | "B" | "C" | "D";

export interface Certification {
  name: string;
  issuer: string;
  tier: CertificationTier;
  verified?: boolean;
}

export type CodingPlatform =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "hackerrank"
  | "hackerearth"
  | "atcoder";

export interface CodingProfile {
  platform: CodingPlatform;
  username?: string;
  solved?: number;
  rating?: number;
  contestRating?: number;
  hardSolved?: number;
  mediumSolved?: number;
  easySolved?: number;
  url?: string;
}

export interface GithubProfile {
  url?: string;
  repositories: number;
  stars: number;
  followers: number;
  openSourceContributions: number;
}

export interface LinkedinProfile {
  url?: string;
  connections?: number;
  hasHeadline: boolean;
  hasAbout: boolean;
  hasFeatured: boolean;
}

export interface UserProfile {
  resumeScore: number;
  skillsScore: number;
  projectsScore: number;
  experienceScore: number;
  educationScore: number;
  githubScore: number;
  linkedinScore: number;
  atsScore: number;
  recruiterScore: number;
  activityScore: number;

  skills: string[];
  projects: string[];
  experience: string[];
  education: string;

  certifications: Certification[];
  codingProfiles: CodingProfile[];

  github?: GithubProfile;
  linkedin?: LinkedinProfile;

  hackathons?: number;
  openSourceScore?: number;
  leadershipScore?: number;
  achievementScore?: number;
  researchScore?: number;
}