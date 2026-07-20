"""
The Shadow Recruiter (Adversarial Screening Agent) Routes
----------------------------------------------------------
Candidate-facing API endpoints for generating, fetching, and tracking
adversarial resume screening reviews.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import Candidate, ShadowRecruiterReview, User
from backend.app.services.shadow_recruiter_service import ShadowRecruiterService

router = APIRouter()


class CreateReviewRequest(BaseModel):
    jd_extraction_id: Optional[str] = None
    company_id: Optional[str] = None


@router.post("/api/candidates/{candidate_id}/shadow-recruiter-review")
@router.post("/api/shadow-recruiter/review")
async def create_shadow_recruiter_review(
    req: Optional[CreateReviewRequest] = None,
    candidate_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an adversarial 30-second screening review for a candidate.
    """
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")

    target_candidate_id = str(candidate.id)
    if candidate_id and str(candidate.id) != candidate_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to request review for another candidate.")

    jd_id = req.jd_extraction_id if req else None
    company_id = req.company_id if req else None

    try:
        review = ShadowRecruiterService.generate_review(
            db=db,
            candidate_id=target_candidate_id,
            company_id=company_id,
            jd_extraction_id=jd_id
        )
        return _format_review(review)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/shadow-recruiter-review/{review_id}")
async def get_shadow_recruiter_review(
    review_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific Shadow Recruiter review by ID.
    """
    review = db.query(ShadowRecruiterReview).filter(ShadowRecruiterReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    candidate = db.query(Candidate).filter(Candidate.id == review.candidate_id).first()
    if candidate and str(candidate.user_id) != str(user.id) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this review.")

    return _format_review(review)


@router.get("/api/candidates/{candidate_id}/shadow-recruiter-reviews")
@router.get("/api/shadow-recruiter/reviews")
async def get_shadow_recruiter_reviews_history(
    candidate_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all past Shadow Recruiter reviews for the authenticated candidate (most recent first).
    """
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        return {"reviews": []}

    reviews = db.query(ShadowRecruiterReview).filter(
        ShadowRecruiterReview.candidate_id == candidate.id
    ).order_by(ShadowRecruiterReview.computed_at.desc()).all()

    return {"reviews": [_format_review(r) for r in reviews]}


def _format_review(review: ShadowRecruiterReview) -> Dict[str, Any]:
    return {
        "schema_version": "1.0",
        "review_id": str(review.id),
        "candidate_id": str(review.candidate_id),
        "context": {
            "mode": "jd_specific" if (review.jd_extraction_id or review.company_id) else "generic",
            "jd_source_file": str(review.jd_extraction_id) if review.jd_extraction_id else None,
            "company_id": str(review.company_id) if review.company_id else None,
            "harshness": "rigorous" if review.company_id else "standard"
        },
        "first_30_seconds_verdict": review.verdict,
        "overall_rejection_risk": review.rejection_risk,
        "objections": review.objections or [],
        "fairness_audit": review.fairness_audit or {"objections_removed": 0, "removed_reasons": []},
        "computed_at": review.computed_at.isoformat() + "Z" if review.computed_at else None
    }
