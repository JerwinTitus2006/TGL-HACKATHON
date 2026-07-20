"""
Resume & JD Parser + Skill Extraction Algorithm Model
------------------------------------------------------
A high-performance, deterministic algorithm and model for:
1. Resume parsing (contact info, sections, experience duration, education, skills, metrics)
2. Job Description (JD) parsing (title, company, required/preferred skills, experience level, responsibilities)
3. Skill Extraction (Exact phrase matching, RapidFuzz fuzzy ontology matching, N-Gram TF-IDF statistical extraction)
4. Vector Match Engine (Weighted skill coverage, experience fit score, document cosine similarity, gap analysis)

Note: This module is completely self-contained and independent. It does not replace or interfere with live production API routes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import math
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from collections import Counter, defaultdict
from pydantic import BaseModel, Field

try:
    from rapidfuzz import fuzz, process
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


# ============================================================================
# Enums & Data Schemas
# ============================================================================

class SkillCategory(str, Enum):
    FRONTEND = "frontend"
    BACKEND = "backend"
    DATABASE = "database"
    CLOUD_DEVOPS = "cloud_devops"
    AI_ML = "ai_ml"
    MOBILE = "mobile"
    LANGUAGES = "languages"
    SOFT_SKILLS = "soft_skills"
    METHODOLOGIES = "methodologies"
    TOOLS = "tools"
    OTHER = "other"


class MatchMethod(str, Enum):
    EXACT = "exact"
    FUZZY = "fuzzy"
    NGRAM_TFIDF = "ngram_tfidf"


class ExtractedSkillItem(BaseModel):
    name: str = Field(description="Canonical name of the extracted skill")
    category: SkillCategory = Field(default=SkillCategory.OTHER, description="Skill domain category")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Extraction confidence score (0.0 - 1.0)")
    match_method: MatchMethod = Field(description="Detection method used to identify the skill")
    occurrences: int = Field(default=1, ge=1, description="Frequency of mention in the input document")
    context_snippet: Optional[str] = Field(default=None, description="Surrounding text context snippet")


class ParsedExperienceItem(BaseModel):
    role: str = Field(default="Unknown Role", description="Job title / position")
    company: str = Field(default="Unknown Company", description="Employer / organization name")
    duration_months: int = Field(default=0, ge=0, description="Estimated position duration in months")
    start_date: Optional[str] = Field(default=None, description="Extracted start date")
    end_date: Optional[str] = Field(default=None, description="Extracted end date or Present")
    description: str = Field(default="", description="Role description or bullet points")
    extracted_skills: List[str] = Field(default_factory=list, description="Skills detected specifically within this role")


class ParsedEducationItem(BaseModel):
    degree: str = Field(default="Degree", description="Degree type (e.g., Bachelor of Science, Master of Science)")
    institution: str = Field(default="Institution", description="University / College name")
    field_of_study: Optional[str] = Field(default=None, description="Major / Field of study")
    graduation_year: Optional[int] = Field(default=None, description="Graduation year")
    gpa: Optional[float] = Field(default=None, description="GPA if mentioned")


class ParsedResume(BaseModel):
    candidate_name: str = Field(default="", description="Full name of the candidate")
    email: Optional[str] = Field(default=None, description="Candidate email address")
    phone: Optional[str] = Field(default=None, description="Candidate phone number")
    linkedin_url: Optional[str] = Field(default=None, description="LinkedIn profile URL")
    github_url: Optional[str] = Field(default=None, description="GitHub profile URL")
    location: Optional[str] = Field(default=None, description="City / Region / Country")
    website: Optional[str] = Field(default=None, description="Personal portfolio or website")
    summary: str = Field(default="", description="Professional summary / profile header")
    sections: Dict[str, str] = Field(default_factory=dict, description="Extracted section map")
    skills: List[ExtractedSkillItem] = Field(default_factory=list, description="Extracted skills")
    experiences: List[ParsedExperienceItem] = Field(default_factory=list, description="Parsed work experience history")
    education: List[ParsedEducationItem] = Field(default_factory=list, description="Parsed education history")
    total_years_experience: float = Field(default=0.0, ge=0.0, description="Total computed work experience in years")
    extracted_projects: List[Dict[str, str]] = Field(default_factory=list, description="Extracted key projects")
    certifications: List[str] = Field(default_factory=list, description="Certifications / Licenses")
    stats: Dict[str, Any] = Field(default_factory=dict, description="Metadata & readability stats")


class ParsedJobDescription(BaseModel):
    job_title: str = Field(default="Target Role", description="Role / Job Title")
    company_name: str = Field(default="Company", description="Hiring Organization")
    location: Optional[str] = Field(default=None, description="Job Location / Remote status")
    employment_type: str = Field(default="Full-time", description="Full-time, Part-time, Contract, etc.")
    experience_level: str = Field(default="Mid", description="Entry, Mid, Senior, Lead/Staff, Executive")
    min_years_experience: float = Field(default=0.0, ge=0.0, description="Minimum required years of experience")
    max_years_experience: Optional[float] = Field(default=None, description="Maximum desired years of experience")
    required_skills: List[ExtractedSkillItem] = Field(default_factory=list, description="Mandatory required skills")
    preferred_skills: List[ExtractedSkillItem] = Field(default_factory=list, description="Preferred / Nice-to-have skills")
    responsibilities: List[str] = Field(default_factory=list, description="Key duties and responsibilities")
    education_requirements: List[str] = Field(default_factory=list, description="Education requirements")
    raw_text: str = Field(default="", description="Original raw text")


class MatchAnalysisResult(BaseModel):
    overall_match_score: float = Field(ge=0.0, le=100.0, description="Weighted composite match score (0-100)")
    skill_overlap_score: float = Field(ge=0.0, le=100.0, description="Skill coverage score (0-100)")
    experience_fit_score: float = Field(ge=0.0, le=100.0, description="Years of experience alignment score (0-100)")
    tf_idf_similarity_score: float = Field(ge=0.0, le=100.0, description="Document vector similarity score (0-100)")
    matching_skills: List[str] = Field(default_factory=list, description="Skills present in both candidate and JD")
    missing_required_skills: List[str] = Field(default_factory=list, description="Mandatory JD skills candidate lacks")
    missing_preferred_skills: List[str] = Field(default_factory=list, description="Preferred JD skills candidate lacks")
    detailed_breakdown: Dict[str, Any] = Field(default_factory=dict, description="Detailed score metrics and suggestions")


# ============================================================================
# Built-in Skill Ontology Database
# ============================================================================

SKILL_ONTOLOGY: Dict[SkillCategory, Dict[str, List[str]]] = {
    SkillCategory.LANGUAGES: {
        "Python": ["python", "py"],
        "JavaScript": ["javascript", "js", "ecmascript"],
        "TypeScript": ["typescript", "ts"],
        "Java": ["java"],
        "C++": ["c++", "cpp"],
        "C#": ["c#", "csharp", ".net"],
        "Go": ["golang", "go language"],
        "Rust": ["rust", "rustlang"],
        "Ruby": ["ruby"],
        "PHP": ["php"],
        "Swift": ["swift"],
        "Kotlin": ["kotlin"],
        "SQL": ["sql"],
        "R": ["r language"],
        "HTML/CSS": ["html", "css", "html5", "css3"],
        "Bash/Shell": ["bash", "shell", "powershell", "zsh"],
    },
    SkillCategory.FRONTEND: {
        "React": ["react", "reactjs", "react.js"],
        "Next.js": ["nextjs", "next.js"],
        "Vue.js": ["vue", "vuejs", "vue.js"],
        "Angular": ["angular", "angularjs"],
        "Svelte": ["svelte", "sveltekit"],
        "Tailwind CSS": ["tailwindcss", "tailwind"],
        "Redux": ["redux", "redux toolkit"],
        "Bootstrap": ["bootstrap"],
        "Webpack": ["webpack"],
        "Vite": ["vite"],
    },
    SkillCategory.BACKEND: {
        "Node.js": ["nodejs", "node.js", "node"],
        "Express.js": ["express", "expressjs", "express.js"],
        "FastAPI": ["fastapi"],
        "Django": ["django"],
        "Flask": ["flask"],
        "Spring Boot": ["spring boot", "spring framework", "spring"],
        "ASP.NET": ["asp.net", "dotnet core", ".net core"],
        "GraphQL": ["graphql"],
        "REST API": ["rest api", "restful api", "restful web services", "rest"],
        "gRPC": ["grpc"],
    },
    SkillCategory.DATABASE: {
        "PostgreSQL": ["postgresql", "postgres"],
        "MySQL": ["mysql"],
        "MongoDB": ["mongodb", "mongo"],
        "Redis": ["redis"],
        "Elasticsearch": ["elasticsearch", "elastic search"],
        "DynamoDB": ["dynamodb"],
        "SQLite": ["sqlite"],
        "Oracle": ["oracle db", "oracle database"],
        "Cassandra": ["cassandra"],
        "Neo4j": ["neo4j"],
    },
    SkillCategory.CLOUD_DEVOPS: {
        "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda"],
        "Azure": ["azure", "microsoft azure"],
        "Google Cloud Platform": ["gcp", "google cloud", "google cloud platform"],
        "Docker": ["docker", "containerization"],
        "Kubernetes": ["kubernetes", "k8s"],
        "Terraform": ["terraform"],
        "Ansible": ["ansible"],
        "Jenkins": ["jenkins"],
        "CI/CD": ["ci/cd", "ci-cd", "continuous integration", "continuous deployment"],
        "Linux": ["linux", "ubuntu", "debian", "centos"],
        "Git": ["git", "github", "gitlab", "bitbucket"],
        "NGINX": ["nginx"],
    },
    SkillCategory.AI_ML: {
        "PyTorch": ["pytorch"],
        "TensorFlow": ["tensorflow", "tf"],
        "Scikit-Learn": ["scikit-learn", "sklearn"],
        "Pandas": ["pandas"],
        "NumPy": ["numpy"],
        "OpenCV": ["opencv"],
        "Natural Language Processing": ["nlp", "natural language processing"],
        "Large Language Models": ["llm", "large language models"],
        "Retrieval-Augmented Generation": ["rag", "retrieval augmented generation"],
        "LangChain": ["langchain"],
        "Computer Vision": ["computer vision", "cv"],
        "Keras": ["keras"],
    },
    SkillCategory.MOBILE: {
        "React Native": ["react native"],
        "Flutter": ["flutter"],
        "iOS Development": ["ios", "ios development"],
        "Android Development": ["android", "android development"],
    },
    SkillCategory.METHODOLOGIES: {
        "Agile": ["agile"],
        "Scrum": ["scrum"],
        "Kanban": ["kanban"],
        "Object-Oriented Programming": ["oop", "object oriented programming"],
        "Test-Driven Development": ["tdd", "test driven development"],
        "Microservices": ["microservices", "microservice architecture"],
        "System Design": ["system design"],
    },
    SkillCategory.TOOLS: {
        "Jira": ["jira"],
        "Postman": ["postman"],
        "Figma": ["figma"],
        "VS Code": ["vs code", "vscode", "visual studio code"],
    },
    SkillCategory.SOFT_SKILLS: {
        "Communication": ["communication", "verbal communication", "written communication"],
        "Leadership": ["leadership", "team leadership"],
        "Problem Solving": ["problem solving", "analytical thinking"],
        "Teamwork": ["teamwork", "collaboration", "cross-functional collaboration"],
        "Time Management": ["time management", "prioritization"],
    }
}


# ============================================================================
# Core Resume & JD Parser Algorithm Engine Model
# ============================================================================

class ResumeJDParserModel:
    """
    Complete algorithmic model for Resume Parsing, JD Parsing, Skill Extraction, and Match Scoring.
    """

    ENGLISH_STOPWORDS = {
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
        "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
        "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he",
        "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
        "its", "itself", "just", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off",
        "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
        "should", "shouldn't", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
        "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
        "wasn't", "we", "were", "weren't", "what", "when", "where", "which", "while", "who", "whom", "why", "with",
        "won't", "would", "wouldn't", "you", "your", "yours", "yourself", "yourselves", "will", "work", "worked", "working",
        "experience", "years", "role", "candidate", "resume", "cv", "job", "position", "company", "team", "project", "projects"
    }

    SECTION_PATTERNS = {
        "summary": r"(?i)\b(summary|profile|about\s+me|objective|professional\s+summary|overview)\b",
        "skills": r"(?i)\b(skills|technical\s+skills|core\s+competencies|technologies|expertise|skill\s+set)\b",
        "experience": r"(?i)\b(work\s+experience|professional\s+experience|experience|employment\s+history|work\s+history)\b",
        "education": r"(?i)\b(education|academic\s+background|qualifications|academic\s+history)\b",
        "projects": r"(?i)\b(projects|key\s+projects|personal\s+projects|featured\s+projects)\b",
        "certifications": r"(?i)\b(certifications|certificates|licenses|credentials|courses)\b",
    }

    # ------------------------------------------------------------------------
    # 1. Skill Extraction Algorithms (Exact, Fuzzy, TF-IDF N-Gram)
    # ------------------------------------------------------------------------

    @classmethod
    def extract_skills(cls, text: str, min_confidence: float = 0.5) -> List[ExtractedSkillItem]:
        """
        Multi-tiered Skill Extraction Algorithm:
        - Tier 1: Exact boundary-aware phrase matching against skill ontology.
        - Tier 2: Fuzzy matching using RapidFuzz ratio on normalized text tokens.
        - Tier 3: N-Gram TF-IDF statistical term extraction for novel technical terms.
        """
        if not text:
            return []

        text_lower = text.lower()
        extracted_skills_map: Dict[str, ExtractedSkillItem] = {}

        # --- Tier 1: Exact Phrase Matching ---
        for category, skill_dict in SKILL_ONTOLOGY.items():
            for canonical_name, aliases in skill_dict.items():
                for alias in aliases:
                    # Boundary check for exact word matching (e.g. avoid matching "c" in "cat")
                    pattern = r"(?i)(?:\b|_)" + re.escape(alias) + r"(?:\b|_)"
                    matches = list(re.finditer(pattern, text))
                    if matches:
                        count = len(matches)
                        # Extract surrounding context snippet from first match
                        first_start = matches[0].start()
                        snippet_start = max(0, first_start - 30)
                        snippet_end = min(len(text), first_start + len(alias) + 30)
                        snippet = text[snippet_start:snippet_end].replace("\n", " ").strip()

                        extracted_skills_map[canonical_name] = ExtractedSkillItem(
                            name=canonical_name,
                            category=category,
                            confidence_score=1.0,
                            match_method=MatchMethod.EXACT,
                            occurrences=count,
                            context_snippet=f"...{snippet}..." if snippet else None
                        )
                        break  # Found match for this canonical skill

        # --- Tier 2: RapidFuzz Matching for Variants & Misspellings ---
        if HAS_RAPIDFUZZ:
            # Tokenize text into n-grams (1-3 words) to check against canonical skill names
            tokens = re.findall(r"\b[A-Za-z0-9+#.-]+\b", text)
            candidates = set()
            for i in range(len(tokens)):
                candidates.add(tokens[i])
                if i + 1 < len(tokens):
                    candidates.add(f"{tokens[i]} {tokens[i+1]}")
                if i + 2 < len(tokens):
                    candidates.add(f"{tokens[i]} {tokens[i+1]} {tokens[i+2]}")

            # All canonical names from ontology
            all_canonical = []
            canonical_to_cat = {}
            for cat, sdict in SKILL_ONTOLOGY.items():
                for cname in sdict.keys():
                    all_canonical.append(cname)
                    canonical_to_cat[cname] = cat

            for cand in candidates:
                if len(cand) < 3 or cand.lower() in cls.ENGLISH_STOPWORDS:
                    continue
                # Match candidate against canonical names
                match_tuple = process.extractOne(cand, all_canonical, scorer=fuzz.token_sort_ratio)
                if match_tuple:
                    matched_cname, score_val, _ = match_tuple
                    confidence = float(score_val) / 100.0
                    if confidence >= 0.85 and matched_cname not in extracted_skills_map:
                        extracted_skills_map[matched_cname] = ExtractedSkillItem(
                            name=matched_cname,
                            category=canonical_to_cat.get(matched_cname, SkillCategory.OTHER),
                            confidence_score=round(confidence, 2),
                            match_method=MatchMethod.FUZZY,
                            occurrences=1,
                            context_snippet=f"Fuzzy detected from '{cand}'"
                        )

        # --- Tier 3: Statistical N-Gram TF-IDF Term Extractor ---
        tfidf_terms = cls._extract_tfidf_ngrams(text, top_n=10)
        for term, tfidf_score in tfidf_terms:
            canonical_title = term.title()
            if canonical_title not in extracted_skills_map and tfidf_score >= 0.15:
                # Filter out pure general words
                if not any(w.lower() in cls.ENGLISH_STOPWORDS for w in term.split()):
                    extracted_skills_map[canonical_title] = ExtractedSkillItem(
                        name=canonical_title,
                        category=SkillCategory.OTHER,
                        confidence_score=round(min(0.9, tfidf_score * 2.5), 2),
                        match_method=MatchMethod.NGRAM_TFIDF,
                        occurrences=1,
                        context_snippet=f"Statistically extracted keyword (TF-IDF: {tfidf_score:.3f})"
                    )

        # Filter by confidence
        result = [item for item in extracted_skills_map.values() if item.confidence_score >= min_confidence]
        result.sort(key=lambda x: (x.confidence_score, x.occurrences), reverse=True)
        return result

    @classmethod
    def _extract_tfidf_ngrams(cls, text: str, top_n: int = 10) -> List[Tuple[str, float]]:
        """
        Statistical N-Gram Term Extractor using Term Frequency (TF) & Sublinear Frequency Scaling.
        """
        words = re.findall(r"\b[a-zA-Z0-9+#.-]{2,}\b", text.lower())
        filtered_words = [w for w in words if w not in cls.ENGLISH_STOPWORDS and not w.isdigit()]

        if not filtered_words:
            return []

        # Generate 1-grams, 2-grams, 3-grams
        ngrams = []
        for i in range(len(filtered_words)):
            ngrams.append(filtered_words[i])
            if i + 1 < len(filtered_words):
                ngrams.append(f"{filtered_words[i]} {filtered_words[i+1]}")
            if i + 2 < len(filtered_words):
                ngrams.append(f"{filtered_words[i]} {filtered_words[i+1]} {filtered_words[i+2]}")

        counts = Counter(ngrams)
        total_ngrams = len(ngrams) or 1

        scores = []
        for ngram, count in counts.items():
            # Sublinear TF scaling = 1 + log(tf)
            tf = (1 + math.log(count)) / math.log(total_ngrams + 1)
            # Length bonus for multi-word technical terms
            length_boost = 1.0 + 0.3 * (len(ngram.split()) - 1)
            final_score = tf * length_boost
            scores.append((ngram, round(final_score, 4)))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_n]

    # ------------------------------------------------------------------------
    # 2. Resume Parsing Algorithm
    # ------------------------------------------------------------------------

    @classmethod
    def parse_resume(cls, text: str, file_name: str = "") -> ParsedResume:
        """
        Deterministic, rule-based & statistical Resume Parsing Algorithm.
        """
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        # 1. Contact details extraction
        email = cls._extract_email(text)
        phone = cls._extract_phone(text)
        linkedin = cls._extract_linkedin(text)
        github = cls._extract_github(text)
        candidate_name = cls._extract_name(lines, file_name)

        # 2. Section segmentation
        sections = cls._segment_sections(text)

        # 3. Skill extraction across full resume
        skills = cls.extract_skills(text)

        # 4. Experience parsing & total years calculation
        exp_text = sections.get("experience", text)
        experiences, total_years = cls._parse_experiences(exp_text)

        # 5. Education parsing
        edu_text = sections.get("education", text)
        education = cls._parse_education(edu_text)

        # 6. Projects & Certifications extraction
        projects = cls._parse_projects(sections.get("projects", ""))
        certs = cls._parse_certifications(sections.get("certifications", ""))

        summary = sections.get("summary", "")
        if not summary and lines:
            # Use top line if short overview present
            top_lines = lines[1:4]
            summary = " ".join(top_lines[:2])

        # Basic Stats
        word_count = len(re.findall(r"\w+", text))
        stats = {
            "character_count": len(text),
            "word_count": word_count,
            "estimated_read_time_seconds": round(word_count / 3.5),
            "skill_count": len(skills),
        }

        return ParsedResume(
            candidate_name=candidate_name,
            email=email,
            phone=phone,
            linkedin_url=linkedin,
            github_url=github,
            location=None,
            website=None,
            summary=summary,
            sections=sections,
            skills=skills,
            experiences=experiences,
            education=education,
            total_years_experience=total_years,
            extracted_projects=projects,
            certifications=certs,
            stats=stats
        )

    # ------------------------------------------------------------------------
    # 3. Job Description (JD) Parsing Algorithm
    # ------------------------------------------------------------------------

    @classmethod
    def parse_job_description(cls, text: str) -> ParsedJobDescription:
        """
        Job Description Parsing Algorithm that structures role specs, required vs preferred skills,
        experience requirements, and education prerequisites.
        """
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        # 1. Job Title & Company Detection
        job_title = "Target Role"
        company_name = "Target Company"

        for line in lines[:10]:
            lower_line = line.lower()
            if any(kw in lower_line for kw in ["role:", "title:", "position:", "job title:"]):
                job_title = re.sub(r"(?i)^(role|title|position|job title):\s*", "", line).strip()
            elif any(kw in lower_line for kw in ["company:", "employer:", "organization:"]):
                company_name = re.sub(r"(?i)^(company|employer|organization):\s*", "", line).strip()

        if job_title == "Target Role" and lines:
            job_title = lines[0]

        # 2. Experience Level & Years Required
        exp_min, exp_max, exp_level = cls._extract_experience_requirements(text)

        # 3. Required vs Preferred Skills Extraction
        required_text, preferred_text = cls._split_jd_requirements(text)

        required_skills = cls.extract_skills(required_text or text, min_confidence=0.5)
        preferred_skills = cls.extract_skills(preferred_text, min_confidence=0.5) if preferred_text else []

        # Deduplicate preferred skills if already in required
        req_names = {s.name for s in required_skills}
        preferred_skills = [s for s in preferred_skills if s.name not in req_names]

        # 4. Responsibilities extraction (bullet points)
        responsibilities = [l for l in lines if l.startswith(("-", "*", "•", "1.", "2.", "3."))]

        return ParsedJobDescription(
            job_title=job_title,
            company_name=company_name,
            location=None,
            employment_type="Full-time",
            experience_level=exp_level,
            min_years_experience=exp_min,
            max_years_experience=exp_max,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            responsibilities=responsibilities[:15],
            education_requirements=[],
            raw_text=text
        )

    # ------------------------------------------------------------------------
    # 4. Resume to JD Matching & Similarity Algorithm
    # ------------------------------------------------------------------------

    @classmethod
    def match_resume_to_jd(
        cls,
        resume: Union[ParsedResume, str],
        jd: Union[ParsedJobDescription, str]
    ) -> MatchAnalysisResult:
        """
        Mathematical Candidate-Job Match Scoring Engine based on:
        - Required Skill Coverage (40% weight)
        - Preferred Skill Coverage (20% weight)
        - Experience Years Fit Score (20% weight)
        - Document TF-IDF Vector Cosine Similarity (20% weight)
        """
        parsed_resume = cls.parse_resume(resume) if isinstance(resume, str) else resume
        parsed_jd = cls.parse_job_description(jd) if isinstance(jd, str) else jd

        resume_skill_names = {s.name for s in parsed_resume.skills}
        required_skill_names = {s.name for s in parsed_jd.required_skills}
        preferred_skill_names = {s.name for s in parsed_jd.preferred_skills}

        # 1. Matching & Missing Skills
        matching = list(resume_skill_names.intersection(required_skill_names.union(preferred_skill_names)))
        missing_req = list(required_skill_names.difference(resume_skill_names))
        missing_pref = list(preferred_skill_names.difference(resume_skill_names))

        # 2. Skill Coverage Scores
        req_coverage = (len(required_skill_names) - len(missing_req)) / max(len(required_skill_names), 1)
        pref_coverage = (len(preferred_skill_names) - len(missing_pref)) / max(len(preferred_skill_names), 1) if preferred_skill_names else 1.0

        skill_overlap_score = round(req_coverage * 100.0, 2)

        # 3. Experience Fit Score
        req_exp = parsed_jd.min_years_experience
        cand_exp = parsed_resume.total_years_experience

        if req_exp == 0:
            exp_fit = 1.0
        elif cand_exp >= req_exp:
            exp_fit = 1.0
        else:
            exp_fit = max(0.0, cand_exp / req_exp)

        experience_fit_score = round(exp_fit * 100.0, 2)

        # 4. TF-IDF Cosine Similarity of Raw Text Documents
        resume_raw = f"{parsed_resume.summary} {' '.join(s.name for s in parsed_resume.skills)}"
        jd_raw = f"{parsed_jd.job_title} {' '.join(s.name for s in parsed_jd.required_skills)}"
        tfidf_similarity = cls._calculate_cosine_similarity(resume_raw, jd_raw)
        tfidf_similarity_score = round(tfidf_similarity * 100.0, 2)

        # 5. Composite Score Calculation
        overall = (
            0.40 * (req_coverage * 100.0) +
            0.20 * (pref_coverage * 100.0) +
            0.20 * experience_fit_score +
            0.20 * tfidf_similarity_score
        )
        overall_score = round(min(100.0, max(0.0, overall)), 2)

        breakdown = {
            "required_skills_count": len(required_skill_names),
            "matching_skills_count": len(matching),
            "missing_required_count": len(missing_req),
            "missing_preferred_count": len(missing_pref),
            "candidate_years_exp": cand_exp,
            "jd_required_years_exp": req_exp,
        }

        return MatchAnalysisResult(
            overall_match_score=overall_score,
            skill_overlap_score=skill_overlap_score,
            experience_fit_score=experience_fit_score,
            tf_idf_similarity_score=tfidf_similarity_score,
            matching_skills=matching,
            missing_required_skills=missing_req,
            missing_preferred_skills=missing_pref,
            detailed_breakdown=breakdown
        )

    # ============================================================================
    # Helper Heuristic & Regex Methods
    # ============================================================================

    @staticmethod
    def _extract_email(text: str) -> Optional[str]:
        match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
        return match.group(0) if match else None

    @staticmethod
    def _extract_phone(text: str) -> Optional[str]:
        match = re.search(r"\(?\+?\d{1,4}\)?[\s.-]?\(?\d{1,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}", text)
        return match.group(0).strip() if match else None

    @staticmethod
    def _extract_linkedin(text: str) -> Optional[str]:
        match = re.search(r"(https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+)", text, re.IGNORECASE)
        return match.group(0) if match else None

    @staticmethod
    def _extract_github(text: str) -> Optional[str]:
        match = re.search(r"(https?://(?:www\.)?github\.com/[a-zA-Z0-9_-]+)", text, re.IGNORECASE)
        return match.group(0) if match else None

    @classmethod
    def _extract_name(cls, lines: List[str], file_name: str) -> str:
        for line in lines[:3]:
            # Simple heuristic: 2 to 4 words, capitalized letters, no digits or symbols
            words = line.split()
            if 2 <= len(words) <= 4 and all(w.isalpha() or w.endswith(".") for w in words):
                if line.lower() not in cls.ENGLISH_STOPWORDS:
                    return line.title()
        if file_name:
            clean_fn = re.sub(r"(?i)\b(resume|cv|profile|doc|pdf|docx)\b", "", file_name)
            clean_fn = re.sub(r"[-_.]", " ", os.path.splitext(clean_fn)[0]).strip()
            if clean_fn:
                return clean_fn.title()
        return "Candidate Name"

    @classmethod
    def _segment_sections(cls, text: str) -> Dict[str, str]:
        sections: Dict[str, str] = {}
        lines = text.splitlines()

        current_section = "header"
        section_content: Dict[str, List[str]] = defaultdict(list)

        for line in lines:
            clean_line = line.strip()
            if not clean_line:
                continue

            matched_sec = None
            for sec_name, pattern in cls.SECTION_PATTERNS.items():
                if re.match(pattern, clean_line) and len(clean_line) < 40:
                    matched_sec = sec_name
                    break

            if matched_sec:
                current_section = matched_sec
            else:
                section_content[current_section].append(clean_line)

        for sec, l_list in section_content.items():
            sections[sec] = "\n".join(l_list)

        return sections

    @classmethod
    def _parse_experiences(cls, text: str) -> Tuple[List[ParsedExperienceItem], float]:
        """
        Parses date ranges (e.g. 2020 - 2023, Jan 2019 to Mar 2022, 05/2018 - Present)
        and computes total duration in months and years.
        """
        date_pattern = r"(?i)\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1]?\d)[a-z]*[\s./,-]*(\d{4})\s*(?:-|to|–|until)\s*(Present|Current|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1]?\d)?[a-z]*[\s./,-]*(\d{4})?\b"

        matches = list(re.finditer(date_pattern, text))
        experiences: List[ParsedExperienceItem] = []
        total_months = 0

        for match in matches:
            start_yr = int(match.group(2))
            end_val = match.group(3)
            end_yr = int(match.group(4)) if match.group(4) else 2026

            if end_val and end_val.lower() in ["present", "current"]:
                end_yr = 2026

            months = max(1, (end_yr - start_yr) * 12)
            total_months += months

            experiences.append(ParsedExperienceItem(
                role="Software Engineer / Professional",
                company="Organization",
                duration_months=months,
                start_date=str(start_yr),
                end_date=str(end_yr),
                description=match.group(0),
                extracted_skills=[]
            ))

        if not experiences and ("year" in text.lower() or "yrs" in text.lower()):
            yr_match = re.search(r"(\d+)\+?\s*(?:years|yrs)", text, re.IGNORECASE)
            if yr_match:
                years = float(yr_match.group(1))
                return [], years

        total_years = round(total_months / 12.0, 1)
        return experiences, total_years

    @classmethod
    def _parse_education(cls, text: str) -> List[ParsedEducationItem]:
        items = []
        degree_patterns = [
            r"(?i)\b(Bachelor|B\.S\.|B\.A\.|B.S|B.A|BS|BA)\b",
            r"(?i)\b(Master|M\.S\.|M\.A\.|M.S|M.A|MS|MA)\b",
            r"(?i)\b(Ph\.D\.|PhD|Doctorate)\b",
            r"(?i)\b(Diploma|Associate)\b"
        ]

        lines = text.splitlines()
        for line in lines:
            for pat in degree_patterns:
                if re.search(pat, line):
                    year_match = re.search(r"\b(20\d{2}|19\d{2})\b", line)
                    grad_year = int(year_match.group(0)) if year_match else None
                    items.append(ParsedEducationItem(
                        degree=line.strip(),
                        institution="University / Academic Institution",
                        field_of_study=None,
                        graduation_year=grad_year
                    ))
                    break
        return items

    @staticmethod
    def _parse_projects(text: str) -> List[Dict[str, str]]:
        if not text:
            return []
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        return [{"name": l, "description": l} for l in lines[:5]]

    @staticmethod
    def _parse_certifications(text: str) -> List[str]:
        if not text:
            return []
        return [l.strip() for l in text.splitlines() if l.strip()][:5]

    @staticmethod
    def _extract_experience_requirements(text: str) -> Tuple[float, Optional[float], str]:
        pattern = r"(\d+)(?:\s*-\s*(\d+))?\s*\+?\s*(?:years|yrs)"
        match = re.search(pattern, text, re.IGNORECASE)

        min_exp = 0.0
        max_exp = None
        if match:
            min_exp = float(match.group(1))
            if match.group(2):
                max_exp = float(match.group(2))

        level = "Mid"
        if min_exp >= 7.0 or "senior" in text.lower() or "lead" in text.lower():
            level = "Senior / Lead"
        elif min_exp <= 2.0 or "junior" in text.lower() or "entry" in text.lower():
            level = "Entry / Junior"

        return min_exp, max_exp, level

    @staticmethod
    def _split_jd_requirements(text: str) -> Tuple[str, str]:
        lines = text.splitlines()
        req_lines = []
        pref_lines = []

        is_preferred = False
        for line in lines:
            lower = line.lower()
            if any(k in lower for k in ["preferred", "nice to have", "bonus", "plus"]):
                is_preferred = True
            elif any(k in lower for k in ["required", "must have", "qualifications", "responsibilities"]):
                is_preferred = False

            if is_preferred:
                pref_lines.append(line)
            else:
                req_lines.append(line)

        return "\n".join(req_lines), "\n".join(pref_lines)

    @classmethod
    def _calculate_cosine_similarity(cls, text1: str, text2: str) -> float:
        words1 = re.findall(r"\w+", text1.lower())
        words2 = re.findall(r"\w+", text2.lower())

        vec1 = Counter(words1)
        vec2 = Counter(words2)

        intersection = set(vec1.keys()).intersection(set(vec2.keys()))
        dot_product = sum(vec1[x] * vec2[x] for x in intersection)

        sum1 = sum(v ** 2 for v in vec1.values())
        sum2 = sum(v ** 2 for v in vec2.values())

        magnitude = math.sqrt(sum1) * math.sqrt(sum2)
        if not magnitude:
            return 0.0
        return dot_product / magnitude
