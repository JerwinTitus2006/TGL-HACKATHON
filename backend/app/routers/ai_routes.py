from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.app.auth import get_current_user
from backend.app.models import User
from backend.app.services.ai_service import (
    analyze_resume,
    calculate_readiness,
    chat_completion,
    generate_interview_questions,
)

router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]


class ResumeRequest(BaseModel):
    resumeText: str
    targetCompany: Optional[str] = None


class InterviewRequest(BaseModel):
    company: str
    role: Optional[str] = None


class ReadinessRequest(BaseModel):
    skills: list[str]
    targetCompany: Optional[str] = None


@router.post("/api/chat")
async def chat(req: ChatRequest, user: User = Depends(get_current_user)):
    content = await chat_completion(req.messages)
    return {"content": content}


@router.post("/api/resume/analyze")
async def resume_analyze(req: ResumeRequest, user: User = Depends(get_current_user)):
    result = await analyze_resume(req.resumeText, req.targetCompany)
    return result


@router.post("/api/interview/questions")
async def interview_questions(req: InterviewRequest, user: User = Depends(get_current_user)):
    result = await generate_interview_questions(req.company, req.role)
    return result


@router.post("/api/readiness/score")
async def readiness_score(req: ReadinessRequest, user: User = Depends(get_current_user)):
    result = await calculate_readiness(req.skills, req.targetCompany)
    return result
