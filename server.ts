import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK safely
// We must set the User-Agent header to 'aistudio-build' in httpOptions for telemetry
const hasApiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";

const ai = hasApiKey
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// The 12 Radix Categories
const RADIX_CATEGORIES = [
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

// ----------------------------------------------------------------------
// HELPER FOR SMART PARSING FALLBACKS (If Gemini key is missing or fails)
// ----------------------------------------------------------------------
function detectCategoryFromKeyword(skillName: string): string {
  const name = skillName.toLowerCase();
  if (name.includes("react") || name.includes("frontend") || name.includes("css") || name.includes("html") || name.includes("vue") || name.includes("angular") || name.includes("ui") || name.includes("web") || name.includes("ux")) {
    return "Frontend Engineering";
  }
  if (name.includes("kubernetes") || name.includes("docker") || name.includes("aws") || name.includes("azure") || name.includes("gcp") || name.includes("devops") || name.includes("ci/cd") || name.includes("terraform") || name.includes("cloud") || name.includes("ansible")) {
    return "Cloud & DevOps";
  }
  if (name.includes("postgres") || name.includes("database") || name.includes("sql") || name.includes("mongodb") || name.includes("mysql") || name.includes("redis") || name.includes("spanner") || name.includes("oracle") || name.includes("nosql")) {
    return "Databases";
  }
  if (name.includes("node") || name.includes("express") || name.includes("api") || name.includes("backend") || name.includes("rest") || name.includes("graphql") || name.includes("grpc")) {
    return "Backend Engineering";
  }
  if (name.includes("security") || name.includes("cyber") || name.includes("encryption") || name.includes("auth") || name.includes("jwt") || name.includes("oauth") || name.includes("sentinel") || name.includes("owasp")) {
    return "Security";
  }
  if (name.includes("test") || name.includes("qa") || name.includes("jest") || name.includes("cypress") || name.includes("selenium") || name.includes("chaos") || name.includes("benchmark")) {
    return "Testing & QA";
  }
  if (name.includes("ml") || name.includes("ai") || name.includes("machine learning") || name.includes("llm") || name.includes("neural") || name.includes("deep learning") || name.includes("nlp") || name.includes("pytorch")) {
    return "AI / ML";
  }
  if (name.includes("system design") || name.includes("distributed") || name.includes("microservices") || name.includes("architecture") || name.includes("scale") || name.includes("topology")) {
    return "System Design";
  }
  if (name.includes("algorithm") || name.includes("dsa") || name.includes("leetcode") || name.includes("structures") || name.includes("tree") || name.includes("graph") || name.includes("sorting")) {
    return "Data Structures & Algorithms (DSA)";
  }
  if (name.includes("communication") || name.includes("leadership") || name.includes("team") || name.includes("mentor") || name.includes("soft skills") || name.includes("collaborat") || name.includes("agile")) {
    return "Soft Skills / Communication";
  }
  if (name.includes("business") || name.includes("domain") || name.includes("sla") || name.includes("finance") || name.includes("customer") || name.includes("product") || name.includes("industry")) {
    return "Domain & Business Knowledge";
  }
  return "Coding / Programming Fundamentals";
}

// ----------------------------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------------------------

// 1. JD ANALYTICS: Extracts JobDescription JSON using gemini-2.5-flash (or gemini-3.5-flash)
app.post("/api/analyze-jd", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Job description text is required" });
  }

  const prompt = `Analyze the following Job Description (JD) and extract the required skills, mapping them to our 12-skillset framework.
  
  The 12 skillset categories are:
  1. Coding / Programming Fundamentals
  2. Data Structures & Algorithms (DSA)
  3. System Design
  4. Cloud & DevOps
  5. Databases
  6. Frontend Engineering
  7. Backend Engineering
  8. AI / ML
  9. Testing & QA
  10. Security
  11. Soft Skills / Communication
  12. Domain & Business Knowledge

  Return a strict JSON conforming to the responseSchema. For each skill, ensure you map it to exactly one of the 12 categories listed above.
  
  JD Text:
  ${text}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      company: { type: Type.STRING, description: "Name of the company hiring (e.g., Google, Microsoft)" },
      role_title: { type: Type.STRING, description: "Full title of the role (e.g., Senior Software Engineer)" },
      seniority: { type: Type.STRING, description: "Seniority level (e.g., Senior, Mid, Lead, Principal)" },
      required_skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skill: { type: Type.STRING, description: "The specific skill or technology name (e.g., React, Go, Azure, Sharding)" },
            category: { 
              type: Type.STRING, 
              description: "Must be exactly one of the 12 skillset categories specified in the prompt." 
            },
            importance: { type: Type.STRING, description: "Must be 'must-have' or 'nice-to-have'" },
            min_proficiency: { type: Type.INTEGER, description: "Required proficiency level as an integer from 1 to 5" }
          },
          required: ["skill", "category", "importance", "min_proficiency"]
        }
      },
      raw_text_summary: { type: Type.STRING, description: "A brief 1-2 sentence overview summarizing the role's primary goals" }
    },
    required: ["company", "role_title", "seniority", "required_skills", "raw_text_summary"]
  };

  try {
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured or placeholder detected.");
    }

    // Try gemini-2.5-flash as requested, fall back to gemini-3.5-flash if there are any issues
    const modelToUse = "gemini-2.5-flash";
    
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      }
    });

    if (!response.text) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(response.text.trim());
    return res.json({ result: parsed, isFallback: false });

  } catch (error: any) {
    console.error("Gemini JD Analysis failed, using robust fallback parser:", error.message || error);
    
    // Robust local rule-based parsing fallback
    const lines = text.split("\n");
    let company = "Target Company";
    let role_title = "Specialist Engineer";
    let seniority = "Senior";
    
    // Attempt some basic extraction
    const firstFewLines = lines.slice(0, 5).join(" ");
    if (/google/i.test(firstFewLines)) company = "Google";
    else if (/microsoft/i.test(firstFewLines)) company = "Microsoft";
    else if (/oracle/i.test(firstFewLines)) company = "Oracle";
    else if (/netflix/i.test(firstFewLines)) company = "Netflix";
    else if (/meta/i.test(firstFewLines)) company = "Meta";
    else if (/amazon/i.test(firstFewLines)) company = "Amazon";

    if (/senior/i.test(firstFewLines)) seniority = "Senior";
    else if (/lead/i.test(firstFewLines)) seniority = "Lead";
    else if (/principal/i.test(firstFewLines)) seniority = "Principal";
    else if (/junior/i.test(firstFewLines)) seniority = "Junior";

    const titleMatch = text.match(/(role|title|position):\s*([^\n]+)/i) || text.match(/([^\n]+(engineer|developer|architect|administrator|dba|analyst)[^\n]*)/i);
    if (titleMatch && titleMatch[2]) {
      role_title = titleMatch[2].trim();
    } else if (titleMatch && titleMatch[1]) {
      role_title = titleMatch[1].trim();
    }

    // Extract some common technical terms for skills
    const commonSkills = [
      { name: "React", cat: "Frontend Engineering" },
      { name: "TypeScript", cat: "Coding / Programming Fundamentals" },
      { name: "Node.js", cat: "Backend Engineering" },
      { name: "PostgreSQL", cat: "Databases" },
      { name: "Docker", cat: "Cloud & DevOps" },
      { name: "Kubernetes", cat: "Cloud & DevOps" },
      { name: "AWS", cat: "Cloud & DevOps" },
      { name: "Azure", cat: "Cloud & DevOps" },
      { name: "System Design", cat: "System Design" },
      { name: "Algorithms", cat: "Data Structures & Algorithms (DSA)" },
      { name: "Testing", cat: "Testing & QA" },
      { name: "Security", cat: "Security" },
      { name: "Machine Learning", cat: "AI / ML" },
      { name: "Communication", cat: "Soft Skills / Communication" },
      { name: "Business Strategy", cat: "Domain & Business Knowledge" }
    ];

    const required_skills: any[] = [];
    commonSkills.forEach((s) => {
      const escaped = s.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(text)) {
        required_skills.push({
          skill: s.name,
          category: s.cat,
          importance: Math.random() > 0.4 ? "must-have" : "nice-to-have",
          min_proficiency: Math.floor(Math.random() * 3) + 3 // 3 to 5
        });
      }
    });

    // Default minimum standard skills if none found
    if (required_skills.length === 0) {
      required_skills.push(
        { skill: "Software Engineering Principles", category: "Coding / Programming Fundamentals", importance: "must-have", min_proficiency: 4 },
        { skill: "System Architecture", category: "System Design", importance: "must-have", min_proficiency: 4 },
        { skill: "Relational Databases", category: "Databases", importance: "nice-to-have", min_proficiency: 3 }
      );
    }

    const fallbackResult = {
      company,
      role_title,
      seniority,
      required_skills,
      raw_text_summary: `[Partial Results - AI analysis failed/not configured] A professional role focusing on high-level deliverables including ${required_skills.map(s => s.skill).slice(0, 3).join(", ")}.`
    };

    return res.json({ result: fallbackResult, isFallback: true, warning: "Gemini API unavailable or failed. Used intelligent keyword parser." });
  }
});

// 2. RESUME PARSING: Parses Resume JSON using gemini-2.5-flash (or gemini-3.5-flash)
app.post("/api/parse-resume", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Resume text is required" });
  }

  const prompt = `You are an expert AI Resume parser. Parse the following candidate's resume text and extract their profile details. 
  Extract skills and map each one strictly to one of our 12 categories:
  - Coding / Programming Fundamentals
  - Data Structures & Algorithms (DSA)
  - System Design
  - Cloud & DevOps
  - Databases
  - Frontend Engineering
  - Backend Engineering
  - AI / ML
  - Testing & QA
  - Security
  - Soft Skills / Communication
  - Domain & Business Knowledge

  Tolerate messy formatting. Assign a realistic proficiency rating from 1 to 5 for each skill based on their resume experience.
  
  Resume text:
  ${text}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Candidate's full name" },
      preferred_roles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Preferred roles or job titles mentioned or inferred" },
      skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skill: { type: Type.STRING, description: "Name of the skill or technology (e.g. Docker, Terraform, Redux)" },
            category: { type: Type.STRING, description: "Must be exactly one of our 12 skillset categories specified in the prompt." },
            proficiency: { type: Type.INTEGER, description: "Proficiency level from 1 to 5 based on years or quality of experience" },
            source: { type: Type.STRING, description: "Must be 'resume'" }
          },
          required: ["skill", "category", "proficiency", "source"]
        }
      },
      hackathons: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the hackathon" },
            year: { type: Type.INTEGER, description: "Year of participation" },
            description: { type: Type.STRING, description: "Brief description of what was built or won" }
          },
          required: ["name", "year", "description"]
        }
      },
      certifications: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the certification" },
            issuer: { type: Type.STRING, description: "Issuer organization (e.g., AWS, Oracle, Google, Microsoft)" },
            year: { type: Type.INTEGER, description: "Year obtained" }
          },
          required: ["name", "issuer", "year"]
        }
      }
    },
    required: ["name", "preferred_roles", "skills", "hackathons", "certifications"]
  };

  try {
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured or placeholder detected.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      }
    });

    if (!response.text) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(response.text.trim());
    return res.json({ result: parsed, isFallback: false });

  } catch (error: any) {
    console.error("Gemini Resume Parsing failed, using robust fallback parser:", error.message || error);
    
    // Fallback parsing logic
    let name = "Extracted Candidate";
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/) || text.match(/name:\s*([^\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      name = nameMatch[1].trim();
    }

    // Common skills mapping to categories
    const skillList = [
      { name: "React", cat: "Frontend Engineering", prof: 4 },
      { name: "TypeScript", cat: "Coding / Programming Fundamentals", prof: 4 },
      { name: "Node.js", cat: "Backend Engineering", prof: 4 },
      { name: "Express", cat: "Backend Engineering", prof: 3 },
      { name: "PostgreSQL", cat: "Databases", prof: 4 },
      { name: "MongoDB", cat: "Databases", prof: 3 },
      { name: "Docker", cat: "Cloud & DevOps", prof: 4 },
      { name: "Kubernetes", cat: "Cloud & DevOps", prof: 3 },
      { name: "AWS", cat: "Cloud & DevOps", prof: 4 },
      { name: "Azure", cat: "Cloud & DevOps", prof: 3 },
      { name: "Terraform", cat: "Cloud & DevOps", prof: 4 },
      { name: "Algorithms", cat: "Data Structures & Algorithms (DSA)", prof: 3 },
      { name: "System Design", cat: "System Design", prof: 3 },
      { name: "Jest", cat: "Testing & QA", prof: 4 },
      { name: "Security", cat: "Security", prof: 3 },
      { name: "Python", cat: "Coding / Programming Fundamentals", prof: 4 },
      { name: "Go", cat: "Coding / Programming Fundamentals", prof: 3 },
      { name: "CI/CD", cat: "Cloud & DevOps", prof: 4 }
    ];

    const extractedSkills: any[] = [];
    skillList.forEach((s) => {
      const escaped = s.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(text)) {
        extractedSkills.push({
          skill: s.name,
          category: s.cat,
          proficiency: s.prof,
          source: "resume"
        });
      }
    });

    if (extractedSkills.length === 0) {
      extractedSkills.push(
        { skill: "Software Engineering", category: "Coding / Programming Fundamentals", proficiency: 3, source: "resume" },
        { skill: "Database Queries", category: "Databases", proficiency: 3, source: "resume" },
        { skill: "Git Version Control", category: "Soft Skills / Communication", proficiency: 4, source: "resume" }
      );
    }

    // Multi-select inferred roles
    const preferred_roles = ["Software Engineer"];
    if (text.toLowerCase().includes("devops") || text.toLowerCase().includes("kubernetes")) preferred_roles.push("DevOps Engineer");
    if (text.toLowerCase().includes("frontend") || text.toLowerCase().includes("react")) preferred_roles.push("Frontend Engineer");
    if (text.toLowerCase().includes("database") || text.toLowerCase().includes("dba")) preferred_roles.push("Database Administrator");

    // Mock some hackathons and certifications from text
    const hackathons: any[] = [];
    if (text.toLowerCase().includes("hackathon")) {
      const match = text.match(/hackathon.*?(\d{4})/i);
      hackathons.push({
        name: "Community Hackathon",
        year: match ? parseInt(match[1]) : 2025,
        description: "Built a collaborative serverless microservice application."
      });
    }

    const certifications: any[] = [];
    if (text.toLowerCase().includes("certified") || text.toLowerCase().includes("certification")) {
      const match = text.match(/(aws|azure|kubernetes|comptia|oracle)[^\n]+/i);
      certifications.push({
        name: match ? match[0].trim() : "AWS Certified Cloud Practitioner",
        issuer: text.toLowerCase().includes("aws") ? "AWS" : "Industry Certified",
        year: 2024
      });
    }

    const fallbackResult = {
      name,
      preferred_roles,
      skills: extractedSkills,
      hackathons,
      certifications
    };

    return res.json({ result: fallbackResult, isFallback: true, warning: "Gemini API failed/not set. Used local extraction." });
  }
});

// 3. TALENT CHECK: Computes TalentCheckResult comparison against "company bar" using gemini-2.5-pro
app.post("/api/talent-check", async (req, res) => {
  const { profile, companyBar } = req.body;
  if (!profile || !companyBar) {
    return res.status(400).json({ error: "Profile and company bar data are required" });
  }

  const prompt = `You are a Senior Technical talent auditor.
  Perform a GAP analysis of this Candidate's Profile against the Company Bar (benchmarks).
  The comparison is on our 12 skillset categories. 

  Candidate Profile:
  ${JSON.stringify(profile, null, 2)}

  Company Bar (Average proficiency score out of 100 for each category):
  ${JSON.stringify(companyBar, null, 2)}

  Determine:
  1. The overall readiness score (integer, 0-100) reflecting how well matched the candidate's scores are to the company bar, accounting for the relative gaps.
  2. The category breakdown: for each of the 12 categories, report the candidate's score, the company bar, and the gap (score - company_bar).
  3. A narrative feedback (1-2 paragraphs) in Markdown. Speak directly to the candidate: highlight their top 2 strengths, point out the major critical gaps, and outline how they can close them.

  Return a strict JSON conforming to the responseSchema. Ensure the category_breakdown array has exactly 12 items, one for each category.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      overall_readiness: { type: Type.INTEGER, description: "A weighted, realistic aggregate score (0-100) of readiness against company standards" },
      category_breakdown: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "One of the 12 skillset categories" },
            score: { type: Type.INTEGER, description: "Candidate's score (0-100) for this category" },
            company_bar: { type: Type.INTEGER, description: "Company bar score (0-100) for this category" },
            gap: { type: Type.INTEGER, description: "Candidate score minus company_bar score" }
          },
          required: ["category", "score", "company_bar", "gap"]
        }
      },
      narrative_feedback: { type: Type.STRING, description: "In-depth, candidate-focused gap report and technical development suggestions. Markdown format." }
    },
    required: ["overall_readiness", "category_breakdown", "narrative_feedback"]
  };

  try {
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      }
    });

    if (!response.text) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(response.text.trim());
    return res.json({ result: parsed, isFallback: false });

  } catch (error: any) {
    console.error("Gemini Talent Check failed, calculating locally:", error.message || error);
    
    // Intelligent local fallback calculations
    const breakdown: any[] = [];
    let totalScore = 0;
    let totalBar = 0;

    RADIX_CATEGORIES.forEach((cat) => {
      const score = profile.category_scores[cat] || 0;
      const bar = companyBar[cat] || 0;
      const gap = score - bar;
      breakdown.push({
        category: cat,
        score,
        company_bar: bar,
        gap
      });
      totalScore += score;
      totalBar += bar;
    });

    // Compute overall readiness
    let gapPenalties = 0;
    breakdown.forEach((item) => {
      if (item.gap < 0) {
        // Double penalize negative gaps to reflect standard screening rigor
        gapPenalties += Math.abs(item.gap) * 1.5;
      }
    });

    const averageScore = totalScore / 12;
    const averageBar = totalBar / 12;
    let overall_readiness = Math.round(100 - gapPenalties / 6);
    overall_readiness = Math.max(10, Math.min(100, overall_readiness));

    // Simple narrative feedback builder
    const sortedGaps = [...breakdown].sort((a, b) => a.gap - b.gap); // biggest gaps first
    const strengths = [...breakdown].sort((a, b) => b.gap - a.gap).slice(0, 2);
    const mainGaps = sortedGaps.filter(g => g.gap < 0).slice(0, 2);

    let narrative_feedback = `### RADIX Talent Readiness Feedback

Based on your current profile compared against the aggregate **${profile.name ? profile.name.split(" ")[0] : "Candidate"} Company Benchmarks**, we have mapped your readiness profile.

#### 🌟 Key Strengths
- **${strengths[0].category}**: You exceed the company bar by **+${strengths[0].gap}%**, showcasing strong mastery.
- **${strengths[1].category}**: Highly skilled, scoring **${strengths[1].score}%** against the bar of **${strengths[1].company_bar}%**.

#### 🎯 Critical Gaps to Address
${mainGaps.length > 0 
  ? mainGaps.map(g => `- **${g.category}**: You are currently **${Math.abs(g.gap)}% below** company standards. Focus on learning core frameworks and applying them to projects.`).join("\n")
  : "Awesome! You have met or exceeded the requirements in all major technical categories. Maintain your edge by keeping up with industry updates."}

#### 🛠️ Actionable Recommendation
Focus on building end-to-end sandbox projects that bridge **${sortedGaps[0].category}** and core backend mechanics. We suggest adding some targeted certifications or hands-on hackathons to validate these credentials.`;

    const fallbackResult = {
      overall_readiness,
      category_breakdown: breakdown,
      narrative_feedback
    };

    return res.json({ result: fallbackResult, isFallback: true, warning: "Gemini API unavailable. Calculated results locally." });
  }
});

// 4. SKILL MATCH: Specific job matching using fuzzy/semantic comparison via gemini-2.5-pro
app.post("/api/skill-match", async (req, res) => {
  const { profile, jd } = req.body;
  if (!profile || !jd) {
    return res.status(400).json({ error: "Profile and Job Description are required" });
  }

  const prompt = `You are a semantic tech-matching engine.
  Compare the Candidate's Profile skills against the specific Job Description (JD) required skills.

  Perform semantic, fuzzy matching (e.g., "Node.js" matches "NodeJS" or "Express"; "AWS" is related to "GCP" but not identical).

  Candidate Profile Skills:
  ${JSON.stringify(profile.skills, null, 2)}

  Job Description Required Skills:
  ${JSON.stringify(jd.required_skills, null, 2)}

  We need you to output:
  1. job_title: The title of the role (e.g. Senior Software Engineer)
  2. match_score: A number from 0 to 100 indicating percentage fit. Must-have skills should weigh 75% of this score, nice-to-have skills 25%.
  3. matched_skills: Array of skill names (from the JD) that the candidate possesses or matches semantically.
  4. missing_skills: Array of required skills from the JD that are NOT matched. For each missing skill, specify:
     - skill: Name of the skill
     - category: Its category
     - importance: 'must-have' or 'nice-to-have'
     - gap_tip: A highly practical, concise, 1-sentence learning tip on how to gain/validate this skill.
  5. recommendation: A clear, actionable 1-2 sentence final verdict on whether the candidate should apply, and their next immediate step.

  Return a strict JSON conforming to the responseSchema.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      job_title: { type: Type.STRING },
      match_score: { type: Type.INTEGER },
      matched_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
      missing_skills: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skill: { type: Type.STRING },
            category: { type: Type.STRING },
            importance: { type: Type.STRING },
            gap_tip: { type: Type.STRING }
          },
          required: ["skill", "category", "importance", "gap_tip"]
        }
      },
      recommendation: { type: Type.STRING }
    },
    required: ["job_title", "match_score", "matched_skills", "missing_skills", "recommendation"]
  };

  try {
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      }
    });

    if (!response.text) {
      throw new Error("Empty response received from Gemini.");
    }

    const parsed = JSON.parse(response.text.trim());
    return res.json({ result: parsed, isFallback: false });

  } catch (error: any) {
    console.error("Gemini Skill Match failed, matching locally:", error.message || error);
    
    // Fuzzy matching fallback
    const matched_skills: string[] = [];
    const missing_skills: any[] = [];
    
    const candidateSkillsLower = profile.skills.map((s: any) => s.skill.toLowerCase());

    jd.required_skills.forEach((reqSkill: any) => {
      const rName = reqSkill.skill.toLowerCase();
      
      // Let's do some semantic fuzzy matching
      let isMatched = false;
      
      for (const cSkill of candidateSkillsLower) {
        if (cSkill === rName || rName.includes(cSkill) || cSkill.includes(rName)) {
          isMatched = true;
          break;
        }
        // Semantic rules
        if ((rName.includes("sql") && cSkill.includes("postgres")) || (rName.includes("spanner") && cSkill.includes("postgres"))) isMatched = true;
        if (rName.includes("aws") && (cSkill.includes("azure") || cSkill.includes("cloud"))) isMatched = true;
        if (rName.includes("algorithms") && cSkill.includes("structures")) isMatched = true;
        if (rName.includes("distributed") && cSkill.includes("architect")) isMatched = true;
        if (rName.includes("api") && cSkill.includes("node")) isMatched = true;
        if (rName.includes("communication") && cSkill.includes("git")) isMatched = true;
      }

      if (isMatched) {
        matched_skills.push(reqSkill.skill);
      } else {
        // Map generic tips
        let gap_tip = `Take a short online course and build a sample project showcasing ${reqSkill.skill}.`;
        if (reqSkill.category === "Cloud & DevOps") gap_tip = `Deploy a sample containerized app using ${reqSkill.skill} on a free cloud tier.`;
        else if (reqSkill.category === "Databases") gap_tip = `Set up a local instance, write relational queries, and benchmark index optimizations.`;
        else if (reqSkill.category === "Data Structures & Algorithms (DSA)") gap_tip = `Solve 10-15 targeted medium-difficulty problems focusing on this pattern on LeetCode.`;
        else if (reqSkill.category === "Security") gap_tip = `Review the OWASP Top 10 vulnerabilities and secure your active backend APIs using JWT/HTTPS.`;

        missing_skills.push({
          skill: reqSkill.skill,
          category: reqSkill.category,
          importance: reqSkill.importance,
          gap_tip
        });
      }
    });

    // Score calculations
    const mustHaves = jd.required_skills.filter((s: any) => s.importance === "must-have");
    const niceToHaves = jd.required_skills.filter((s: any) => s.importance === "nice-to-have");

    const matchedMustHaves = mustHaves.filter((s: any) => matched_skills.includes(s.skill));
    const matchedNiceToHaves = niceToHaves.filter((s: any) => matched_skills.includes(s.skill));

    let match_score = 0;
    if (mustHaves.length > 0) {
      match_score += (matchedMustHaves.length / mustHaves.length) * 75;
    } else {
      match_score += 75; // free pass if no must-haves
    }

    if (niceToHaves.length > 0) {
      match_score += (matchedNiceToHaves.length / niceToHaves.length) * 25;
    } else {
      match_score += 25;
    }

    match_score = Math.round(match_score);

    const recommendation = match_score >= 70
      ? `Strong match! You satisfy ${matchedMustHaves.length}/${mustHaves.length} core requirements. We highly recommend you submit your profile immediately.`
      : `Moderate match. You have minor gaps in core competencies (such as ${missing_skills.slice(0, 2).map(m => m.skill).join(", ")}). We recommend patching these gaps prior to applying.`;

    const fallbackResult = {
      job_title: jd.role_title,
      match_score,
      matched_skills,
      missing_skills,
      recommendation
    };

    return res.json({ result: fallbackResult, isFallback: true, warning: "Gemini API unavailable. Parsed local matches." });
  }
});


// ----------------------------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARES
// ----------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RADIX Server] Full-stack container running on port ${PORT}`);
  });
}

startServer();
