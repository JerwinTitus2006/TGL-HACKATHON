import datetime
import math
import requests
import json
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

def batch_semantic_match_openrouter(jd_skills: list[str], cand_skills: list[str]) -> dict[str, str]:
    """Fallback semantic matcher using OpenRouter API."""
    if not jd_skills or not cand_skills:
        return {}
    
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        return {}
        
    prompt = (
        "You are a precise semantic matching engine. Compare these two lists of skills:\n"
        f"Candidate Skills: {json.dumps(cand_skills)}\n"
        f"Job Description Skills: {json.dumps(jd_skills)}\n\n"
        "Identify which Job Description skills are semantically equivalent to one of the Candidate Skills "
        "(e.g., 'REST API' matches 'RESTful Web Services', or 'ReactJS' matches 'React').\n"
        "Return ONLY a valid JSON object mapping the Job Description skill name to the matching Candidate Skill name, "
        "like:\n{\"JD Skill Name\": \"Candidate Skill Name\"}\n"
        "Do not include any markdown formatting, explanation, or extra characters. If no skills match, return {}."
    )
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/JerwinTitus2006/Radix",
        "X-Title": "RADIX Talent Match"
    }
    data = {
        "model": "google/gemini-2.5-flash",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 400
    }
    try:
        response = requests.post(url, json=data, headers=headers, timeout=15)
        if response.status_code == 402:
            print("[Self-Healing] Credit limit hit (402) in semantic match. Retrying with free model google/gemini-2.5-flash:free")
            data["model"] = "google/gemini-2.5-flash:free"
            response = requests.post(url, json=data, headers=headers, timeout=15)
            if response.status_code != 200:
                try:
                    import re
                    err_json = response.json() if response.status_code == 402 else {}
                    msg = err_json.get("error", {}).get("message", "")
                    match = re.search(r"can only afford (\d+)", msg)
                    if match:
                        affordable = int(match.group(1))
                        data["max_tokens"] = max(100, affordable - 10)
                        data["model"] = "google/gemini-2.5-flash"
                        print(f"[Self-Healing] Free model failed. Retrying with reduced max_tokens={data['max_tokens']}")
                        response = requests.post(url, json=data, headers=headers, timeout=15)
                except Exception:
                    pass
        if response.status_code == 200:
            res_json = response.json()
            content = res_json.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            # Clean JSON if wrapped in markdown code blocks
            if content.startswith("```"):
                lines = content.split("\n")
                if len(lines) > 2:
                    content = "\n".join(lines[1:-1])
            content = content.strip()
            return json.loads(content)
    except Exception as e:
        print(f"[OpenRouter Match Fallback] Error: {e}")
    return {}

def batch_semantic_match_local(jd_skills: list[str], cand_skills: list[str]) -> dict[str, str]:
    """Local fallback semantic matcher using rapidfuzz and synonyms mapping."""
    if not jd_skills or not cand_skills:
        return {}

    synonyms = {
        "js": "javascript",
        "javascript": "js",
        "ts": "typescript",
        "typescript": "ts",
        "py": "python",
        "python": "py",
        "postgres": "postgresql",
        "postgresql": "postgres",
        "aws": "amazon web services",
        "gcp": "google cloud platform",
        "ml": "machine learning",
        "dl": "deep learning",
        "ai": "artificial intelligence",
        "nlp": "natural language processing",
        "db": "database",
        "dsa": "data structures & algorithms",
        "oop": "object-oriented programming",
        "devops": "ci/cd",
        "rest": "restful api",
        "rest api": "restful web services"
    }

    matches = {}
    for js in jd_skills:
        js_lower = js.lower().strip()
        matched_cand = None
        
        # 1. Exact or synonym check
        for cs in cand_skills:
            cs_lower = cs.lower().strip()
            if js_lower == cs_lower:
                matched_cand = cs
                break
            if js_lower in synonyms and synonyms[js_lower] == cs_lower:
                matched_cand = cs
                break
            if cs_lower in synonyms and synonyms[cs_lower] == js_lower:
                matched_cand = cs
                break
                
        if matched_cand:
            matches[js] = matched_cand
            continue

        # 2. Word inclusion (e.g. "React" in "ReactJS" or "React Native", "Postgres" in "PostgreSQL")
        for cs in cand_skills:
            cs_lower = cs.lower().strip()
            if len(js_lower) >= 4 and len(cs_lower) >= 4:
                if js_lower in cs_lower or cs_lower in js_lower:
                    matched_cand = cs
                    break
        if matched_cand:
            matches[js] = matched_cand
            continue

        # 3. RapidFuzz token_set_ratio & token_sort_ratio
        best_ratio = 0
        best_cand = None
        for cs in cand_skills:
            cs_lower = cs.lower().strip()
            ratio1 = fuzz.token_set_ratio(js_lower, cs_lower)
            ratio2 = fuzz.token_sort_ratio(js_lower, cs_lower)
            ratio = max(ratio1, ratio2)
            if ratio > best_ratio:
                best_ratio = ratio
                best_cand = cs
                
        if best_ratio >= 75 and best_cand:
            matches[js] = best_cand

    return matches


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
        
        matched_skills = []
        missing_skills = []
        
        matched_required = 0
        total_required = 0
        matched_nice = 0
        total_nice = 0
        
        used_cand_indices = set()
        sem_jd_skills = []
        
        # 1 & 2. Exact & Fuzzy matching
        for js in jd_skills:
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
            
            # Exact Match
            if js_norm in cand_norms:
                idx = cand_norms.index(js_norm)
                matched = True
                match_type = "exact"
                
            # Fuzzy Match
            if not matched:
                for j_idx, c_norm in enumerate(cand_norms):
                    if j_idx in used_cand_indices:
                        continue
                    ratio = fuzz.token_sort_ratio(js_norm, c_norm)
                    if ratio >= 85:
                        matched = True
                        match_type = "fuzzy"
                        idx = j_idx
                        break
                        
            if matched and idx >= 0:
                used_cand_indices.add(idx)
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
                sem_jd_skills.append((js, js_name, js_norm, importance))
                
        # 3. Semantic Match
        if sem_jd_skills and len(candidate_skills) > 0:
            ollama_worked = False
            try:
                # Pre-fetch candidate embeddings once to optimize loops
                cand_embs = []
                for cs in candidate_skills:
                    cand_embs.append(get_embedding(db, cs.skill_name))
                    
                for js, js_name, js_norm, importance in sem_jd_skills:
                    js_emb = get_embedding(db, js_name)
                    best_sim = 0.0
                    best_idx = -1
                    for cs_idx, cs_emb in enumerate(cand_embs):
                        if not cs_emb or cs_idx in used_cand_indices:
                            continue
                        sim = cosine_similarity(js_emb, cs_emb)
                        if sim > best_sim:
                            best_sim = sim
                            best_idx = cs_idx
                            
                    if best_sim >= 0.70 and best_idx >= 0:
                        used_cand_indices.add(best_idx)
                        matched_skills.append({
                            "skill_name": js_name,
                            "category_code": js.category_code.upper(),
                            "match_type": "semantic",
                            "matched_with": cand_skill_names[best_idx]
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
                ollama_worked = True
            except Exception as e:
                print(f"Ollama semantic embedding failed: {e}. Falling back to OpenRouter batch matching.")
                ollama_worked = False
                
            if not ollama_worked:
                unmatched_jd_names = [item[1] for item in sem_jd_skills]
                unmatched_cand_names = [cand_skill_names[ci] for ci in range(len(candidate_skills)) if ci not in used_cand_indices]
                
                or_matches = batch_semantic_match_openrouter(unmatched_jd_names, unmatched_cand_names)
                if not or_matches:
                    print("[Local Match Fallback] OpenRouter returned no matches. Running local semantic matcher...")
                    or_matches = batch_semantic_match_local(unmatched_jd_names, unmatched_cand_names)
                
                for js, js_name, js_norm, importance in sem_jd_skills:
                    if js_name in or_matches:
                        matched_cand_name = or_matches[js_name]
                        try:
                            best_idx = cand_skill_names.index(matched_cand_name)
                            used_cand_indices.add(best_idx)
                            matched_skills.append({
                                "skill_name": js_name,
                                "category_code": js.category_code.upper(),
                                "match_type": "semantic",
                                "matched_with": matched_cand_name
                            })
                            if importance == "required":
                                matched_required += 1
                            else:
                                matched_nice += 1
                        except ValueError:
                            missing_skills.append({
                                "skill_name": js_name,
                                "category_code": js.category_code.upper(),
                                "importance": importance
                            })
                    else:
                        missing_skills.append({
                            "skill_name": js_name,
                            "category_code": js.category_code.upper(),
                            "importance": importance
                        })
        else:
            for js, js_name, js_norm, importance in sem_jd_skills:
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
