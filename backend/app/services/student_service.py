from __future__ import annotations
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy.orm import Session

from backend.app.models import (
    User,
    Candidate,
    CandidateSkill,
    Company,
    CompanyApplication,
    StudentTest,
    InnovxOpportunity,
    InnovxApplication,
)

OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"
MODEL = "deepseek/deepseek-chat"


def _get_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    return key


def get_skills_dict(candidate: Candidate) -> dict[str, int]:
    confidence_scores = {"high": 9, "medium": 7, "low": 5}
    skills = {}
    for s in candidate.skills:
        skills[s.skill_name] = confidence_scores.get(s.confidence.lower() if s.confidence else "", 7)
    if not skills:
        skills = _mock_student_skills()
    return skills


# ── Dashboard ─────────────────────────────────────────────────────────

def get_student_dashboard(db: Session, user_id: str) -> dict[str, Any]:
    """Return dashboard overview: stats, hiring companies, assigned companies."""
    profile = _get_or_create_profile_dict(db, user_id)
    
    companies = db.query(Company).all()
    companies_data = []
    for c in companies:
        companies_data.append({
            "id": c.id,
            "name": c.name,
            "type": c.type,
            "location": c.location,
            "is_hiring": c.is_hiring,
            "deadline": c.deadline,
            "logo": c.logo,
            "required_skills": c.required_skills or {},
            
            # New fields
            "short_name": c.short_name,
            "category": c.category,
            "incorporation_year": c.incorporation_year,
            "nature_of_company": c.nature_of_company,
            "headquarters_address": c.headquarters_address,
            "office_count": c.office_count,
            "employee_size": c.employee_size,
            "website_url": c.website_url,
            "linkedin_url": c.linkedin_url,
            "twitter_handle": c.twitter_handle,
            "facebook_url": c.facebook_url,
            "instagram_url": c.instagram_url,
            "primary_contact_email": c.primary_contact_email,
            "primary_phone_number": c.primary_phone_number,
            "overview_text": c.overview_text,
            "vision_statement": c.vision_statement,
            "mission_statement": c.mission_statement,
            "legal_issues": c.legal_issues,
            "carbon_footprint": c.carbon_footprint
        })

    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    assigned_objs = db.query(CompanyApplication).filter(CompanyApplication.user_id == user_uuid).all()
    assigned = []
    for a in assigned_objs:
        comp = db.query(Company).filter(Company.id == a.company_id).first()
        assigned.append({
            "id": str(a.id),
            "company_id": a.company_id,
            "company_name": comp.name if comp else a.company_id,
            "status": a.status,
            "applied_at": a.applied_at.isoformat() + "Z",
        })

    hiring_now = [c for c in companies_data if c.get("is_hiring", True)]
    skill_gaps = _calculate_skill_gaps(profile, companies_data)

    # Compute match percentages
    for c in hiring_now:
        c["match_percentage"] = _compute_match(profile, c)
        c["skill_gap_count"] = len([s for s in skill_gaps if s.get("company_id") == c.get("id")])

    return {
        "greeting": f"Welcome back, {profile.get('name', 'Student').split()[0]}!",
        "stats": {
            "total_companies": len(companies_data),
            "hiring_now": len(hiring_now),
            "top_match": max((c.get("match_percentage", 0) for c in hiring_now), default=0),
            "skill_gaps": len(set(g.get("skill") for g in skill_gaps)),
        },
        "assigned_companies": assigned,
        "hiring_companies": hiring_now,
    }


def apply_to_company(db: Session, user_id: str, company_id: str) -> dict[str, Any]:
    """Apply to a company."""
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    app = CompanyApplication(
        user_id=user_uuid,
        company_id=company_id,
        status="pending",
        applied_at=datetime.utcnow(),
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    return {
        "id": str(app.id),
        "user_id": str(app.user_id),
        "company_id": app.company_id,
        "status": app.status,
        "applied_at": app.applied_at.isoformat() + "Z",
    }


# ── Skills Intelligence ───────────────────────────────────────────────

def get_student_skills(db: Session, user_id: str, company_id: str | None = None) -> dict[str, Any]:
    """Return skill comparison data."""
    profile = _get_or_create_profile_dict(db, user_id)
    student_skills = profile.get("skills", {})

    if company_id:
        comps = db.query(Company).filter(Company.id == company_id).all()
    else:
        comps = db.query(Company).all()

    companies = []
    for c in comps:
        companies.append({
            "id": c.id,
            "name": c.name,
            "required_skills": c.required_skills or {},
        })

    skill_comparisons = []
    for skill_name, score in student_skills.items():
        required = 0
        if companies:
            reqs = [c.get("required_skills", {}).get(skill_name, 5) for c in companies]
            required = max(reqs) if reqs else 5
        skill_comparisons.append({
            "skill": skill_name,
            "your_score": score,
            "required_score": required,
            "gap": max(0, required - score),
            "met": score >= required,
        })

    return {
        "skills": skill_comparisons,
        "companies": [{"id": c.get("id"), "name": c.get("name")} for c in companies],
    }


# ── Analytics ─────────────────────────────────────────────────────────

def get_student_analytics(db: Session, user_id: str) -> dict[str, Any]:
    """Return assessment scores, LeetCode, GitHub, LinkedIn data."""
    profile = _get_or_create_profile_dict(db, user_id)
    assessments = profile.get("skills", {})

    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    # Import stats models locally
    from backend.app.models import LeetcodeStats, GithubStats, SocialConnection

    leetcode_obj = db.query(LeetcodeStats).filter(LeetcodeStats.user_id == user_uuid).first()
    github_obj = db.query(GithubStats).filter(GithubStats.user_id == user_uuid).first()
    linkedin_obj = db.query(SocialConnection).filter(
        SocialConnection.user_id == user_uuid,
        SocialConnection.platform == "linkedin"
    ).first()

    leetcode = None
    if leetcode_obj:
        leetcode = {
            "total_solved": leetcode_obj.total_solved,
            "easy_solved": leetcode_obj.easy_solved,
            "medium_solved": leetcode_obj.medium_solved,
            "hard_solved": leetcode_obj.hard_solved,
            "ranking": leetcode_obj.ranking,
            "acceptance_rate": float(leetcode_obj.acceptance_rate or 0.0),
            "streak_days": leetcode_obj.streak_days,
            "language_stats": leetcode_obj.language_stats or {},
            "recent_submissions": leetcode_obj.recent_submissions or [],
        }

    github = None
    if github_obj:
        github = {
            "login": github_obj.login,
            "public_repos": github_obj.public_repos,
            "followers": github_obj.followers,
            "total_commits_last_year": github_obj.total_commits_last_year,
            "languages": github_obj.languages or {},
            "top_repos": github_obj.top_repos or [],
            "contribution_streak": github_obj.contribution_streak,
        }

    linkedin = None
    if linkedin_obj:
        linkedin = {
            "username": linkedin_obj.username,
            "is_active": linkedin_obj.is_active,
        }

    avg_score = (sum(assessments.values()) / len(assessments)) if assessments else 0

    return {
        "summary": {
            "avg_assessment_score": round(avg_score, 1),
            "leetcode_problems": leetcode.get("total_solved", 0) if leetcode else 0,
            "github_repos": github.get("public_repos", 0) if github else 0,
        },
        "assessments": [{"skill": k, "score": v} for k, v in assessments.items()],
        "leetcode": leetcode,
        "github": github,
        "linkedin": linkedin,
    }


# ── Interview Prep ────────────────────────────────────────────────────

def get_interview_tests(db: Session, user_id: str) -> list[dict[str, Any]]:
    """Return test history."""
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    tests = (
        db.query(StudentTest)
        .filter(StudentTest.user_id == user_uuid)
        .order_by(StudentTest.created_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for t in tests:
        result.append({
            "id": str(t.id),
            "title": t.title,
            "type": t.type,
            "description": t.description,
            "score": t.score,
            "total": t.total,
            "created_at": t.created_at.isoformat() + "Z",
            "completed_at": t.completed_at.isoformat() + "Z" if t.completed_at else None,
        })
    return result


async def generate_interview_test(db: Session, user_id: str) -> dict[str, Any]:
    """Generate an AI practice test based on weak areas."""
    profile = _get_or_create_profile_dict(db, user_id)
    skills = profile.get("skills", {})
    weak = [k for k, v in skills.items() if v < 6]
    focus = ", ".join(weak[:3]) if weak else "general aptitude and coding"

    prompt = f"""Generate a placement practice test with 10 multiple-choice questions.
Focus areas: {focus}
Mix of: aptitude, logical reasoning, technical (DSA/DBMS/OS/OOP), and verbal.

Return ONLY valid JSON:
{{
  "title": "Practice Test - {focus}",
  "type": "mixed",
  "description": "Custom practice session addressing {focus}.",
  "questions": [
    {{
      "id": 1,
      "question": "Question text",
      "options": {{"A": "opt1", "B": "opt2", "C": "opt3", "D": "opt4"}},
      "correct_answer": "A",
      "explanation": "Why A is correct"
    }}
  ]
}}"""

    try:
        api_key = _get_api_key()
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{OPENROUTER_API_BASE}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.8,
                    "max_tokens": 4000,
                },
            )
        data = resp.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        clean = text.replace("```json", "").replace("```", "").strip()
        test_data = json.loads(clean)
    except Exception:
        test_data = _mock_test_data()

    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    test = StudentTest(
        user_id=user_uuid,
        title=test_data.get("title", "Practice Test"),
        type=test_data.get("type", "mixed"),
        description=test_data.get("description", ""),
        questions=test_data.get("questions", []),
        score=None,
        total=len(test_data.get("questions", [])),
        created_at=datetime.utcnow(),
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    return {
        "id": str(test.id),
        "title": test.title,
        "type": test.type,
        "description": test.description,
        "questions": test.questions,
        "score": test.score,
        "total": test.total,
        "created_at": test.created_at.isoformat() + "Z",
    }


def submit_interview_test(db: Session, user_id: str, test_id: str, answers: dict[str, str]) -> dict[str, Any]:
    """Grade a submitted test."""
    try:
        test_uuid = uuid.UUID(test_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValueError("Invalid test_id or user_id UUID")

    test = db.query(StudentTest).filter(StudentTest.id == test_uuid, StudentTest.user_id == user_uuid).first()
    if not test:
        raise ValueError("Test not found")

    questions = test.questions or []
    correct = 0
    results = []
    for q in questions:
        qid = str(q.get("id", ""))
        user_ans = answers.get(qid, "")
        is_correct = user_ans == q.get("correct_answer", "")
        if is_correct:
            correct += 1
        results.append({
            "id": qid,
            "correct": is_correct,
            "user_answer": user_ans,
            "correct_answer": q.get("correct_answer"),
            "explanation": q.get("explanation", ""),
        })

    total = len(questions)
    score = round((correct / total) * 100) if total > 0 else 0

    test.score = score
    test.answers = answers
    test.results = results
    test.completed_at = datetime.utcnow()
    db.commit()

    return {
        "test_id": str(test.id),
        "score": score,
        "correct": correct,
        "total": total,
        "results": results,
    }


# ── InnovX ────────────────────────────────────────────────────────────

def get_innovx_data(db: Session, user_id: str) -> dict[str, Any]:
    """Return open opportunities and user's applications."""
    opps = db.query(InnovxOpportunity).all()
    opportunities = []
    for opp in opps:
        opportunities.append({
            "id": opp.id,
            "title": opp.title,
            "company": opp.company,
            "description": opp.description,
            "due_date": opp.due_date,
            "company_avatar": opp.company_avatar,
        })

    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    apps = db.query(InnovxApplication).filter(InnovxApplication.user_id == user_uuid).all()
    applications = []
    for a in apps:
        opp_info = db.query(InnovxOpportunity).filter(InnovxOpportunity.id == a.opportunity_id).first()
        applications.append({
            "id": str(a.id),
            "opportunity_id": a.opportunity_id,
            "title": opp_info.title if opp_info else a.opportunity_id,
            "company": opp_info.company if opp_info else "Unknown",
            "status": a.status,
            "applied_at": a.applied_at.isoformat() + "Z",
        })

    applied_ids = {a["opportunity_id"] for a in applications}
    for opp in opportunities:
        opp["has_applied"] = opp["id"] in applied_ids

    return {
        "opportunities": opportunities,
        "applications": applications,
    }


def apply_to_innovx(db: Session, user_id: str, opportunity_id: str) -> dict[str, Any]:
    """Apply to an InnovX opportunity."""
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    app = InnovxApplication(
        user_id=user_uuid,
        opportunity_id=opportunity_id,
        status="pending",
        applied_at=datetime.utcnow(),
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    return {
        "id": str(app.id),
        "user_id": str(app.user_id),
        "opportunity_id": app.opportunity_id,
        "status": app.status,
        "applied_at": app.applied_at.isoformat() + "Z",
    }


# ── Profile ───────────────────────────────────────────────────────────

def get_student_profile(db: Session, user_id: str) -> dict[str, Any]:
    """Return full student profile."""
    return _get_or_create_profile_dict(db, user_id)


def update_student_profile(db: Session, user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    """Update student profile fields."""
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    candidate = db.query(Candidate).filter(Candidate.user_id == user_uuid).first()
    if not candidate:
        # Create profile stub first
        _get_or_create_candidate_obj(db, user_uuid)
        candidate = db.query(Candidate).filter(Candidate.user_id == user_uuid).first()

    allowed = {"roll_number", "branch", "year", "cgpa", "phone",
               "linkedin_url", "github_url", "leetcode_url"}
    
    for k, v in updates.items():
        if k in allowed:
            setattr(candidate, k, v)
            
    candidate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(candidate)

    return _get_profile_dict_from_obj(candidate)


# ── Helpers ───────────────────────────────────────────────────────────

def _get_or_create_profile_dict(db: Session, user_id: str) -> dict[str, Any]:
    """Get student profile from DB or create a stub, returning a dictionary."""
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    candidate = _get_or_create_candidate_obj(db, user_uuid)
    return _get_profile_dict_from_obj(candidate)


def _get_or_create_candidate_obj(db: Session, user_uuid: uuid.UUID) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.user_id == user_uuid).first()
    if candidate:
        return candidate

    user = db.query(User).filter(User.id == user_uuid).first()
    email = user.email if user else "student@karunya.edu.in"
    name = email.split("@")[0].capitalize()

    candidate = Candidate(
        user_id=user_uuid,
        name=name,
        email=email,
        education="B.Tech Computer Science and Engineering",
        preferred_roles=["Software Engineer"],
        version=1,
        roll_number="",
        branch="CSE",
        year=4,
        cgpa=0.0,
        phone="",
        linkedin_url="",
        github_url="",
        leetcode_url="",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def _get_profile_dict_from_obj(candidate: Candidate) -> dict[str, Any]:
    return {
        "user_id": str(candidate.user_id),
        "name": candidate.name,
        "email": candidate.email,
        "picture": "",
        "roll_number": candidate.roll_number or "",
        "branch": candidate.branch or "",
        "year": candidate.year or 4,
        "cgpa": float(candidate.cgpa or 0.0),
        "phone": candidate.phone or "",
        "skills": get_skills_dict(candidate),
        "linkedin_url": candidate.linkedin_url or "",
        "github_url": candidate.github_url or "",
        "leetcode_url": candidate.leetcode_url or "",
    }


def _compute_match(profile: dict, company: dict) -> int:
    skills = profile.get("skills", {})
    required = company.get("required_skills", {})
    if not required:
        return 75
    total, matched = 0, 0
    for skill, req in required.items():
        total += req
        matched += min(skills.get(skill, 0), req)
    return round((matched / total) * 100) if total > 0 else 70


def _calculate_skill_gaps(profile: dict, companies: list) -> list[dict]:
    skills = profile.get("skills", {})
    gaps = []
    for c in companies:
        for skill, req in c.get("required_skills", {}).items():
            if skills.get(skill, 0) < req:
                gaps.append({
                    "company_id": c.get("id"),
                    "skill": skill,
                    "gap": req - skills.get(skill, 0),
                })
    return gaps


def _mock_student_skills() -> dict[str, int]:
    return {
        "Data Structures": 7, "Algorithms": 6, "SQL": 8, "OOP": 7,
        "Operating Systems": 5, "Computer Networks": 6, "System Design": 4,
        "Web Development": 7, "Python": 8, "Java": 6,
    }


def _mock_test_data() -> dict[str, Any]:
    return {
        "title": "Practice Test - Mixed",
        "type": "mixed",
        "description": "A mixed practice test covering aptitude, logical reasoning, and technical topics.",
        "questions": [
            {"id": 1, "question": "What is the time complexity of binary search?",
             "options": {"A": "O(n)", "B": "O(log n)", "C": "O(n²)", "D": "O(1)"},
             "correct_answer": "B", "explanation": "Binary search halves the search space each step."},
            {"id": 2, "question": "Which data structure uses FIFO?",
             "options": {"A": "Stack", "B": "Queue", "C": "Tree", "D": "Graph"},
             "correct_answer": "B", "explanation": "Queue follows First In First Out."},
            {"id": 3, "question": "If 2x + 3 = 11, what is x?",
             "options": {"A": "3", "B": "4", "C": "5", "D": "6"},
             "correct_answer": "B", "explanation": "2x = 8, so x = 4."},
            {"id": 4, "question": "What does SQL stand for?",
             "options": {"A": "Structured Query Language", "B": "Simple Query Language",
                        "C": "Standard Query Logic", "D": "System Query Language"},
             "correct_answer": "A", "explanation": "SQL = Structured Query Language."},
            {"id": 5, "question": "Find the next: 2, 6, 12, 20, ?",
             "options": {"A": "28", "B": "30", "C": "32", "D": "36"},
             "correct_answer": "B", "explanation": "Pattern: n(n+1). 5×6 = 30."},
        ],
    }


def seed_database_companies_and_innovx(db: Session):
    # Try fetching companies from Supabase first
    from backend.app.config import settings
    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY

    companies_seeded = False

    if supabase_url and supabase_key:
        try:
            print(f"Fetching companies from Supabase: {supabase_url}...")
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{supabase_url}/rest/v1/companies", headers=headers)
                if res.status_code == 200:
                    sb_companies = res.json()
                    print(f"Successfully retrieved {len(sb_companies)} companies from Supabase.")
                    
                    if sb_companies:
                        # Clear old companies
                        db.query(Company).delete()
                        db.commit()
                        
                        for c in sb_companies:
                            name = c.get("name", "Unknown Company").strip()
                            company_id = str(c.get("company_id", uuid.uuid4()))
                            
                            # Classify category/type
                            cat = c.get("category", "") or ""
                            comp_type = "Standard"
                            if "Enterprise" in cat or "Global" in cat or "Large" in cat or "Public" in cat:
                                comp_type = "Super Dream"
                            elif "Startup" in cat or "Scale-up" in cat or "Subsidiary" in cat or "Private" in cat:
                                comp_type = "Dream"
                                
                            # Extract location
                            locs = c.get("office_locations", "") or c.get("headquarters_address", "")
                            location = "Remote"
                            if locs:
                                first_loc = locs.split(";")[0].split(",")[0].strip()
                                if first_loc:
                                    location = first_loc
                                    
                            # Determine logo character
                            logo = name[0] if name else "C"
                            
                            # Extract required skills
                            overview = c.get("overview_text", "") or ""
                            overview_lower = overview.lower()
                            
                            required_skills = {}
                            if "apple" in name.lower() or "ios" in overview_lower or "iphone" in overview_lower:
                                required_skills = {
                                    "Data Structures": 8,
                                    "Algorithms": 8,
                                    "System Design": 8,
                                    "Swift": 9,
                                    "iOS Development": 9,
                                    "Objective-C": 7,
                                    "C++": 8
                                }
                            elif "google" in name.lower() or "alphabet" in name.lower():
                                required_skills = {
                                    "Data Structures": 9,
                                    "Algorithms": 9,
                                    "System Design": 9,
                                    "Python": 8,
                                    "C++": 8,
                                    "Go": 8
                                }
                            elif "amazon" in name.lower() or "aws" in overview_lower:
                                required_skills = {
                                    "Data Structures": 8,
                                    "Algorithms": 8,
                                    "System Design": 8,
                                    "Cloud Computing": 8,
                                    "Java": 8,
                                    "Python": 7
                                }
                            elif "microsoft" in name.lower() or "azure" in overview_lower:
                                required_skills = {
                                    "Data Structures": 8,
                                    "Algorithms": 8,
                                    "System Design": 8,
                                    "C#": 8,
                                    "Java": 7,
                                    "SQL": 7
                                }
                            else:
                                required_skills = {
                                    "Data Structures": 6,
                                    "Algorithms": 6,
                                    "SQL": 7,
                                    "OOP": 7,
                                    "Python": 6,
                                    "Java": 6
                                }
                                
                            db.add(Company(
                                id=company_id,
                                name=name,
                                type=comp_type,
                                location=location,
                                is_hiring=True,
                                deadline="2026-12-31",
                                logo=logo,
                                required_skills=required_skills,
                                short_name=c.get("short_name"),
                                category=c.get("category"),
                                incorporation_year=c.get("incorporation_year"),
                                nature_of_company=c.get("nature_of_company"),
                                headquarters_address=c.get("headquarters_address"),
                                office_count=c.get("office_count"),
                                employee_size=c.get("employee_size"),
                                website_url=c.get("website_url"),
                                linkedin_url=c.get("linkedin_url"),
                                twitter_handle=c.get("twitter_handle"),
                                facebook_url=c.get("facebook_url"),
                                instagram_url=c.get("instagram_url"),
                                primary_contact_email=c.get("primary_contact_email"),
                                primary_phone_number=c.get("primary_phone_number"),
                                overview_text=c.get("overview_text"),
                                vision_statement=c.get("vision_statement"),
                                mission_statement=c.get("mission_statement"),
                                legal_issues=c.get("legal_issues"),
                                carbon_footprint=c.get("carbon_footprint")
                            ))
                        db.commit()
                        companies_seeded = True
                        print("Supabase companies successfully synchronized with local DB.")
                else:
                    print(f"Supabase request failed with status: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"Error seeding companies from Supabase: {e}")

    # Fallback to mock companies if Supabase sync was not successful and DB is empty
    if not companies_seeded and db.query(Company).count() == 0:
        print("Falling back to local mock companies seeding...")
        mock_companies = [
            {"id": "c1", "name": "Accenture", "type": "Dream", "location": "Bangalore",
             "is_hiring": True, "deadline": "2026-08-15", "logo": "A",
             "required_skills": {"Data Structures": 6, "SQL": 7, "OOP": 6}},
            {"id": "c2", "name": "TCS", "type": "Dream", "location": "Chennai",
             "is_hiring": True, "deadline": "2026-07-30", "logo": "T",
             "required_skills": {"Data Structures": 5, "SQL": 6, "Java": 6}},
            {"id": "c3", "name": "Amazon", "type": "Super Dream", "location": "Hyderabad",
             "is_hiring": True, "deadline": "2026-09-01", "logo": "A",
             "required_skills": {"Data Structures": 8, "Algorithms": 8, "System Design": 7}},
            {"id": "c4", "name": "Infosys", "type": "Dream", "location": "Mysore",
             "is_hiring": True, "deadline": "2026-07-20", "logo": "I",
             "required_skills": {"SQL": 6, "OOP": 5, "Java": 5}},
            {"id": "c5", "name": "Microsoft", "type": "Super Dream", "location": "Noida",
             "is_hiring": True, "deadline": "2026-09-15", "logo": "M",
             "required_skills": {"Data Structures": 9, "Algorithms": 9, "System Design": 8}},
            {"id": "c6", "name": "Wipro", "type": "Standard", "location": "Bangalore",
             "is_hiring": True, "deadline": "2026-07-10", "logo": "W",
             "required_skills": {"SQL": 5, "Java": 5, "Python": 5}},
        ]
        for c in mock_companies:
            db.add(Company(
                id=c["id"],
                name=c["name"],
                type=c["type"],
                location=c["location"],
                is_hiring=c["is_hiring"],
                deadline=c["deadline"],
                logo=c["logo"],
                required_skills=c["required_skills"],
            ))
        db.commit()

    # Seed InnovX opportunities if empty
    if db.query(InnovxOpportunity).count() == 0:
        mock_innovx = [
            {"id": "inn1", "title": "AI Hackathon 2026", "company": "Google",
             "description": "Build innovative AI solutions. Top teams get internship offers.",
             "due_date": "2026-08-01", "company_avatar": "G"},
            {"id": "inn2", "title": "Cloud Workshop Series", "company": "AWS",
             "description": "Hands-on cloud architecture workshops with certification.",
             "due_date": "2026-07-15", "company_avatar": "A"},
             {"id": "inn3", "title": "Open Source Contribution Drive", "company": "Microsoft",
              "description": "Contribute to open-source projects and get recognized.",
              "due_date": "2026-09-01", "company_avatar": "M"},
        ]
        for opp in mock_innovx:
            db.add(InnovxOpportunity(
                id=opp["id"],
                title=opp["title"],
                company=opp["company"],
                description=opp["description"],
                due_date=opp["due_date"],
                company_avatar=opp["company_avatar"],
            ))
        db.commit()
