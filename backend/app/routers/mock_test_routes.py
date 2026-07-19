from __future__ import annotations
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import User
from backend.app.services.mock_test import (
    create_test_session,
    get_session_questions,
    submit_test,
    get_practice_recommendations,
    get_company_leetcode_plan,
    get_user_test_history,
    get_test_results,
    run_code_simulated,
)

router = APIRouter()


class MockTestStartRequest(BaseModel):
    test_type: str
    company: Optional[str] = None
    duration_minutes: Optional[int] = 60


class MockTestSubmitRequest(BaseModel):
    session_id: str
    answers: dict[str, Any]


class RunCodeRequest(BaseModel):
    code: str
    language: str
    question_text: str
    title_slug: Optional[str] = None


@router.post("/api/mock-test/start")
async def start_mock_test(
    req: MockTestStartRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = await create_test_session(
            db=db,
            user_id=str(user.id),
            test_type=req.test_type,
            company=req.company,
            duration_minutes=req.duration_minutes or 60,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/mock-test/{session_id}")
async def get_mock_test(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = await get_session_questions(db, session_id, str(user.id))
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/api/mock-test/{session_id}/submit")
async def submit_mock_test(
    session_id: str,
    req: MockTestSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = await submit_test(db, str(user.id), session_id, req.answers)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/mock-test/results/{session_id}")
async def get_mock_results(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = await get_test_results(db, session_id, str(user.id))
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/mock-test/history/list")
async def mock_test_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await get_user_test_history(db, str(user.id))
    return {"history": result}


@router.get("/api/mock-test/practice/list")
async def practice_recommendations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await get_practice_recommendations(db, str(user.id))
    return result


@router.get("/api/mock-test/leetcode/company/{company_name}")
async def company_leetcode_plan_route(
    company_name: str,
    user: User = Depends(get_current_user),
):
    result = await get_company_leetcode_plan(company_name)
    return result


@router.post("/api/mock-test/run-code")
async def run_user_code(
    req: RunCodeRequest,
    user: User = Depends(get_current_user),
):
    result = await run_code_simulated(req.code, req.language, req.question_text, req.title_slug)
    return result
