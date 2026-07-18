import datetime
import math
import requests
from sqlalchemy.orm import Session
from fastapi import HTTPException
from rapidfuzz import fuzz
from backend.app.config import settings
from backend.app.models import Candidate, Extraction, SkillMatch, CandidateSkill, ExtractedSkill, SkillEmbedding

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Calculate the cosine similarity between two vectors."""
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = math.sqrt(sum(x * x for x in v1))
    norm_v2 = math.sqrt(sum(y * y for y in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

def get_embedding(db: Session, text: str) -> list[float]:
    """Retrieve embedding from db cache or fetch from local Ollama nomic-embed-text."""
    norm_text = text.lower().strip()
    
    # 1. Check cache
    cached = db.query(SkillEmbedding).filter(SkillEmbedding.skill_name == norm_text).first()
    if cached:
        return cached.embedding
        
    # 2. Fetch from Ollama
    url = f"{settings.OLLAMA_URL}/api/embeddings"
    data = {
        "model": settings.OLLAMA_EMBED_MODEL,
        "prompt": text
    }
    try:
        response = requests.post(url, json=data, timeout=30)
        if response.status_code == 200:
            embedding = response.json()["embedding"]
            # Save to cache
            try:
                new_cache = SkillEmbedding(skill_name=norm_text, embedding=embedding)
                db.add(new_cache)
                db.commit()
            except Exception as db_err:
                db.rollback()
                # Try to fetch again in case it was inserted by a parallel process
                cached = db.query(SkillEmbedding).filter(SkillEmbedding.skill_name == norm_text).first()
                if cached:
                    return cached.embedding
            return embedding
        else:
            raise ValueError(f"Ollama embedding failed with status {response.status_code}: {response.text}")
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Local embedding generation failed. Ensure Ollama is running and has model '{settings.OLLAMA_EMBED_MODEL}': {str(e)}"
        )

def normalize_skill(name: str) -> str:
    """Clean and normalize skill names for string matching."""
    name = name.lower().strip()
    # Simple plural removal
    if name.endswith("s") and len(name) > 3 and not name.endswith("ss"):
        name = name[:-1]
    return name

class MatchService:
    @classmethod
    def match_candidate_to_jd(cls, db: Session, candidate_id: str, jd_extraction_id: str) -> SkillMatch:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        jd_extraction = db.query(Extraction).filter(Extraction.id == jd_extraction_id).first()
        
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        if not jd_extraction:
            raise HTTPException(status_code=404, detail="JD Extraction not found")
            
        candidate_skills = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate.id).all()
        jd_skills = db.query(ExtractedSkill).filter(ExtractedSkill.extraction_id == jd_extraction.id).all()
        
        if not jd_skills:
            return SkillMatch(
                candidate_id=candidate.id,
                extraction_id=jd_extraction.id,
                match_score=0,
                matched_skills=[],
                missing_skills=[],
                computed_at=datetime.datetime.utcnow()
            )
            
        # Prepare candidate skill lists and normalize
        cand_skill_names = [cs.skill_name for cs in candidate_skills]
        cand_norms = [normalize_skill(name) for name in cand_skill_names]
        
        # Pre-fetch candidate embeddings once to optimize loops
        cand_embs = []
        for cs in candidate_skills:
            try:
                cand_embs.append(get_embedding(db, cs.skill_name))
            except Exception as e:
                print(f"Failed to get embedding for candidate skill '{cs.skill_name}': {e}")
                cand_embs.append([])

        matched_skills = []
        missing_skills = []
        
        matched_required = 0
        total_required = 0
        matched_nice = 0
        total_nice = 0
        
        # Match each JD skill
        for i, js in enumerate(jd_skills):
            js_name = js.skill_name
            js_norm = normalize_skill(js_name)
            importance = js.priority or "required"
            
            if importance == "required":
                total_required += 1
            else:
                total_nice += 1
                
            matched = False
            match_type = None
            idx = -1
            
            # 1. Exact Match
            if js_norm in cand_norms:
                idx = cand_norms.index(js_norm)
                matched = True
                match_type = "exact"
                
            # 2. Fuzzy Match
            if not matched:
                for j_idx, c_norm in enumerate(cand_norms):
                    ratio = fuzz.token_sort_ratio(js_norm, c_norm)
                    if ratio >= 85:
                        matched = True
                        match_type = "fuzzy"
                        idx = j_idx
                        break
                        
            # 3. Semantic Match (Ollama nomic-embed-text similarity)
            if not matched and len(candidate_skills) > 0:
                try:
                    js_emb = get_embedding(db, js_name)
                    best_sim = 0.0
                    best_idx = -1
                    for cs_idx, cs_emb in enumerate(cand_embs):
                        if not cs_emb:
                            continue
                        sim = cosine_similarity(js_emb, cs_emb)
                        if sim > best_sim:
                            best_sim = sim
                            best_idx = cs_idx
                    
                    # Section 6.5 / 8: Semantic threshold of 0.70
                    if best_sim >= 0.70:
                        matched = True
                        match_type = "semantic"
                        idx = best_idx
                except Exception as e:
                    print(f"Error computing semantic similarity for '{js_name}':", e)
                    
            if matched and idx >= 0:
                matched_skills.append({
                    "skill_name": js_name,
                    "category_code": js.category_code.upper(),
                    "match_type": match_type,
                    "matched_with": cand_skill_names[idx]
                })
                if importance == "required":
                    matched_required += 1
                else:
                    matched_nice += 1
            else:
                missing_skills.append({
                    "skill_name": js_name,
                    "category_code": js.category_code.upper(),
                    "importance": importance
                })

        # Calculate score (weighted: 70% required, 30% nice_to_have)
        req_score = (matched_required / total_required) if total_required > 0 else 1.0
        nice_score = (matched_nice / total_nice) if total_nice > 0 else 1.0
        
        if total_required > 0 and total_nice > 0:
            final_score = round((0.7 * req_score + 0.3 * nice_score) * 100)
        elif total_required > 0:
            final_score = round(req_score * 100)
        elif total_nice > 0:
            final_score = round(nice_score * 100)
        else:
            final_score = 100
            
        match_result = SkillMatch(
            candidate_id=candidate.id,
            extraction_id=jd_extraction.id,
            match_score=final_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            computed_at=datetime.datetime.utcnow()
        )
        
        db.add(match_result)
        db.commit()
        db.refresh(match_result)
        return match_result
