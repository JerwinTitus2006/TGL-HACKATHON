/**
 * RADIX Talent Match - Type Definitions
 * 
 * Shared data contracts and constants representing the 12-skillset framework,
 * job descriptions, candidate profiles, talent checks, and skill matching.
 */

export const RADIX_CATEGORIES = [
  "Coding / Programming Fundamentals",
  "Data Structures & Algorithms (DSA)",
  "System Design",
  "Cloud & DevOps",
  "Databases",
  "Frontend Engineering",
  "Backend Engineering",
  "AI / ML",
  "Testing & QA",
  "Security",
  "Soft Skills / Communication",
  "Domain & Business Knowledge"
] as const;

export type RadixCategory = typeof RADIX_CATEGORIES[number];

export interface CategoryColor {
  hex: string;
  bg: string;
  text: string;
  border: string;
}

export const CATEGORY_COLORS: Record<RadixCategory, CategoryColor> = {
  "Coding / Programming Fundamentals": {
    hex: "#EF4444",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  "Data Structures & Algorithms (DSA)": {
    hex: "#F43F5E",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  "System Design": {
    hex: "#A855F7",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  "Cloud & DevOps": {
    hex: "#6366F1",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  "Databases": {
    hex: "#3B82F6",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  "Frontend Engineering": {
    hex: "#06B6D4",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  "Backend Engineering": {
    hex: "#14B8A6",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
  },
  "AI / ML": {
    hex: "#10B981",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  "Testing & QA": {
    hex: "#F59E0B",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
  },
  "Security": {
    hex: "#F97316",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
  },
  "Soft Skills / Communication": {
    hex: "#EC4899",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/20",
  },
  "Domain & Business Knowledge": {
    hex: "#D946EF",
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    border: "border-fuchsia-500/20",
  },
};

// RequiredSkill represents a skill mapped to a RADIX skillset
export interface RequiredSkill {
  skill: string;
  category: RadixCategory;
  importance: "must-have" | "nice-to-have";
  min_proficiency: number; // 1-5
}

// JobDescription data contract
export interface JobDescription {
  id: string; // Internal identifier for local state
  company: string;
  role_title: string;
  seniority: string;
  required_skills: RequiredSkill[];
  raw_text_summary: string;
}

// CandidateSkill represents a skill mapped to a RADIX skillset in the profile
export interface CandidateSkill {
  skill: string;
  category: RadixCategory;
  proficiency: number; // 1-5
  source: "resume" | "self-reported";
}

export interface Hackathon {
  name: string;
  year: number;
  description: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year: number;
}

// CandidateProfile data contract
export interface CandidateProfile {
  name: string;
  preferred_roles: string[];
  skills: CandidateSkill[];
  hackathons: Hackathon[];
  certifications: Certification[];
  category_scores: Record<RadixCategory, number>; // key is one of the 12 categories, value 0-100
}

// Category breakdown for company-wide bar comparison
export interface CategoryBreakdown {
  category: RadixCategory;
  score: number; // 0-100
  company_bar: number; // 0-100
  gap: number; // candidate_score - company_bar
}

// TalentCheckResult data contract
export interface TalentCheckResult {
  overall_readiness: number; // 0-100
  category_breakdown: CategoryBreakdown[];
  narrative_feedback: string; // narrative gap analysis
}

export interface MissingSkill {
  skill: string;
  category: RadixCategory;
  importance: "must-have" | "nice-to-have";
  gap_tip?: string; // actionable tip to close the gap
}

// SkillMatchResult data contract
export interface SkillMatchResult {
  job_title: string;
  match_score: number; // 0-100
  matched_skills: string[];
  missing_skills: MissingSkill[];
  recommendation: string;
}
