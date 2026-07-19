from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from backend.app.database import get_db
from backend.app.models import User, Candidate, CompanySkillset, TalentCheck, Company
from backend.app.schemas import TalentCheckResponse
from backend.app.auth import get_current_user
from backend.app.services.scoring_service import ScoringService
from backend.app.services.ai_service import get_company_intel

router = APIRouter(prefix="/talent-check", tags=["talent-check"])

@router.post("/", response_model=TalentCheckResponse)
async def run_talent_check(
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
        
        # Fetch company details for intel extraction
        company_obj = db.query(Company).filter(Company.id == company_id).first()
        company_name = company_obj.name if company_obj else company_id
        
        # Extract or load cached intelligence
        intel = {}
        if company_obj:
            intel = await get_company_intel(
                company_name=company_name,
                overview=company_obj.overview_text or "",
                vision=company_obj.vision_statement or "",
                mission=company_obj.mission_statement or ""
            )
            
        return {
            "id": check.id,
            "candidate_id": check.candidate_id,
            "company": company_name,
            "company_id": company_id,
            "skillset_gap": check.skillset_gap,
            "readiness_score": check.readiness_score,
            "computed_at": check.computed_at,
            "company_intel": intel
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to calculate Talent Check: {str(e)}")

@router.get("/companies", response_model=List[dict])
def list_companies(db: Session = Depends(get_db)):
    """List all companies from the Company database."""
    companies = db.query(Company).all()
    result = []
    for c in companies:
        result.append({
            "company_id": c.id,
            "company_name": c.name
        })
    return sorted(result, key=lambda x: x["company_name"])

@router.get("/companies/{company_id}", response_model=List[dict])
def get_company_benchmarks(company_id: str, db: Session = Depends(get_db)):
    """Get the skill levels required by a company."""
    benchmarks = db.query(CompanySkillset).filter(CompanySkillset.company_id == company_id).all()
    if not benchmarks:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        from backend.app.services.scoring_service import IMPLICIT_MAPS
        category_levels = {cat: 1 for cat in ["COD", "DSA", "OOD", "APTI", "COMM", "AI", "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS"]}
        req_skills = company.required_skills or {}
        for skill_name, req_val in req_skills.items():
            matched_any = False
            for cat, keywords in IMPLICIT_MAPS.items():
                if any(kw in skill_name.lower() for kw in keywords):
                    category_levels[cat] = max(category_levels[cat], req_val)
                    matched_any = True
            if not matched_any:
                category_levels["COD"] = max(category_levels["COD"], 5)
        
        benchmarks = []
        for cat, lvl in category_levels.items():
            tier = "Standard"
            if lvl >= 8:
                tier = "Super Dream"
            elif lvl >= 6:
                tier = "Dream"
            
            b = CompanySkillset(
                company_id=company_id,
                company_name=company.name,
                category_code=cat,
                required_level=lvl,
                required_tier=tier
            )
            db.add(b)
            benchmarks.append(b)
        db.commit()
        
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
