"""
The Shadow Recruiter (Adversarial Screening Agent) Service
----------------------------------------------------------
Adversarial two-node screening agent pipeline:
- Node 1: Critic Agent — plays a skeptical, time-pressured human screener who has 30 seconds
  and a stack of resumes, finding reasons to say NO.
- Node 2: Fairness Guard Agent — audits objections against guardrails (quote grounding check,
  demographic/non-substantive bias strike out).
"""

from datetime import datetime
import json
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session
from backend.app.models import (
    Candidate,
    Company,
    Extraction,
    ShadowRecruiterReview,
    User
)

try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


# Category Definitions
VALID_CATEGORIES = {
    "weak_evidence",
    "vague_claim",
    "unexplained_gap",
    "skill_mismatch",
    "overclaim",
    "inconsistency",
    "missing_quantification",
    "generic_phrasing"
}

PROTECTED_SIGNALS = {
    "gender", "female", "male", "woman", "man", "age", "old", "young", "graduated in",
    "race", "nationality", "caste", "religion", "name", "married", "single"
}


class ShadowRecruiterService:

    @classmethod
    def generate_review(
        cls,
        db: Session,
        candidate_id: str,
        company_id: Optional[str] = None,
        jd_extraction_id: Optional[str] = None
    ) -> ShadowRecruiterReview:
        """
        Main pipeline orchestrating the two-node agent workflow:
        1. Fetch Candidate & Context (Company/JD)
        2. Node 1: Critic Agent (Generates blunt verdict, rejection risk, raw objections)
        3. Node 2: Fairness Guard Agent (Audits quote grounding & bias guardrails)
        4. Persist review to DB
        """
        # Fetch candidate
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found")

        # Fetch optional target context
        target_company = None
        if company_id:
            target_company = db.query(Company).filter(Company.id == company_id).first()

        target_jd = None
        if jd_extraction_id:
            target_jd = db.query(Extraction).filter(Extraction.id == jd_extraction_id).first()

        # Build combined candidate resume text
        candidate_text = cls._build_candidate_text(candidate, db)

        # ---------------------------------------------------------------------
        # NODE 1: Critic Agent (Adversarial Screener)
        # ---------------------------------------------------------------------
        raw_review = cls._run_critic_agent(
            candidate_text=candidate_text,
            candidate=candidate,
            target_company=target_company,
            target_jd=target_jd
        )

        # ---------------------------------------------------------------------
        # NODE 2: Fairness Guard Agent (Auditor & Grounding Validator)
        # ---------------------------------------------------------------------
        audited_objections, audit_log = cls._run_fairness_guard_agent(
            candidate_text=candidate_text,
            raw_objections=raw_review["objections"]
        )

        # Recalculate rejection risk after struck objections
        valid_count = len(audited_objections)
        final_risk = raw_review["rejection_risk"]
        if audit_log["objections_removed"] > 0:
            final_risk = max(15, raw_review["rejection_risk"] - (audit_log["objections_removed"] * 10))

        now = datetime.utcnow()
        review = ShadowRecruiterReview(
            id=str(uuid.uuid4()),
            candidate_id=str(candidate.id),
            jd_extraction_id=str(jd_extraction_id) if jd_extraction_id else None,
            company_id=str(company_id) if company_id else None,
            verdict=raw_review["verdict"],
            rejection_risk=final_risk,
            objections=audited_objections,
            fairness_audit=audit_log,
            computed_at=now
        )

        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    # -------------------------------------------------------------------------
    # Node 1: Critic Agent Logic
    # -------------------------------------------------------------------------
    @classmethod
    def _run_critic_agent(
        cls,
        candidate_text: str,
        candidate: Candidate,
        target_company: Optional[Company],
        target_jd: Optional[Extraction]
    ) -> Dict[str, Any]:
        """
        Simulates the time-pressured, skeptical 30-second human screener.
        """
        text_lower = candidate_text.lower()
        objections = []
        risk_score = 40  # Baseline neutral risk score

        # Determine target rigor
        harshness = "standard"
        if target_company:
            harshness = "rigorous"
            risk_score += 15

        # Rule 1: Check for Vague Leadership / Unquantified Claims
        if "led" in text_lower or "managed" in text_lower or "handled" in text_lower:
            match = re.search(r"(?i)\b(led|managed|handled)\b[^.\n]*", candidate_text)
            quote = match.group(0).strip() if match else "Led project initiatives"
            if not re.search(r"\b\d+\b", quote):
                objections.append({
                    "objection_id": str(uuid.uuid4())[:8],
                    "category": "vague_claim",
                    "severity": "high",
                    "quote": quote,
                    "reasoning": "Claims leadership or management without stating team size, scope, or measurable outcome.",
                    "suggested_fix": f"Rewrite to specify exact scope: e.g., '{quote} of 5 engineers delivering X on schedule'."
                })
                risk_score += 15

        # Rule 2: Unquantified Achievements
        lines = [l.strip() for l in candidate_text.splitlines() if l.strip()]
        unquantified_lines = []
        for line in lines:
            if any(kw in line.lower() for kw in ["improved", "optimized", "increased", "reduced", "enhanced", "built"]):
                if not re.search(r"\d+%|\$\d+|\b\d+\b", line):
                    unquantified_lines.append(line)

        if unquantified_lines:
            target_quote = unquantified_lines[0]
            objections.append({
                "objection_id": str(uuid.uuid4())[:8],
                "category": "missing_quantification",
                "severity": "high" if harshness == "rigorous" else "medium",
                "quote": target_quote[:120],
                "reasoning": "Action verb used without concrete numbers or metrics to prove impact.",
                "suggested_fix": f"Add hard metrics: e.g., 'Reduced latency by 35%' instead of unquantified claim."
            })
            risk_score += 12

        # Rule 3: Generic Buzzwords
        buzzwords = ["hardworking", "passionate", "self-starter", "team player", "results-driven", "synergy", "detail-oriented"]
        found_buzzwords = [bw for bw in buzzwords if bw in text_lower]
        if found_buzzwords:
            bw_match = re.search(r"(?i)\b(" + "|".join(found_buzzwords) + r")\b", candidate_text)
            quote = bw_match.group(0) if bw_match else found_buzzwords[0]
            objections.append({
                "objection_id": str(uuid.uuid4())[:8],
                "category": "generic_phrasing",
                "severity": "low",
                "quote": quote,
                "reasoning": "Uses fluff buzzwords that add zero signal to technical capability.",
                "suggested_fix": "Remove fluff adjectives and replace with technical deliverables."
            })
            risk_score += 8

        # Rule 4: Target Company or JD Skill Gap
        if target_jd:
            jd_skills = []
            if hasattr(target_jd, "skills") and target_jd.skills:
                for s in target_jd.skills:
                    name = getattr(s, "skill_name", str(s))
                    if name:
                        jd_skills.append(name)
            elif hasattr(target_jd, "raw_llm_response") and isinstance(target_jd.raw_llm_response, dict):
                raw_s_list = target_jd.raw_llm_response.get("skills", [])
                for s in raw_s_list:
                    name = s.get("skill_name") if isinstance(s, dict) else str(s)
                    if name:
                        jd_skills.append(name)

            missing_target_skills = []
            for s_name in jd_skills:
                if s_name and s_name.lower() not in text_lower:
                    missing_target_skills.append(s_name)

            if missing_target_skills:
                objections.append({
                    "objection_id": str(uuid.uuid4())[:8],
                    "category": "skill_mismatch",
                    "severity": "high",
                    "quote": f"Target Role Requirement: {missing_target_skills[0]}",
                    "reasoning": f"Missing explicit evidence or hands-on experience in mandatory requirement '{missing_target_skills[0]}'.",
                    "suggested_fix": f"Add project bullets demonstrating usage of {missing_target_skills[0]}."
                })
                risk_score += 20

        # Construct 30-Second Verdict
        verdict = cls._generate_verdict_line(objections, candidate, target_company, target_jd)
        risk_score = min(95, max(15, risk_score))

        return {
            "verdict": verdict,
            "rejection_risk": risk_score,
            "objections": objections
        }

    # -------------------------------------------------------------------------
    # Node 2: Fairness Guard Agent Logic
    # -------------------------------------------------------------------------
    @classmethod
    def _run_fairness_guard_agent(
        cls,
        candidate_text: str,
        raw_objections: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Audits every objection generated by Critic Agent:
        1. Quote Grounding: Ensures quoted text actually exists in candidate profile/resume text.
        2. Fairness Guard: Strikes out demographic/non-substantive bias.
        """
        audited_objections = []
        removed_reasons = []
        text_lower = candidate_text.lower()

        for obj in raw_objections:
            quote = obj.get("quote", "").strip()
            reasoning = obj.get("reasoning", "").lower()

            # Rule 1: Check Bias / Demographics Guardrail
            if any(signal in reasoning for signal in PROTECTED_SIGNALS):
                removed_reasons.append("Protected demographic characteristic signal detected in reasoning")
                continue

            # Rule 2: Quote Grounding Check
            if quote.startswith("Target Role Requirement:"):
                # System generated target requirement quote, keep valid
                audited_objections.append(obj)
                continue

            # Check if quote is present in candidate text
            quote_clean = quote.lower()
            is_grounded = quote_clean in text_lower

            if not is_grounded and HAS_RAPIDFUZZ:
                # Use fuzzy token set ratio match
                ratio = fuzz.partial_ratio(quote_clean, text_lower)
                is_grounded = (ratio >= 70)

            if not is_grounded:
                removed_reasons.append(f"Unsubstantiated quote '{quote[:30]}...' not found in source resume text")
                continue

            audited_objections.append(obj)

        audit_log = {
            "objections_removed": len(removed_reasons),
            "removed_reasons": removed_reasons
        }

        return audited_objections, audit_log

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------
    @staticmethod
    def _build_candidate_text(candidate: Candidate, db: Optional[Session] = None) -> str:
        parts = [
            f"Name: {candidate.name}",
            f"Education: {candidate.education or ''}",
            f"Preferred Roles: {', '.join(candidate.preferred_roles or [])}"
        ]
        if candidate.skills:
            skill_str = ", ".join([
                f"{getattr(s, 'skill_name', str(s))} ({getattr(s, 'category_code', getattr(s, 'category', 'OTHER'))})"
                for s in candidate.skills
            ])
            parts.append(f"Skills: {skill_str}")

        if db:
            from backend.app.models import Document, Extraction
            from backend.app.utils.text_parser import extract_text
            latest_doc = db.query(Document).filter(
                Document.owner_id == candidate.user_id,
                Document.doc_type == "resume"
            ).order_by(Document.uploaded_at.desc()).first()
            
            if latest_doc:
                try:
                    resume_text = extract_text(latest_doc.storage_ref)
                    if resume_text.strip():
                        parts.append(f"\nResume Content:\n{resume_text}")
                except Exception:
                    pass

        return "\n".join(parts)

    @staticmethod
    def _generate_verdict_line(
        objections: List[Dict[str, Any]],
        candidate: Candidate,
        target_company: Optional[Company],
        target_jd: Optional[Extraction]
    ) -> str:
        company_name = target_company.name if target_company else "the screener"
        high_sev = [o for o in objections if o.get("severity") == "high"]

        if high_sev:
            cat = high_sev[0].get("category", "").replace("_", " ")
            return f"Screened out in 30 seconds: Candidate claims skills, but lacks quantified proof and exhibits {cat} under {company_name}'s bar."
        elif objections:
            return f"Passable for initial round, but {company_name} will question unquantified accomplishments and vague role descriptions."
        else:
            return f"Solid candidate profile — well-evidenced technical background with clear metrics."
