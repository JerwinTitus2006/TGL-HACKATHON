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

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum, JSON, Numeric, Table, text, Boolean

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
    
    roll_number = Column(String(50), nullable=True)
    branch = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True, default=4)
    cgpa = Column(Numeric(4, 2), nullable=True, default=0.0)
    phone = Column(String(50), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    leetcode_url = Column(String(255), nullable=True)
    
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

class SocialConnection(Base):
    __tablename__ = "social_connections"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)  # github, leetcode, linkedin
    username = Column(String(255), nullable=True)
    access_token = Column(String(1000), nullable=True)  # encrypted token or cookie
    extra_data = Column(JSON, nullable=True, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class GithubStats(Base):
    __tablename__ = "github_stats"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    login = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    public_repos = Column(Integer, default=0)
    followers = Column(Integer, default=0)
    following = Column(Integer, default=0)
    total_commits_last_year = Column(Integer, default=0)
    languages = Column(JSON, nullable=True, default={})
    top_repos = Column(JSON, nullable=True, default=[])
    contribution_streak = Column(Integer, default=0)
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class LeetcodeStats(Base):
    __tablename__ = "leetcode_stats"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    username = Column(String(255), nullable=True)
    real_name = Column(String(255), nullable=True)
    avatar = Column(String(500), nullable=True)
    ranking = Column(Integer, nullable=True)
    reputation = Column(Integer, nullable=True)
    total_solved = Column(Integer, default=0)
    easy_solved = Column(Integer, default=0)
    medium_solved = Column(Integer, default=0)
    hard_solved = Column(Integer, default=0)
    acceptance_rate = Column(Numeric(5, 2), default=0.0)
    streak_days = Column(Integer, default=0)
    total_submissions = Column(Integer, default=0)
    contest_rating = Column(Numeric(8, 2), nullable=True)
    contest_ranking = Column(String(50), nullable=True)
    language_stats = Column(JSON, nullable=True, default={})
    recent_submissions = Column(JSON, nullable=True, default=[])
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class MockTestSession(Base):
    __tablename__ = "mock_test_sessions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    test_type = Column(String(50), nullable=False)  # coding_only, mcq_coding
    company = Column(String(255), nullable=True)
    status = Column(String(50), default="in_progress")  # in_progress, completed
    duration_minutes = Column(Integer, default=60)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class MockTestQuestion(Base):
    __tablename__ = "mock_test_questions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    session_id = Column(GUID, ForeignKey("mock_test_sessions.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)
    difficulty = Column(String(50), nullable=True)
    question_text = Column(String(2000), nullable=False)
    title_slug = Column(String(255), nullable=True)
    topic_tags = Column(JSON, nullable=True, default=[])
    options = Column(JSON, nullable=True)
    correct_answer = Column(String(50), nullable=True)
    explanation = Column(String(4000), nullable=True)
    url = Column(String(500), nullable=True)
    user_answer = Column(String(5000), nullable=True)
    is_correct = Column(Boolean, nullable=True)

class MockTestResult(Base):
    __tablename__ = "mock_test_results"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    session_id = Column(GUID, ForeignKey("mock_test_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    test_type = Column(String(50), nullable=False)
    company = Column(String(255), nullable=True)
    status = Column(String(50), default="completed")
    total_score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    mcq_score = Column(Integer, nullable=False)
    mcq_total = Column(Integer, nullable=False)
    coding_score = Column(Integer, nullable=False)
    coding_total = Column(Integer, nullable=False)
    breakdown = Column(JSON, nullable=True)
    weak_areas = Column(JSON, nullable=True, default=[])
    recommendations = Column(JSON, nullable=True, default=[])
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

class Company(Base):
    __tablename__ = "companies"

    id = Column(String(255), primary_key=True)  # slugified/id
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=True)  # Dream, Super Dream, Standard
    location = Column(String(255), nullable=True)
    is_hiring = Column(Boolean, default=True)
    deadline = Column(String(100), nullable=True)
    logo = Column(String(50), nullable=True)
    required_skills = Column(JSON, nullable=True, default={})
    
    # Extra Supabase fields
    short_name = Column(String(255), nullable=True)
    category = Column(String(255), nullable=True)
    incorporation_year = Column(String(50), nullable=True)
    nature_of_company = Column(String(255), nullable=True)
    headquarters_address = Column(String(500), nullable=True)
    office_count = Column(String(100), nullable=True)
    employee_size = Column(String(100), nullable=True)
    website_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    twitter_handle = Column(String(255), nullable=True)
    facebook_url = Column(String(500), nullable=True)
    instagram_url = Column(String(500), nullable=True)
    primary_contact_email = Column(String(255), nullable=True)
    primary_phone_number = Column(String(100), nullable=True)
    overview_text = Column(String(2000), nullable=True)
    vision_statement = Column(String(2000), nullable=True)
    mission_statement = Column(String(2000), nullable=True)
    legal_issues = Column(String(2000), nullable=True)
    carbon_footprint = Column(String(2000), nullable=True)

class CompanyApplication(Base):
    __tablename__ = "company_applications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(String(255), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="pending")
    applied_at = Column(DateTime, default=datetime.datetime.utcnow)

class StudentTest(Base):
    __tablename__ = "student_tests"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=True)
    description = Column(String(1000), nullable=True)
    questions = Column(JSON, nullable=True, default=[])
    score = Column(Integer, nullable=True)
    total = Column(Integer, nullable=True)
    answers = Column(JSON, nullable=True)
    results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class InnovxOpportunity(Base):
    __tablename__ = "innovx_opportunities"

    id = Column(String(255), primary_key=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    due_date = Column(String(100), nullable=True)
    company_avatar = Column(String(50), nullable=True)

class InnovxApplication(Base):
    __tablename__ = "innovx_applications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    opportunity_id = Column(String(255), ForeignKey("innovx_opportunities.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="pending")
    applied_at = Column(DateTime, default=datetime.datetime.utcnow)

