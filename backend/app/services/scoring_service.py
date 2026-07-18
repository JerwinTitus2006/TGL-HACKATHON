import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import Candidate, CandidateSkill, Hackathon, Internship, Certification, CompanySkillset, TalentCheck

# Category mapping keywords for implicit tagging
IMPLICIT_MAPS = {
    "COD": ["code", "coding", "python", "javascript", "c++", "java", "golang", "rust", "typescript", "programming", "developer", "backend", "frontend"],
    "DSA": ["algorithm", "data structure", "algorithms", "leet", "competitive programming", "dsa", "graph", "tree", "sorting"],
    "OOD": ["oop", "ood", "object oriented", "design pattern", "design patterns", "refactoring", "solid principles"],
    "APTI": ["aptitude", "problem solving", "reasoning", "math", "statistics", "quant", "logic"],
    "COMM": ["communication", "present", "writing", "speaker", "technical writing", "speech", "lead", "manage", "collaborate", "presentation"],
    "AI": ["ai", "native", "llm", "prompt", "machine learning", "deep learning", "nlp", "vision", "pytorch", "tensorflow", "transformer", "genai", "generative ai", "neural network"],
    "CLOUD": ["cloud", "devops", "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "jenkins", "ansible", "pipelines", "infrastructure"],
    "SQL": ["sql", "database", "postgres", "mysql", "mongodb", "nosql", "redis", "schema", "query", "queries", "data model", "cassandra"],
    "SWE": ["software engineering", "swe", "git", "github", "testing", "unit test", "agile", "scrum", "clean code", "sdlc", "jest", "cypress", "ci"],
    "SYSD": ["system design", "microservice", "scalability", "load balancer", "caching", "architecture", "distributed", "message queue", "kafka", "rabbitmq"],
    "NETW": ["network", "networking", "tcp", "ip", "http", "dns", "protocol", "sockets", "socket", "grpc"],
    "OS": ["operating system", "linux", "kernel", "unix", "bash", "shell", "process", "thread", "concurrency", "multithread"]
}

def matches_category(cat: str, text1: str, text2: str = "") -> bool:
    """Check if keywords for a category appear in text1 or text2."""
    cat = cat.upper()
    if cat not in IMPLICIT_MAPS:
        return False
    t1 = text1.lower() if text1 else ""
    t2 = text2.lower() if text2 else ""
    for kw in IMPLICIT_MAPS[cat]:
        if kw in t1 or kw in t2:
            return True
    return False

class ScoringService:
    @classmethod
    def calculate_candidate_levels(cls, candidate: Candidate) -> dict[str, int]:
        """Calculate the 1-9 level for all 12 categories for a candidate."""
        categories = ["COD", "DSA", "OOD", "APTI", "COMM", "AI", "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS"]
        levels = {}

        # 1. Base Score from Skills
        skills_by_cat = {cat: [] for cat in categories}
        for s in candidate.skills:
            cat = s.category_code.upper()
            if cat in skills_by_cat:
                skills_by_cat[cat].append(s)

        # 2. Activity lists
        hackathons = candidate.hackathons or []
        internships = candidate.internships or []
        certifications = candidate.certifications or []

        for cat in categories:
            # Base score calculation
            base_score = 0.0
            for s in skills_by_cat[cat]:
                conf = s.confidence.lower()
                if conf == "high":
                    base_score += 2.0
                elif conf == "medium":
                    base_score += 1.0
                elif conf == "low":
                    base_score += 0.5
            
            # Cap base contribution at 6.0
            base_score = min(6.0, base_score)

            # Evidence bonus calculation
            evidence_bonus = 0.0

            # Internships: +2.0
            for i in internships:
                # Explicit or implicit match
                if i.category_code == cat or (not i.category_code and matches_category(cat, i.role, i.org)):
                    evidence_bonus += 2.0

            # Hackathons: +1.5 for podium, +1.0 for participation
            for h in hackathons:
                if h.category_code == cat or (not h.category_code and matches_category(cat, h.name, h.result)):
                    result_lower = h.result.lower() if h.result else ""
                    is_podium = any(kw in result_lower for kw in ["winner", "1st", "2nd", "3rd", "first", "second", "third", "runner", "placed"])
                    if is_podium:
                        evidence_bonus += 1.5
                    else:
                        evidence_bonus += 1.0

            # Certifications: +1.0
            for c in certifications:
                if c.category_code == cat or (not c.category_code and matches_category(cat, c.name, c.issuer)):
                    evidence_bonus += 1.0

            # Final candidate level calculation: min(9, max(1, round(base + evidence)))
            derived_level = round(base_score + evidence_bonus)
            levels[cat] = min(9, max(1, derived_level))

        return levels

    @classmethod
    def compute_talent_check(cls, db: Session, candidate_id: str, company_id: str) -> TalentCheck:
        """Run Talent Check comparing a candidate against a company's benchmarks."""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Fetch company skillsets
        benchmarks = db.query(CompanySkillset).filter(CompanySkillset.company_id == company_id).all()
        if not benchmarks:
            raise HTTPException(status_code=404, detail=f"Benchmark data for company '{company_id}' not found")

        candidate_levels = cls.calculate_candidate_levels(candidate)
        
        gaps = []
        total_weight = 0.0
        weighted_fit = 0.0

        for b in benchmarks:
            cat = b.category_code.upper()
            req_level = b.required_level
            cand_level = candidate_levels.get(cat, 1)
            
            gap = cand_level < req_level
            gap_size = max(0, req_level - cand_level)

            gaps.append({
                "category_code": cat,
                "required_level": req_level,
                "required_tier": b.required_tier,
                "candidate_level": cand_level,
                "gap": gap,
                "gap_size": gap_size
            })

            # Calculate Category Fit: cand_level / req_level (capped at 1.0)
            category_fit = min(1.0, cand_level / req_level) if req_level > 0 else 1.0
            
            # Equal weighting default
            weight = 1.0
            total_weight += weight
            weighted_fit += weight * category_fit

        # Calculate readiness score (0-100)
        readiness_score = round((weighted_fit / total_weight) * 100) if total_weight > 0 else 0

        # Save check results
        check = TalentCheck(
            candidate_id=candidate.id,
            company_id=company_id,
            readiness_score=readiness_score,
            skillset_gap=gaps,
            computed_at=datetime.datetime.utcnow()
        )
        db.add(check)
        db.commit()
        db.refresh(check)
        return check
