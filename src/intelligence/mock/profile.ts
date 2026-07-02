import { UserProfile } from "../types/profile";

export const mockProfile: UserProfile = {
  resumeScore: 16,
  skillsScore: 12,
  projectsScore: 11,
  experienceScore: 8,
  educationScore: 9,
  githubScore: 6,
  linkedinScore: 3,
  atsScore: 4,
  recruiterScore: 3,
  activityScore: 4,

  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "MongoDB",
    "SQL",
    "Git",
    "Tailwind CSS",
    "REST API",
  ],

  projects: [
    "AI Resume Analyzer",
    "E-commerce Dashboard",
    "Portfolio Website",
  ],

  experience: [
    "Frontend Internship",
    "Freelance Web Development",
  ],

  education: "B.Tech Computer Science",

  certifications: [
    {
      name: "AWS Cloud Practitioner",
      issuer: "Amazon",
      tier: "S",
      verified: true,
    },
    {
      name: "Meta Front-End Developer",
      issuer: "Meta",
      tier: "S",
      verified: true,
    },
    {
      name: "React Complete Guide",
      issuer: "Udemy",
      tier: "C",
    },
  ],

  codingProfiles: [
    {
      platform: "leetcode",
      username: "skillmint-user",
      solved: 260,
      rating: 1550,
      hardSolved: 28,
      mediumSolved: 140,
      easySolved: 92,
    },
  ],

  github: {
    url: "https://github.com/example",
    repositories: 18,
    stars: 24,
    followers: 12,
    openSourceContributions: 3,
  },

  linkedin: {
    url: "https://linkedin.com/in/example",
    connections: 420,
    hasHeadline: true,
    hasAbout: true,
    hasFeatured: false,
  },

  hackathons: 2,
  openSourceScore: 5,
  leadershipScore: 4,
  achievementScore: 6,
  researchScore: 0,
};