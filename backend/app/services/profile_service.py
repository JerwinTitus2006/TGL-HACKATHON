import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import Candidate, CandidateSkill, Hackathon, Internship, Certification, Extraction
from backend.app.schemas import CandidateProfileCreate, CandidateProfileUpdate, SkillBase

def normalize_skill_name(name: str) -> str:
    """Normalize a skill name for deduplication."""
    return " ".join(name.lower().strip().split())

def confidence_value(conf: str) -> int:
    """Get numeric rank of a confidence level for comparison."""
    levels = {"high": 3, "medium": 2, "low": 1}
    return levels.get(conf.lower(), 0)

class ProfileService:
    @staticmethod
    def get_profile(db: Session, candidate_id: str) -> Candidate:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate profile {candidate_id} not found"
            )
        return candidate

    @staticmethod
    def create_profile(db: Session, user_id: str, profile_data: CandidateProfileCreate) -> Candidate:
        # Check if profile already exists for user
        existing = db.query(Candidate).filter(Candidate.user_id == user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate profile already exists for this user"
            )

        candidate = Candidate(
            user_id=user_id,
            name=profile_data.name,
            email=profile_data.email,
            education=profile_data.education,
            preferred_roles=profile_data.preferred_roles,
            cv_file_ref=profile_data.cv_file,
            version=1
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

        # Add initial skills
        for s in profile_data.skills:
            skill = CandidateSkill(
                candidate_id=candidate.id,
                skill_name=s.skill_name,
                category_code=s.category_code.upper(),
                evidence=s.evidence[:200],
                confidence=s.confidence.lower(),
                source="manual"
            )
            db.add(skill)

        # Add initial activities
        for h in profile_data.hackathons:
            db.add(Hackathon(candidate_id=candidate.id, name=h.name, result=h.result, year=h.year, category_code=h.category_code))
        for i in profile_data.internships:
            db.add(Internship(candidate_id=candidate.id, org=i.org, role=i.role, duration=i.duration, category_code=i.category_code))
        for c in profile_data.certifications:
            db.add(Certification(candidate_id=candidate.id, name=c.name, issuer=c.issuer, year=c.year, category_code=c.category_code))

        db.commit()
        db.refresh(candidate)
        return candidate

    @staticmethod
    def update_profile(db: Session, candidate_id: str, profile_data: CandidateProfileUpdate) -> Candidate:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate profile {candidate_id} not found"
            )

        # Optimistic concurrency check
        if candidate.version != profile_data.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Profile has been modified by another process. Please reload and try again."
            )

        # Update basic info
        if profile_data.name is not None:
            candidate.name = profile_data.name
        if profile_data.email is not None:
            candidate.email = profile_data.email
        if profile_data.education is not None:
            candidate.education = profile_data.education
        if profile_data.preferred_roles is not None:
            candidate.preferred_roles = profile_data.preferred_roles
        if profile_data.cv_file is not None:
            candidate.cv_file_ref = profile_data.cv_file

        # Update skills if provided
        if profile_data.skills is not None:
            # Clear old skills and replace
            db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate.id).delete()
            for s in profile_data.skills:
                skill = CandidateSkill(
                    candidate_id=candidate.id,
                    skill_name=s.skill_name,
                    category_code=s.category_code.upper(),
                    evidence=s.evidence[:200],
                    confidence=s.confidence.lower(),
                    source="manual"
                )
                db.add(skill)

        # Update activities if provided
        if profile_data.hackathons is not None:
            db.query(Hackathon).filter(Hackathon.candidate_id == candidate.id).delete()
            for h in profile_data.hackathons:
                db.add(Hackathon(candidate_id=candidate.id, name=h.name, result=h.result, year=h.year, category_code=h.category_code))

        if profile_data.internships is not None:
            db.query(Internship).filter(Internship.candidate_id == candidate.id).delete()
            for i in profile_data.internships:
                db.add(Internship(candidate_id=candidate.id, org=i.org, role=i.role, duration=i.duration, category_code=i.category_code))

        if profile_data.certifications is not None:
            db.query(Certification).filter(Certification.candidate_id == candidate.id).delete()
            for c in profile_data.certifications:
                db.add(Certification(candidate_id=candidate.id, name=c.name, issuer=c.issuer, year=c.year, category_code=c.category_code))

        # Increment version for optimistic concurrency
        candidate.version += 1
        candidate.updated_at = datetime.datetime.utcnow()
        
        db.commit()
        db.refresh(candidate)
        return candidate

    @classmethod
    def merge_resume_extraction(cls, db: Session, candidate_id: str, extraction_id: str) -> Candidate:
        """Merge skills and candidate details from a resume extraction into the candidate profile."""
        candidate = cls.get_profile(db, candidate_id)
        extraction = db.query(Extraction).filter(Extraction.id == extraction_id).first()
        if not extraction or extraction.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Extraction is not completed"
            )

        resume_data = extraction.raw_llm_response or {}
        
        # 1. Update basic profile fields with extracted info if present
        ext_name = resume_data.get("candidate_name")
        if ext_name and ext_name != "null" and str(ext_name).strip() != "":
            candidate.name = ext_name.strip()
            
        ext_email = resume_data.get("email")
        if ext_email and ext_email != "null" and str(ext_email).strip() != "":
            candidate.email = ext_email.strip()
            
        # Format education from list to string
        edu_list = resume_data.get("education", [])
        if isinstance(edu_list, list) and len(edu_list) > 0:
            edu_str = ", ".join([
                f"{e.get('degree')} at {e.get('institution')} ({e.get('year')})"
                for e in edu_list if isinstance(e, dict) and e.get("degree")
            ])
            if edu_str.strip():
                candidate.education = edu_str.strip()

        # 2. Merge skills intelligently
        existing_skills = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate.id).all()
        # Map of (normalized_name, category) -> skill
        skill_map = {
            (normalize_skill_name(s.skill_name), s.category_code.upper()): s 
            for s in existing_skills
        }
        
        extracted_skills = extraction.skills
        for es in extracted_skills:
            norm_name = normalize_skill_name(es.skill_name)
            cat_code = es.category_code.upper()
            key = (norm_name, cat_code)
            
            if key in skill_map:
                # Skill already exists, check if confidence is higher
                existing_skill = skill_map[key]
                if confidence_value(es.confidence) > confidence_value(existing_skill.confidence):
                    existing_skill.confidence = es.confidence.lower()
                    existing_skill.evidence = es.evidence[:200]
                    # Retain original source or upgrade to combined
                    existing_skill.source = "resume_parse"
            else:
                # Add new skill
                new_skill = CandidateSkill(
                    candidate_id=candidate.id,
                    skill_name=es.skill_name,
                    category_code=cat_code,
                    evidence=es.evidence[:200] if es.evidence else "From resume parsing",
                    confidence=es.confidence.lower(),
                    source="resume_parse"
                )
                db.add(new_skill)
                # Add to local map to prevent duplicates in same session
                skill_map[key] = new_skill

        # 3. Merge projects/internships if structured
        # We can map resume 'experience' to internships if it matches
        parsed_experience = resume_data.get("experience", [])
        existing_internships = db.query(Internship).filter(Internship.candidate_id == candidate.id).all()
        internship_keys = {(i.org.lower().strip(), i.role.lower().strip()) for i in existing_internships}
        
        for exp in parsed_experience:
            org = exp.get("org", "")
            role = exp.get("role", "")
            if org and role:
                key = (org.lower().strip(), role.lower().strip())
                if key not in internship_keys:
                    db.add(Internship(
                        candidate_id=candidate.id,
                        org=org,
                        role=role,
                        duration=exp.get("duration", ""),
                        category_code=None  # Can be tagged later
                    ))

        # 4. Increment profile version
        candidate.version += 1
        candidate.updated_at = datetime.datetime.utcnow()
        
        db.commit()
        db.refresh(candidate)
        return candidate
