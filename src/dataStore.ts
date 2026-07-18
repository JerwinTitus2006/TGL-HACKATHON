import { JobDescription, CandidateProfile, TalentCheckResult, SkillMatchResult, RadixCategory } from "./types";

// Local Storage Keys
const KEY_JDS = "radix_jds";
const KEY_PROFILE = "radix_profile";
const KEY_ACTIVE_JD = "radix_active_jd_id";
const KEY_TALENT_CHECK = "radix_talent_check";
const KEY_SKILL_MATCH = "radix_skill_match";

// ----------------------------------------------------------------------
// SAMPLE JDs (SEEDS)
// ----------------------------------------------------------------------
export const SEED_JDS: JobDescription[] = [
  {
    id: "jd-google-swe",
    company: "Google",
    role_title: "Senior Software Engineer (SWE)",
    seniority: "Senior (L5/L6)",
    raw_text_summary: "We are seeking a Senior Software Engineer with strong background in distributed systems, advanced algorithms, database scaling, and backend API designs. The ideal candidate has deep expertise in standard coding practices, data structures, backend engineering, testing automation, and collaborative cross-functional skills.",
    required_skills: [
      { skill: "C++ / Java / Go", category: "Coding / Programming Fundamentals", importance: "must-have", min_proficiency: 5 },
      { skill: "Complex Algorithm Design & Complexity Analysis", category: "Data Structures & Algorithms (DSA)", importance: "must-have", min_proficiency: 5 },
      { skill: "Microservices & Distributed Systems", category: "System Design", importance: "must-have", min_proficiency: 4 },
      { skill: "Google Cloud Platform (GCP) & Kubernetes", category: "Cloud & DevOps", importance: "nice-to-have", min_proficiency: 3 },
      { skill: "NoSQL, Bigtable, Spanner", category: "Databases", importance: "must-have", min_proficiency: 4 },
      { skill: "API Design & REST/gRPC", category: "Backend Engineering", importance: "must-have", min_proficiency: 5 },
      { skill: "Modern Web Frameworks (React/TS)", category: "Frontend Engineering", importance: "nice-to-have", min_proficiency: 3 },
      { skill: "Large Language Models & ML Pipelines", category: "AI / ML", importance: "nice-to-have", min_proficiency: 3 },
      { skill: "Unit & Integration Testing, CI/CD", category: "Testing & QA", importance: "must-have", min_proficiency: 4 },
      { skill: "IAM, Auth0, Data Encryption", category: "Security", importance: "nice-to-have", min_proficiency: 3 },
      { skill: "Technical Leadership & Peer Mentoring", category: "Soft Skills / Communication", importance: "must-have", min_proficiency: 4 },
      { skill: "High-Scale Consumer Tech Domain", category: "Domain & Business Knowledge", importance: "nice-to-have", min_proficiency: 3 }
    ]
  },
  {
    id: "jd-microsoft-devops",
    company: "Microsoft",
    role_title: "Senior Cloud & DevOps Engineer",
    seniority: "Senior / Principal",
    raw_text_summary: "Microsoft Azure Core Team is looking for an experienced DevOps Specialist to design automated deployment pipelines, handle multi-region cloud orchestrations, strengthen cloud security profiles, and maintain high-availability systems. Proficiencies in Kubernetes, Azure Resource Manager, Terraform, security standards, and QA testing are key.",
    required_skills: [
      { skill: "Bash, PowerShell, Python scripting", category: "Coding / Programming Fundamentals", importance: "must-have", min_proficiency: 4 },
      { skill: "High-Availability System Topologies", category: "System Design", importance: "must-have", min_proficiency: 4 },
      { skill: "Microsoft Azure, AKS, Terraform IaC", category: "Cloud & DevOps", importance: "must-have", min_proficiency: 5 },
      { skill: "Azure SQL, CosmosDB, Redis", category: "Databases", importance: "nice-to-have", min_proficiency: 3 },
      { skill: "CI/CD Pipelines (GitHub Actions / ADO)", category: "Backend Engineering", importance: "must-have", min_proficiency: 4 },
      { skill: "Azure Sentinel, Cyber Security Best Practices", category: "Security", importance: "must-have", min_proficiency: 5 },
      { skill: "Chaos Engineering & Load Testing", category: "Testing & QA", importance: "must-have", min_proficiency: 4 },
      { skill: "Incident Management & DevSecOps Culture", category: "Soft Skills / Communication", importance: "must-have", min_proficiency: 4 },
      { skill: "Data Structures & Graph Analytics", category: "Data Structures & Algorithms (DSA)", importance: "nice-to-have", min_proficiency: 3 }
    ]
  },
  {
    id: "jd-oracle-dba",
    company: "Oracle",
    role_title: "Lead Database Administrator (DBA)",
    seniority: "Lead / Manager",
    raw_text_summary: "Oracle Database Systems Group is hiring a Lead DBA. You will be responsible for administering enterprise Oracle databases, optimizing query performance, managing partitionings, orchestrating backup strategies, and securing transactional databases. Heavy database optimization, Linux system tuning, and enterprise security background required.",
    required_skills: [
      { skill: "Database Administration, Sharding & Partitioning", category: "Databases", importance: "must-have", min_proficiency: 5 },
      { skill: "PL/SQL Programming & Shell Scripting", category: "Coding / Programming Fundamentals", importance: "must-have", min_proficiency: 4 },
      { skill: "High-Throughput Storage System Design", category: "System Design", importance: "must-have", min_proficiency: 4 },
      { skill: "Autonomous Database & Oracle Cloud (OCI)", category: "Cloud & DevOps", importance: "must-have", min_proficiency: 4 },
      { skill: "Database Encryption, Auditing, Vaults", category: "Security", importance: "must-have", min_proficiency: 5 },
      { skill: "Database Backup Recovery & Active Data Guard", category: "Backend Engineering", importance: "must-have", min_proficiency: 4 },
      { skill: "Stress Testing & Benchmark Tuning", category: "Testing & QA", importance: "must-have", min_proficiency: 4 },
      { skill: "Enterprise Client Management & SLAs", category: "Domain & Business Knowledge", importance: "must-have", min_proficiency: 4 }
    ]
  }
];

// ----------------------------------------------------------------------
// SAMPLE RESUMES (PLAIN TEXT FOR EASY PASTE/DEMO)
// ----------------------------------------------------------------------
export const SAMPLE_RESUMES = [
  {
    name: "Alex Rivera - Full-Stack Developer Resume",
    text: `ALEX RIVERA
Full-Stack Software Engineer | San Francisco, CA | alex.rivera@example.com

SUMMARY
Highly capable Full-Stack Developer with 4+ years of experience designing robust web architectures, scalable APIs, and performance-tuned databases. Solid foundational knowledge of data structures and algorithms, with extensive experience in React/TypeScript, Node.js, Express, Postgres, and Docker.

TECHNICAL SKILLS
- Programming: TypeScript, JavaScript, Python, C++, SQL
- DSA: Deep understanding of Graphs, Trees, Sorting, and Dynamic Programming (completed 300+ Leetcode challenges)
- Frontend: React, Redux, Tailwind CSS, HTML5/CSS3, Vite
- Backend & Databases: Node.js, Express, PostgreSQL, MongoDB, Redis, RESTful APIs, WebSockets
- Cloud & DevOps: AWS (EC2, S3, RDS), Docker, CI/CD (GitHub Actions), Linux administration
- Testing & QA: Jest, Cypress, Integration testing
- Security: OAuth2, JWT Authentication, HTTPS, CORS, Helmet.js

WORK EXPERIENCE
Senior Full-Stack Engineer | TechFlow Solutions | 2024 - Present
- Designed and migrated a legacy monolith to a Node.js microservice architecture, reducing API latency by 45%.
- Implemented responsive, beautiful dashboards using React, Tailwind CSS, and Recharts, improving user retention by 20%.
- Restructured database schemas and query indexing in PostgreSQL, saving $4k/month in AWS RDS performance overhead.
- Maintained a robust CI/CD deployment pipeline with Docker and GitHub Actions to deploy apps seamlessly on AWS.

Software Engineer | DevScope Inc. | 2022 - 2024
- Built secure user auth flows using JWT tokens and OAuth.
- Wrote extensive Jest unit tests to raise overall code coverage from 60% to 92%.
- Participated in weekly system design reviews for distributed message queues.

CERTIFICATIONS & HACKATHONS
- Hackathon: Winner of SF Hackathon 2025 (Built a real-time collaborative map app with Vite)
- Certification: AWS Certified Developer Associate (2025)
- Certification: Meta Front-End Developer Professional Certificate (2024)`
  },
  {
    name: "Jordan Chen - DevOps & Cloud Specialist Resume",
    text: `JORDAN CHEN
Senior DevOps & Cloud Solutions Architect | Seattle, WA | jordan.chen@example.com

SUMMARY
DevOps and Cloud Systems Engineer with over 6 years of expertise architecting high-availability, secure, and automated cloud systems. Deep knowledge of infrastructure-as-code, multi-cloud setups, container orchestration (Kubernetes), and continuous delivery. Strong background in system design, cyber security, and network protocol administration.

TECHNICAL SKILLS
- Cloud Platforms: Microsoft Azure, AWS, Google Cloud
- DevOps & IaC: Terraform, Ansible, Jenkins, GitHub Actions, Docker, Kubernetes (AKS/EKS), Helm, Bash, Python
- System Design: Microservices, High Availability, Load Balancers, Multi-Region replication, CDN setups
- Security: DevSecOps, Azure Sentinel, IAM, Network Firewalls, TLS/SSL, OWASP Top 10 hardening
- Database Admin: Azure SQL, CosmosDB, Redis Caching, PostgreSQL clustering
- Scripting/Coding: PL/SQL, Python, Go, PowerShell
- Testing: Chaos Engineering (Gremlin), Selenium, automated end-to-end security audits

WORK EXPERIENCE
Senior Infrastructure Engineer | CloudScale Tech | 2023 - Present
- Orchestrated full multi-cloud migration from on-premise to Azure and AWS using Terraform, achieving 99.99% uptime.
- Constructed and secured AKS (Azure Kubernetes Service) clusters with strict network policies, IAM integrations, and monitoring.
- Built a robust DevSecOps pipeline with automated security scanners (SonarQube, Trivy) that checks every commit for vulnerabilities.
- Managed database clusters, performance tuning, and backup strategies for Azure CosmosDB.

Lead Systems Admin | EnterpriseDB Corp | 2020 - 2023
- Designed backup-recovery drill plans that reduced RTO (Recovery Time Objective) from 4 hours to 15 minutes.
- Maintained PostgreSQL cluster sharding and wrote Python/Bash monitoring agents to alert on performance thresholds.
- Conducted regular vulnerability assessment and penetration testing across database clusters.

HACKATHONS & CERTIFICATIONS
- Hackathon: Microsoft Azure Hack 2024 - Best Enterprise Tool award (Built an automated cloud resource-cleanup agent)
- Certification: Certified Kubernetes Administrator (CKA, 2024)
- Certification: Azure Solutions Architect Expert (2024)
- Certification: CompTIA Security+ (2023)`
  }
];

// ----------------------------------------------------------------------
// DATASTORE API
// ----------------------------------------------------------------------
export const dataStore = {
  // Initialize the database with seeds if empty
  initialize() {
    if (!localStorage.getItem(KEY_JDS)) {
      localStorage.setItem(KEY_JDS, JSON.stringify(SEED_JDS));
    }
    if (!localStorage.getItem(KEY_ACTIVE_JD)) {
      localStorage.setItem(KEY_ACTIVE_JD, SEED_JDS[0].id);
    }
    if (!localStorage.getItem(KEY_PROFILE)) {
      // Seed a default mock profile
      const defaultProfile: CandidateProfile = {
        name: "Anonymous Candidate",
        preferred_roles: ["Full-Stack Software Engineer", "Frontend Engineer"],
        skills: [
          { skill: "JavaScript", category: "Coding / Programming Fundamentals", proficiency: 4, source: "self-reported" },
          { skill: "TypeScript", category: "Coding / Programming Fundamentals", proficiency: 3, source: "self-reported" },
          { skill: "React", category: "Frontend Engineering", proficiency: 4, source: "self-reported" },
          { skill: "Node.js", category: "Backend Engineering", proficiency: 3, source: "self-reported" },
          { skill: "Data Structures", category: "Data Structures & Algorithms (DSA)", proficiency: 3, source: "self-reported" },
          { skill: "System Architectures", category: "System Design", proficiency: 2, source: "self-reported" },
          { skill: "PostgreSQL", category: "Databases", proficiency: 3, source: "self-reported" },
          { skill: "Git", category: "Soft Skills / Communication", proficiency: 4, source: "self-reported" },
        ],
        hackathons: [],
        certifications: [],
        category_scores: this._calculateDefaultCategoryScores([
          { category: "Coding / Programming Fundamentals", level: 3.5 },
          { category: "Frontend Engineering", level: 4 },
          { category: "Backend Engineering", level: 3 },
          { category: "Data Structures & Algorithms (DSA)", level: 3 },
          { category: "System Design", level: 2 },
          { category: "Databases", level: 3 },
        ])
      };
      localStorage.setItem(KEY_PROFILE, JSON.stringify(defaultProfile));
    }
  },

  // Job Descriptions
  getJDs(): JobDescription[] {
    this.initialize();
    const data = localStorage.getItem(KEY_JDS);
    return data ? JSON.parse(data) : SEED_JDS;
  },

  saveJD(jd: JobDescription): JobDescription[] {
    const jds = this.getJDs();
    const index = jds.findIndex((j) => j.id === jd.id);
    if (index >= 0) {
      jds[index] = jd;
    } else {
      jds.push(jd);
    }
    localStorage.setItem(KEY_JDS, JSON.stringify(jds));
    return jds;
  },

  deleteJD(id: string): JobDescription[] {
    let jds = this.getJDs();
    jds = jds.filter((j) => j.id !== id);
    localStorage.setItem(KEY_JDS, JSON.stringify(jds));
    
    // Reset active JD if deleted
    const activeId = this.getActiveJDId();
    if (activeId === id && jds.length > 0) {
      this.setActiveJDId(jds[0].id);
    }
    return jds;
  },

  getActiveJDId(): string {
    this.initialize();
    return localStorage.getItem(KEY_ACTIVE_JD) || SEED_JDS[0].id;
  },

  setActiveJDId(id: string) {
    localStorage.setItem(KEY_ACTIVE_JD, id);
  },

  getActiveJD(): JobDescription | null {
    const id = this.getActiveJDId();
    const jds = this.getJDs();
    return jds.find((j) => j.id === id) || jds[0] || null;
  },

  // Profiles
  getProfile(): CandidateProfile {
    this.initialize();
    const data = localStorage.getItem(KEY_PROFILE);
    if (data) {
      return JSON.parse(data);
    }
    // Fallback if null
    return {
      name: "",
      preferred_roles: [],
      skills: [],
      hackathons: [],
      certifications: [],
      category_scores: this._calculateDefaultCategoryScores([])
    };
  },

  saveProfile(profile: CandidateProfile): CandidateProfile {
    // Recalculate average category scores based on skills in profile
    const categorySum: Record<RadixCategory, { sum: number; count: number }> = {} as any;
    const categories: RadixCategory[] = [
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
    ];

    categories.forEach((cat) => {
      categorySum[cat] = { sum: 0, count: 0 };
    });

    profile.skills.forEach((s) => {
      if (categorySum[s.category]) {
        categorySum[s.category].sum += s.proficiency;
        categorySum[s.category].count += 1;
      }
    });

    const category_scores: Record<RadixCategory, number> = {} as any;
    categories.forEach((cat) => {
      const stats = categorySum[cat];
      if (stats.count > 0) {
        // Map 1-5 proficiency to 0-100 percentage
        // (1 -> 20%, 2 -> 40%, 3 -> 60%, 4 -> 80%, 5 -> 100%)
        const avg_1_5 = stats.sum / stats.count;
        category_scores[cat] = Math.round(avg_1_5 * 20);
      } else {
        category_scores[cat] = 0;
      }
    });

    // Also factor in certifications and hackathons slightly to boost related categories if score > 0
    profile.certifications.forEach((c) => {
      const lowerName = c.name.toLowerCase();
      if (lowerName.includes("aws") || lowerName.includes("azure") || lowerName.includes("kubernetes") || lowerName.includes("devops")) {
        category_scores["Cloud & DevOps"] = Math.min(100, (category_scores["Cloud & DevOps"] || 0) + 10);
      }
      if (lowerName.includes("security") || lowerName.includes("comptia") || lowerName.includes("cyber")) {
        category_scores["Security"] = Math.min(100, (category_scores["Security"] || 0) + 15);
      }
      if (lowerName.includes("database") || lowerName.includes("oracle") || lowerName.includes("sql")) {
        category_scores["Databases"] = Math.min(100, (category_scores["Databases"] || 0) + 10);
      }
    });

    profile.hackathons.forEach(() => {
      category_scores["Coding / Programming Fundamentals"] = Math.min(100, (category_scores["Coding / Programming Fundamentals"] || 0) + 5);
      category_scores["Soft Skills / Communication"] = Math.min(100, (category_scores["Soft Skills / Communication"] || 0) + 5);
    });

    profile.category_scores = category_scores;
    localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
    return profile;
  },

  // Talent Check
  getTalentCheckResult(): TalentCheckResult | null {
    const data = localStorage.getItem(KEY_TALENT_CHECK);
    return data ? JSON.parse(data) : null;
  },

  saveTalentCheckResult(result: TalentCheckResult) {
    localStorage.setItem(KEY_TALENT_CHECK, JSON.stringify(result));
  },

  // Skill Match
  getSkillMatchResult(): SkillMatchResult | null {
    const data = localStorage.getItem(KEY_SKILL_MATCH);
    return data ? JSON.parse(data) : null;
  },

  saveSkillMatchResult(result: SkillMatchResult) {
    localStorage.setItem(KEY_SKILL_MATCH, JSON.stringify(result));
  },

  // Clear everything
  clearAll() {
    localStorage.removeItem(KEY_PROFILE);
    localStorage.removeItem(KEY_ACTIVE_JD);
    localStorage.removeItem(KEY_JDS);
    localStorage.removeItem(KEY_TALENT_CHECK);
    localStorage.removeItem(KEY_SKILL_MATCH);
    this.initialize();
  },

  // Helpers
  _calculateDefaultCategoryScores(initial: { category: RadixCategory; level: number }[]): Record<RadixCategory, number> {
    const scores: Record<RadixCategory, number> = {
      "Coding / Programming Fundamentals": 0,
      "Data Structures & Algorithms (DSA)": 0,
      "System Design": 0,
      "Cloud & DevOps": 0,
      "Databases": 0,
      "Frontend Engineering": 0,
      "Backend Engineering": 0,
      "AI / ML": 0,
      "Testing & QA": 0,
      "Security": 0,
      "Soft Skills / Communication": 0,
      "Domain & Business Knowledge": 0
    };
    initial.forEach((item) => {
      scores[item.category] = Math.round(item.level * 20);
    });
    return scores;
  }
};
