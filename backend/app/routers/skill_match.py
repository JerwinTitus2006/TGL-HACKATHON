from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from backend.app.database import get_db
from backend.app.models import User, Candidate, SkillMatch
from backend.app.schemas import SkillMatchingResponse
from backend.app.auth import get_current_user
from backend.app.services.match_service import MatchService

router = APIRouter(prefix="/skill-match", tags=["skill-match"])

@router.post("/", response_model=SkillMatchingResponse)
def run_skill_match(
    jd_extraction_id: str,
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
            raise HTTPException(status_code=403, detail="Not authorized to run match for this candidate.")

    try:
        match_record = MatchService.match_candidate_to_jd(db, cand_id, jd_extraction_id)
        
        # Load source file name from document associated with extraction
        from backend.app.models import Extraction, Document
        ext = db.query(Extraction).filter(Extraction.id == jd_extraction_id).first()
        source_file = ext.document.source_file_name if ext and ext.document else "unknown_jd.pdf"
        
        # Map DB model fields to match schema response format
        return {
            "schema_version": "1.0",
            "candidate_id": match_record.candidate_id,
            "jd_source_file": source_file,
            "match_score": match_record.match_score,
            "matched_skills": match_record.matched_skills,
            "missing_skills": match_record.missing_skills,
            "computed_at": match_record.computed_at
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to calculate Skill Match: {str(e)}")

@router.get("/history", response_model=List[SkillMatchingResponse])
def get_match_history(
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

    matches = db.query(SkillMatch).filter(
        SkillMatch.candidate_id == cand_id
    ).order_by(SkillMatch.computed_at.desc()).all()
    
    from backend.app.models import Extraction
    res = []
    for m in matches:
        # Load source file
        ext = db.query(Extraction).filter(Extraction.id == m.extraction_id).first()
        source_file = ext.document.source_file_name if ext and ext.document else "unknown_jd.pdf"
        res.append({
            "schema_version": "1.0",
            "candidate_id": m.candidate_id,
            "jd_source_file": source_file,
            "match_score": m.match_score,
            "matched_skills": m.matched_skills,
            "missing_skills": m.missing_skills,
            "computed_at": m.computed_at
        })
    return res
