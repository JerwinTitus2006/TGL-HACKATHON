import pytest
from backend.app.services.resume_jd_parser_model import (
    ResumeJDParserModel,
    SkillCategory,
    MatchMethod,
    ParsedResume,
    ParsedJobDescription,
    MatchAnalysisResult
)

SAMPLE_RESUME_TEXT = """
Jane Doe
Email: jane.doe@example.com
Phone: +1 (555) 019-2834
LinkedIn: https://linkedin.com/in/janedoe-dev
GitHub: https://github.com/janedoe-dev

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 5+ years of experience building high-scale web applications, microservices, and AI features.

SKILLS
- Languages: Python, JavaScript, TypeScript, SQL
- Frontend: React, Next.js, Tailwind CSS
- Backend: FastAPI, Node.js, PostgreSQL, Redis
- Cloud & DevOps: AWS, Docker, Kubernetes, Git
- AI & ML: PyTorch, LangChain, RAG

WORK EXPERIENCE
Senior Software Engineer - TechCorp Inc.
Jan 2021 - Present
- Architected RESTful microservices using Python FastAPI and PostgreSQL.
- Implemented real-time dashboard using React, TypeScript, and Redis caching.
- Deployed services to AWS EC2 and Kubernetes with CI/CD pipelines.

Software Developer - DataSystems Co.
Jun 2018 - Dec 2020
- Developed web backend using Django and PostgreSQL.
- Built interactive UI components in React and Redux.

EDUCATION
Bachelor of Science in Computer Science
State University, Graduated 2018
"""

SAMPLE_JD_TEXT = """
Job Title: Senior Backend Engineer
Company: CloudScale Solutions

ABOUT THE ROLE
We are seeking a Senior Backend Engineer to lead our core API platform.

REQUIRED QUALIFICATIONS
- 5+ years of experience with Python or Go.
- Expertise in FastAPI, Django, or Flask.
- Strong knowledge of PostgreSQL, Redis, and Database Optimization.
- Hands-on experience with AWS, Docker, and Kubernetes.
- Experience building RESTful microservices.

PREFERRED QUALIFICATIONS
- Experience with PyTorch or LangChain for AI integration.
- Familiarity with TypeScript and React.

RESPONSIBILITIES
- Design and maintain scalable microservices in Python.
- Optimize database queries and caching layers.
- Mentor junior engineers and participate in code reviews.
"""


def test_extract_contact_info():
    resume = ResumeJDParserModel.parse_resume(SAMPLE_RESUME_TEXT, file_name="Jane_Doe_Resume.pdf")
    assert resume.email == "jane.doe@example.com"
    assert resume.phone == "+1 (555) 019-2834"
    assert resume.linkedin_url == "https://linkedin.com/in/janedoe-dev"
    assert resume.github_url == "https://github.com/janedoe-dev"
    assert resume.candidate_name in ["Jane Doe", "Jane Doe Resume"]


def test_extract_skills():
    skills = ResumeJDParserModel.extract_skills(SAMPLE_RESUME_TEXT)
    skill_names = {s.name for s in skills}
    
    # Assert key skills detected
    assert "Python" in skill_names
    assert "React" in skill_names
    assert "FastAPI" in skill_names
    assert "PostgreSQL" in skill_names
    assert "AWS" in skill_names
    assert "Kubernetes" in skill_names


def test_parse_resume_experiences_and_education():
    resume = ResumeJDParserModel.parse_resume(SAMPLE_RESUME_TEXT)
    assert len(resume.experiences) >= 2
    assert resume.total_years_experience >= 5.0
    assert len(resume.education) >= 1
    assert "Bachelor" in resume.education[0].degree


def test_parse_job_description():
    jd = ResumeJDParserModel.parse_job_description(SAMPLE_JD_TEXT)
    assert jd.job_title in ["Senior Backend Engineer", "Job Title: Senior Backend Engineer"] or "Senior" in jd.job_title
    assert jd.min_years_experience == 5.0
    assert jd.experience_level == "Senior / Lead"

    req_skills = {s.name for s in jd.required_skills}
    pref_skills = {s.name for s in jd.preferred_skills}

    assert "Python" in req_skills or "FastAPI" in req_skills
    assert "PyTorch" in pref_skills or "TypeScript" in pref_skills


def test_match_resume_to_jd():
    resume = ResumeJDParserModel.parse_resume(SAMPLE_RESUME_TEXT)
    jd = ResumeJDParserModel.parse_job_description(SAMPLE_JD_TEXT)

    match_result = ResumeJDParserModel.match_resume_to_jd(resume, jd)
    
    assert match_result.overall_match_score > 50.0
    assert match_result.skill_overlap_score > 50.0
    assert match_result.experience_fit_score == 100.0
    assert len(match_result.matching_skills) > 0
