from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from backend.app.database import get_db
from backend.app.models import User, Candidate, CompanySkillset, TalentCheck
from backend.app.schemas import TalentCheckResponse
from backend.app.auth import get_current_user
from backend.app.services.scoring_service import ScoringService

router = APIRouter(prefix="/talent-check", tags=["talent-check"])

@router.post("/", response_model=TalentCheckResponse)
def run_talent_check(
    company_id: str,
    candidate_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Determine candidate ID
    if not candidate_id:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate:
            raise HTTPException(status_code=400, detail="Current user has no candidate profile initialized.")
        cand_id = candidate.id
    else:
        cand_id = uuid.UUID(candidate_id)
        candidate = db.query(Candidate).filter(Candidate.id == cand_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        # Authorize candidate view
        if candidate.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to run checks for this candidate.")

    try:
        check = ScoringService.compute_talent_check(db, cand_id, company_id)
        return check
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to calculate Talent Check: {str(e)}")

@router.get("/companies", response_model=List[dict])
def list_companies(db: Session = Depends(get_db)):
    """List unique companies in the skillset benchmark dataset."""
    companies = db.query(
        CompanySkillset.company_id,
        CompanySkillset.company_name
    ).distinct().all()
    
    # Return unique sorted list
    seen = set()
    result = []
    for c in companies:
        if c.company_id not in seen:
            seen.add(c.company_id)
            result.append({
                "company_id": c.company_id,
                "company_name": c.company_name
            })
    return sorted(result, key=lambda x: x["company_name"])

@router.get("/companies/{company_id}", response_model=List[dict])
def get_company_benchmarks(company_id: str, db: Session = Depends(get_db)):
    """Get the skill levels required by a company."""
    benchmarks = db.query(CompanySkillset).filter(CompanySkillset.company_id == company_id).all()
    if not benchmarks:
        raise HTTPException(status_code=404, detail="Company benchmark data not found")
        
    return [{
        "category_code": b.category_code,
        "required_level": b.required_level,
        "required_tier": b.required_tier
    } for b in benchmarks]

@router.get("/history", response_model=List[TalentCheckResponse])
def get_check_history(
    candidate_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not candidate_id:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate:
            return []
        cand_id = candidate.id
    else:
        cand_id = uuid.UUID(candidate_id)
        candidate = db.query(Candidate).filter(Candidate.id == cand_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        if candidate.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to access these records")

    checks = db.query(TalentCheck).filter(
        TalentCheck.candidate_id == cand_id
    ).order_by(TalentCheck.computed_at.desc()).all()
    
    return checks
