import uuid
import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum, JSON, Numeric, Table, text
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
from backend.app.database import Base

try:
    from pgvector.sqlalchemy import Vector
    PG_VECTOR_AVAILABLE = True
except ImportError:
    PG_VECTOR_AVAILABLE = False

# Safe UUID class for SQLite / Postgres
class GUID(TypeDecorator):
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID
            return dialect.type_descriptor(UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            return uuid.UUID(value)
        return value

# Custom Vector type that falls back to JSON on SQLite
class SQLiteOrPostgresVector(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, dim=1536):
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and PG_VECTOR_AVAILABLE:
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(JSON())

class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="candidate")  # candidate, admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="user", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    education = Column(String(500), nullable=True)
    preferred_roles = Column(JSON, nullable=True)  # List of strings
    cv_file_ref = Column(String(500), nullable=True)
    version = Column(Integer, default=1, nullable=False)  # For optimistic concurrency
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="candidate")
    skills = relationship("CandidateSkill", back_populates="candidate", cascade="all, delete-orphan")
    hackathons = relationship("Hackathon", back_populates="candidate", cascade="all, delete-orphan")
    internships = relationship("Internship", back_populates="candidate", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="candidate", cascade="all, delete-orphan")
    talent_checks = relationship("TalentCheck", back_populates="candidate", cascade="all, delete-orphan")
    skill_matches = relationship("SkillMatch", back_populates="candidate", cascade="all, delete-orphan")

class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    candidate_id = Column(GUID, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(255), nullable=False)
    category_code = Column(String(10), nullable=False)  # COD, DSA, OOD, etc.
    evidence = Column(String(200), nullable=True)
    confidence = Column(String(20), nullable=False)  # high, medium, low
    source = Column(String(50), nullable=False)  # manual, resume_parse
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="skills")

class Hackathon(Base):
    __tablename__ = "hackathons"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    candidate_id = Column(GUID, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    result = Column(String(255), nullable=True)
    year = Column(String(50), nullable=True)
    category_code = Column(String(10), nullable=True)  # Associated RADIX skill category

    candidate = relationship("Candidate", back_populates="hackathons")

class Internship(Base):
    __tablename__ = "internships"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    candidate_id = Column(GUID, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    org = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    duration = Column(String(100), nullable=True)
    category_code = Column(String(10), nullable=True)

    candidate = relationship("Candidate", back_populates="internships")

class Certification(Base):
    __tablename__ = "certifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    candidate_id = Column(GUID, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    issuer = Column(String(255), nullable=True)
    year = Column(String(50), nullable=True)
    category_code = Column(String(10), nullable=True)

    candidate = relationship("Candidate", back_populates="certifications")

class Document(Base):
    __tablename__ = "documents"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    owner_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doc_type = Column(String(20), nullable=False)  # jd, resume
    source_file_name = Column(String(255), nullable=False)
    source_hash = Column(String(64), unique=True, nullable=False, index=True)
    storage_ref = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="documents")
    extractions = relationship("Extraction", back_populates="document", cascade="all, delete-orphan")

class Extraction(Base):
    __tablename__ = "extractions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    schema_version = Column(String(10), default="1.0", nullable=False)
    company = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    extracted_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="pending", nullable=False)  # pending, completed, failed
    raw_llm_response = Column(JSON, nullable=True)
    cost_usd = Column(Numeric(10, 6), default=0.000000)

    document = relationship("Document", back_populates="extractions")
    skills = relationship("ExtractedSkill", back_populates="extraction", cascade="all, delete-orphan")
    skill_matches = relationship("SkillMatch", back_populates="extraction", cascade="all, delete-orphan")

class ExtractedSkill(Base):
    __tablename__ = "extracted_skills"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    extraction_id = Column(GUID, ForeignKey("extractions.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(255), nullable=False)
    category_code = Column(String(10), nullable=False)
    evidence = Column(String(200), nullable=True)
    confidence = Column(String(20), nullable=False)
    priority = Column(String(20), nullable=True)  # required, nice_to_have

    extraction = relationship("Extraction", back_populates="skills")

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum, JSON, Numeric, Table, text, UniqueConstraint

# ... other classes ...

class CompanySkillset(Base):
    __tablename__ = "company_skillsets"
    __table_args__ = (UniqueConstraint("company_id", "category_code", name="uq_company_skillsets"),)

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    company_id = Column(String(255), nullable=False, index=True)  # slugified name
    company_name = Column(String(255), nullable=False)
    category_code = Column(String(10), nullable=False)
    required_level = Column(Integer, nullable=False)
    required_tier = Column(String(10), nullable=False)  # AP, AS, CU, EV, CR

class TalentCheck(Base):
    __tablename__ = "talent_checks"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    candidate_id = Column(GUID, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(String(255), nullable=False)
    readiness_score = Column(Integer, nullable=False)
    skillset_gap = Column(JSON, nullable=False)
    computed_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="talent_checks")

    @property
    def company(self):
        return self.company_id

class SkillMatch(Base):
    __tablename__ = "skill_matches"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    candidate_id = Column(GUID, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    extraction_id = Column(GUID, ForeignKey("extractions.id", ondelete="CASCADE"), nullable=False)  # JD extraction
    match_score = Column(Integer, nullable=False)
    matched_skills = Column(JSON, nullable=False)
    missing_skills = Column(JSON, nullable=False)
    computed_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("Candidate", back_populates="skill_matches")
    extraction = relationship("Extraction", back_populates="skill_matches")

class SkillEmbedding(Base):
    __tablename__ = "skill_embeddings"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    skill_name = Column(String(255), unique=True, nullable=False, index=True)
    embedding = Column(SQLiteOrPostgresVector(768), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    actor_id = Column(GUID, nullable=True)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(GUID, nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
