from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List
import datetime
from backend.app.database import get_db
from backend.app.models import Document, Extraction, User
from backend.app.schemas import ExtractionResponse
from backend.app.auth import get_current_user
from backend.app.utils.storage import compute_hash, save_uploaded_file
from backend.app.services.extraction_service import ExtractionService

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(..., regex="^(jd|resume)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Read file and compute hash
    file_bytes = await file.read()
    file_hash = compute_hash(file_bytes)
    
    # 2. Check if this specific user already uploaded this document
    user_doc = db.query(Document).filter(
        Document.source_hash == file_hash,
        Document.owner_id == current_user.id
    ).first()
    
    if user_doc:
        # Check if it has a completed extraction with extracted skills
        extraction = db.query(Extraction).filter(
            Extraction.document_id == user_doc.id,
            Extraction.status == "completed"
        ).first()
        
        has_valid_extraction = False
        if extraction and len(extraction.skills) > 0:
            has_valid_extraction = True
        elif extraction:
            # Refresh stale 0-skill extraction automatically
            try:
                extraction = ExtractionService.extract_document(db, user_doc.id, force=True)
                has_valid_extraction = len(extraction.skills) > 0
            except Exception:
                pass
        
        return {
            "message": "File uploaded successfully (cache hit)",
            "document_id": user_doc.id,
            "filename": user_doc.source_file_name,
            "hash": user_doc.source_hash,
            "doc_type": user_doc.doc_type,
            "has_extraction": has_valid_extraction,
            "extraction_id": extraction.id if extraction else None
        }

    # 3. Check if the file is stored by another user to reuse storage ref
    existing_any = db.query(Document).filter(Document.source_hash == file_hash).first()
    storage_path = None
    
    if existing_any:
        storage_path = existing_any.storage_ref
    else:
        # Validate size (Max 10MB)
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
            
        # Validate file type (PDF/DOCX/TXT)
        filename = file.filename
        if filename.split(".")[-1].lower() not in ["pdf", "docx", "doc", "txt"]:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use PDF, DOCX or TXT.")
            
        # Save to storage
        try:
            storage_path = save_uploaded_file(file, file_hash)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write file to disk: {str(e)}")

    # 4. Create database record for current user
    doc = Document(
        owner_id=current_user.id,
        doc_type=doc_type,
        source_file_name=file.filename,
        source_hash=file_hash,
        storage_ref=storage_path,
        uploaded_at=datetime.datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # 5. Structural cache hit: check if a completed extraction exists with skills
    other_completed_extraction = db.query(Extraction).filter(
        Extraction.status == "completed"
    ).join(Document).filter(
        Document.source_hash == file_hash
    ).first()
    
    has_extraction = False
    extraction_id = None
    
    if other_completed_extraction and len(other_completed_extraction.skills) > 0:
        # Clone extraction metadata for this user
        new_extraction = Extraction(
            document_id=doc.id,
            schema_version=other_completed_extraction.schema_version,
            company=other_completed_extraction.company,
            role=other_completed_extraction.role,
            extracted_at=other_completed_extraction.extracted_at,
            status="completed",
            raw_llm_response=other_completed_extraction.raw_llm_response,
            cost_usd=0.0
        )
        db.add(new_extraction)
        db.commit()
        db.refresh(new_extraction)
        
        # Clone extracted skills
        from backend.app.models import ExtractedSkill
        other_skills = db.query(ExtractedSkill).filter(
            ExtractedSkill.extraction_id == other_completed_extraction.id
        ).all()
        
        for os in other_skills:
            new_skill = ExtractedSkill(
                extraction_id=new_extraction.id,
                skill_name=os.skill_name,
                category_code=os.category_code,
                evidence=os.evidence,
                confidence=os.confidence,
                priority=os.priority
            )
            db.add(new_skill)
            
        db.commit()
        has_extraction = True
        extraction_id = new_extraction.id
        
    return {
        "message": "File uploaded successfully",
        "document_id": doc.id,
        "filename": doc.source_file_name,
        "hash": doc.source_hash,
        "doc_type": doc.doc_type,
        "has_extraction": has_extraction,
        "extraction_id": extraction_id
    }

@router.post("/{doc_id}/extract", response_model=ExtractionResponse)
def extract_document(
    doc_id: str,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Ensure user owns the document or is admin
    if doc.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    try:
        extraction = ExtractionService.extract_document(db, doc_id, force=force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Extraction failed: {str(e)}")
        
    # Construct response payload matching schemas.py
    skills_list = []
    for s in extraction.skills:
        skills_list.append({
            "skill_name": s.skill_name,
            "category_code": s.category_code,
            "evidence": s.evidence,
            "confidence": s.confidence,
            "priority": s.priority
        })
        
    res = {
        "schema_version": extraction.schema_version,
        "extraction_id": extraction.id,
        "source_type": doc.doc_type,
        "source_file": doc.source_file_name,
        "source_hash": doc.source_hash,
        "company": extraction.company,
        "role": extraction.role,
        "extracted_at": extraction.extracted_at,
        "skills": skills_list,
        "raw_text_ref": doc.storage_ref
    }
    
    # If it is a resume, add structured fields and auto-merge to Candidate profile
    if doc.doc_type == "resume":
        if isinstance(extraction.raw_llm_response, dict):
            res.update({
                "candidate_name": extraction.raw_llm_response.get("candidate_name"),
                "email": extraction.raw_llm_response.get("email"),
                "education": extraction.raw_llm_response.get("education", []),
                "projects": extraction.raw_llm_response.get("projects", []),
                "experience": extraction.raw_llm_response.get("experience", [])
            })
            
        # Automatically sync extracted skills into Candidate profile
        try:
            from backend.app.models import Candidate
            from backend.app.services.profile_service import ProfileService
            candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
            if not candidate:
                candidate = Candidate(
                    user_id=current_user.id,
                    name=res.get("candidate_name") or current_user.email.split("@")[0].title(),
                    email=res.get("email") or current_user.email,
                    version=1
                )
                db.add(candidate)
                db.commit()
                db.refresh(candidate)
            
            ProfileService.merge_resume_extraction(db, candidate.id, extraction.id)
        except Exception as merge_err:
            print(f"[Auto-Merge Resume Extraction] Warning: {merge_err}")
        
    return res

@router.get("/{doc_id}/extraction", response_model=ExtractionResponse)
def get_extraction(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    extraction = db.query(Extraction).filter(
        Extraction.document_id == doc_id,
        Extraction.status == "completed"
    ).first()
    
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not completed or not found for this document")
        
    skills_list = []
    for s in extraction.skills:
        skills_list.append({
            "skill_name": s.skill_name,
            "category_code": s.category_code,
            "evidence": s.evidence,
            "confidence": s.confidence,
            "priority": s.priority
        })
        
    res = {
        "schema_version": extraction.schema_version,
        "extraction_id": extraction.id,
        "source_type": doc.doc_type,
        "source_file": doc.source_file_name,
        "source_hash": doc.source_hash,
        "company": extraction.company,
        "role": extraction.role,
        "extracted_at": extraction.extracted_at,
        "skills": skills_list,
        "raw_text_ref": doc.storage_ref
    }
    
    if doc.doc_type == "resume" and isinstance(extraction.raw_llm_response, dict):
        res.update({
            "candidate_name": extraction.raw_llm_response.get("candidate_name"),
            "email": extraction.raw_llm_response.get("email"),
            "education": extraction.raw_llm_response.get("education", []),
            "projects": extraction.raw_llm_response.get("projects", []),
            "experience": extraction.raw_llm_response.get("experience", [])
        })
        
    return res

@router.get("/", response_model=List[dict])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Admins see all, candidates see their own
    if current_user.role == "admin":
        docs = db.query(Document).all()
    else:
        docs = db.query(Document).filter(Document.owner_id == current_user.id).all()
        
    res = []
    for d in docs:
        extraction = db.query(Extraction).filter(
            Extraction.document_id == d.id,
            Extraction.status == "completed"
        ).first()
        res.append({
            "document_id": d.id,
            "filename": d.source_file_name,
            "doc_type": d.doc_type,
            "uploaded_at": d.uploaded_at,
            "has_extraction": extraction is not None,
            "extraction_id": extraction.id if extraction else None
        })
    return res
