from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User, Candidate
from backend.app.schemas import CandidateProfileResponse, CandidateProfileCreate, CandidateProfileUpdate
from backend.app.auth import get_current_user
from backend.app.services.profile_service import ProfileService

router = APIRouter(prefix="/profiles", tags=["profiles"])

def get_profile_payload(candidate: Candidate) -> dict:
    """Helper to convert Candidate model + relations to CandidateProfileResponse dict."""
    skills_list = []
    for s in candidate.skills:
        skills_list.append({
            "skill_name": s.skill_name,
            "category_code": s.category_code,
            "evidence": s.evidence,
            "confidence": s.confidence,
            "source": s.source
        })
        
    hackathons_list = []
    for h in candidate.hackathons:
        hackathons_list.append({
            "name": h.name,
            "result": h.result,
            "year": h.year,
            "category_code": h.category_code
        })
        
    internships_list = []
    for i in candidate.internships:
        internships_list.append({
            "org": i.org,
            "role": i.role,
            "duration": i.duration,
            "category_code": i.category_code
        })
        
    certifications_list = []
    for c in candidate.certifications:
        certifications_list.append({
            "name": c.name,
            "issuer": c.issuer,
            "year": c.year,
            "category_code": c.category_code
        })

    return {
        "schema_version": "1.0",
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "education": candidate.education or "",
        "skills": skills_list,
        "hackathons": hackathons_list,
        "internships": internships_list,
        "certifications": certifications_list,
        "preferred_roles": candidate.preferred_roles or [],
        "cv_file": candidate.cv_file_ref,
        "created_at": candidate.created_at,
        "updated_at": candidate.updated_at,
        "version": candidate.version
    }

@router.get("/me", response_model=CandidateProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not initialized yet. Call POST /profiles/me to create one."
        )
    return get_profile_payload(candidate)

@router.post("/me", response_model=CandidateProfileResponse, status_code=status.HTTP_201_CREATED)
def create_my_profile(
    profile_data: CandidateProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = ProfileService.create_profile(db, current_user.id, profile_data)
    return get_profile_payload(candidate)

@router.put("/me", response_model=CandidateProfileResponse)
def update_my_profile(
    profile_data: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    candidate = ProfileService.update_profile(db, candidate.id, profile_data)
    return get_profile_payload(candidate)

@router.post("/me/merge-resume", response_model=CandidateProfileResponse)
def merge_resume(
    extraction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
        
    candidate = ProfileService.merge_resume_extraction(db, candidate.id, extraction_id)
    return get_profile_payload(candidate)

@router.get("/{candidate_id}", response_model=CandidateProfileResponse)
def get_candidate_profile(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Candidates can only see their own profile. Admins can see any.
    candidate = ProfileService.get_profile(db, candidate_id)
    if candidate.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this profile"
        )
    return get_profile_payload(candidate)
