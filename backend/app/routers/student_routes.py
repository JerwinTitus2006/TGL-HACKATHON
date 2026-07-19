from __future__ import annotations
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import User
from backend.app.services.student_service import (
    get_student_dashboard,
    apply_to_company,
    get_student_skills,
    get_student_analytics,
    get_interview_tests,
    generate_interview_test,
    submit_interview_test,
    get_innovx_data,
    apply_to_innovx,
    get_student_profile,
    update_student_profile,
)

router = APIRouter()


# ── Dashboard ─────────────────────────────────────────────────────────

@router.get("/api/student/dashboard")
async def student_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_student_dashboard(db, str(user.id))


@router.post("/api/student/companies/{company_id}/apply")
async def student_apply_company(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return apply_to_company(db, str(user.id), company_id)


# ── Skills ────────────────────────────────────────────────────────────

@router.get("/api/student/skills")
async def student_skills(
    company_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_student_skills(db, str(user.id), company_id)


# ── Analytics ─────────────────────────────────────────────────────────

@router.get("/api/student/analytics")
async def student_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_student_analytics(db, str(user.id))


# ── Interview Prep ────────────────────────────────────────────────────

@router.get("/api/student/interview/tests")
async def student_tests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tests = get_interview_tests(db, str(user.id))
    return {"tests": tests}


@router.post("/api/student/interview/generate")
async def student_generate_test(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    test = await generate_interview_test(db, str(user.id))
    return test


class SubmitTestRequest(BaseModel):
    answers: dict[str, str]


@router.post("/api/student/interview/tests/{test_id}/submit")
async def student_submit_test(
    test_id: str,
    req: SubmitTestRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = submit_interview_test(db, str(user.id), test_id, req.answers)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── InnovX ────────────────────────────────────────────────────────────

@router.get("/api/student/innovx")
async def student_innovx(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_innovx_data(db, str(user.id))


@router.post("/api/student/innovx/{opportunity_id}/apply")
async def student_apply_innovx(
    opportunity_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return apply_to_innovx(db, str(user.id), opportunity_id)


# ── Profile ───────────────────────────────────────────────────────────

@router.get("/api/student/profile")
async def student_profile_get(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_student_profile(db, str(user.id))


class ProfileUpdateRequest(BaseModel):
    roll_number: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[int] = None
    cgpa: Optional[float] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    leetcode_url: Optional[str] = None


@router.put("/api/student/profile")
async def student_profile_update(
    req: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    return update_student_profile(db, str(user.id), updates)
