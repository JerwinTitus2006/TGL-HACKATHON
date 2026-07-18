from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid

# --- Skill objects ---
class SkillBase(BaseModel):
    skill_name: str
    category_code: Optional[str] = Field(default="OTHER", description="COD|DSA|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER")
    evidence: Optional[str] = Field(default="", max_length=200)
    confidence: Optional[str] = Field(default="medium", description="high|medium|low")
    priority: Optional[str] = Field(None, description="required|nice_to_have (mostly for JDs)")

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

# --- Additional Resume Substructures ---
class EducationEntry(BaseModel):
    degree: Optional[str] = ""
    institution: Optional[str] = ""
    year: Optional[str] = ""

class ProjectEntry(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""

class ExperienceEntry(BaseModel):
    role: Optional[str] = ""
    org: Optional[str] = ""
    duration: Optional[str] = ""

# --- Extractions ---
class ExtractionResponse(BaseModel):
    schema_version: str = "1.0"
    source_type: str = Field(description="jd|resume")
    source_file: str
    source_hash: str
    company: Optional[str] = None
    role: Optional[str] = None
    extracted_at: datetime
    skills: List[SkillBase]
    raw_text_ref: str
    
    # Extra fields for resumes
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    education: Optional[List[EducationEntry]] = None
    projects: Optional[List[ProjectEntry]] = None
    experience: Optional[List[ExperienceEntry]] = None

    class Config:
        from_attributes = True

# --- Candidate Profile Substructures ---
class HackathonEntry(BaseModel):
    name: str
    result: str
    year: str
    category_code: Optional[str] = None

class InternshipEntry(BaseModel):
    org: str
    role: str
    duration: str
    category_code: Optional[str] = None

class CertificationEntry(BaseModel):
    name: str
    issuer: str
    year: str
    category_code: Optional[str] = None

# --- Candidate Profile ---
class CandidateProfileCreate(BaseModel):
    name: str
    email: EmailStr
    education: str
    skills: List[SkillBase] = []
    hackathons: List[HackathonEntry] = []
    internships: List[InternshipEntry] = []
    certifications: List[CertificationEntry] = []
    preferred_roles: List[str] = []
    cv_file: Optional[str] = None

class CandidateProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    education: Optional[str] = None
    skills: Optional[List[SkillBase]] = None
    hackathons: Optional[List[HackathonEntry]] = None
    internships: Optional[List[InternshipEntry]] = None
    certifications: Optional[List[CertificationEntry]] = None
    preferred_roles: Optional[List[str]] = None
    cv_file: Optional[str] = None
    version: int = Field(description="For optimistic concurrency check")

class CandidateProfileResponse(BaseModel):
    schema_version: str = "1.0"
    candidate_id: uuid.UUID
    name: str
    email: str
    education: str
    skills: List[SkillBase]
    hackathons: List[HackathonEntry]
    internships: List[InternshipEntry]
    certifications: List[CertificationEntry]
    preferred_roles: List[str]
    cv_file: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    version: int

    class Config:
        from_attributes = True

# --- Talent Check ---
class SkillGapItem(BaseModel):
    category_code: str
    required_level: int
    required_tier: str
    candidate_level: int
    gap: bool
    gap_size: int

class TalentCheckResponse(BaseModel):
    schema_version: str = "1.0"
    candidate_id: uuid.UUID
    company: str
    skillset_gap: List[SkillGapItem]
    readiness_score: int
    computed_at: datetime

    class Config:
        from_attributes = True

# --- Skill Matching ---
class MatchedSkillItem(BaseModel):
    skill_name: str
    category_code: str
    match_type: str = Field(description="exact|fuzzy|semantic")

class MissingSkillItem(BaseModel):
    skill_name: str
    category_code: str
    importance: str = Field(description="required|nice_to_have")

class SkillMatchingResponse(BaseModel):
    schema_version: str = "1.0"
    candidate_id: uuid.UUID
    jd_source_file: str
    match_score: int
    matched_skills: List[MatchedSkillItem]
    missing_skills: List[MissingSkillItem]
    computed_at: datetime

    class Config:
        from_attributes = True

# --- Auth ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "candidate"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str

# --- LLM Parsing Schemas ---
class JDExtractSkill(BaseModel):
    skill_name: str
    category_code: Optional[str] = Field(default="OTHER", description="COD|DSA|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER")
    evidence: Optional[str] = Field(default="", max_length=200)
    confidence: Optional[str] = Field(default="medium", description="high|medium|low")
    priority: Optional[str] = Field(default="required", description="required|nice_to_have")

class JDExtractSchema(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    skills: List[JDExtractSkill]

class ResumeExtractSkill(BaseModel):
    skill_name: str
    category_code: Optional[str] = Field(default="OTHER", description="COD|DSA|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER")
    evidence: Optional[str] = Field(default="", max_length=200)
    confidence: Optional[str] = Field(default="medium", description="high|medium|low")

class ResumeExtractSchema(BaseModel):
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    education: List[EducationEntry] = []
    projects: List[ProjectEntry] = []
    experience: List[ExperienceEntry] = []
    skills: List[ResumeExtractSkill] = []
