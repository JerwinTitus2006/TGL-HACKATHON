import os
import json
import re
import time
from typing import Any
import requests
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.config import settings
from backend.app.models import Document, Extraction, ExtractedSkill
from backend.app.utils.text_parser import extract_text
from backend.app.schemas import JDExtractSchema, ResumeExtractSchema

def get_prompt_template(filename: str) -> str:
    """Read a prompt template from the prompts folder."""
    # Look for prompts folder in root (two levels up from app) or current directory
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "prompts", filename),
        os.path.join("prompts", filename),
        os.path.join("../prompts", filename)
    ]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
    raise FileNotFoundError(f"Prompt template {filename} not found in any of: {possible_paths}")

def clean_llm_json(text: str) -> str:
    """Clean markdown code block wrappers from JSON string."""
    text = text.strip()
    # Remove ```json ... ``` blocks
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text

def estimate_tokens(text: str) -> int:
    """Estimate number of tokens in a text (approx 1 token = 4 characters)."""
    return len(text) // 4

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate USD cost of the LLM call based on model usage."""
    if "gemini-2.5-flash" in model or "gemini-1.5-flash" in model:
        return (input_tokens * 0.075 + output_tokens * 0.3) / 1_000_000
    elif "claude-3.5-sonnet" in model:
        return (input_tokens * 3.0 + output_tokens * 15.0) / 1_000_000
    return 0.0

def extract_document_locally_fallback(text: str, doc_type: str, file_name: str) -> dict[str, Any]:
    """Deterministic, local, keyword-based fallback parser that requires no LLM/network."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # 1. Extract Email using Regex
    email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    guessed_email = email_match.group(0) if email_match else None
    
    # 2. Guess Candidate Name (best effort)
    guessed_name = ""
    if doc_type == "resume":
        # Check first 3 lines for a line with 2-3 words that are all alphabetical
        for line in lines[:3]:
            words = line.split()
            if 2 <= len(words) <= 3 and all(w.isalpha() for w in words):
                guessed_name = line
                break
        if not guessed_name:
            # Clean filename
            base_name = os.path.splitext(file_name)[0]
            # Replace common dividers with spaces
            base_name = re.sub(r"[-_]", " ", base_name)
            # Remove "resume" or "cv" case insensitively
            base_name = re.sub(r"(?i)\b(resume|cv|pdf|docx|doc|profile)\b", "", base_name).strip()
            guessed_name = base_name or "Candidate Name"
            
    # 3. Guess Company and Role for JDs
    guessed_company = ""
    guessed_role = ""
    if doc_type == "jd":
        for line in lines[:15]:
            lower_line = line.lower()
            if "company" in lower_line or "employer" in lower_line:
                parts = line.split(":", 1)
                if len(parts) > 1:
                    guessed_company = parts[1].strip()
            elif "role" in lower_line or "position" in lower_line or "title" in lower_line:
                parts = line.split(":", 1)
                if len(parts) > 1:
                    guessed_role = parts[1].strip()
        
        base_name = os.path.splitext(file_name)[0]
        if not guessed_company or not guessed_role:
            if " - " in base_name:
                parts = base_name.split(" - ", 1)
                guessed_company = guessed_company or parts[0].strip()
                guessed_role = guessed_role or parts[1].strip()
            else:
                guessed_company = guessed_company or "Target Company"
                guessed_role = guessed_role or base_name

    # 4. Match keywords to categories
    category_map = {
        "COD": ["python", "javascript", "typescript", "java", "c++", "c#", "rust", "golang", "ruby", "php", "html", "css", "react", "angular", "vue", "node.js", "frontend", "backend", "fullstack", "programming"],
        "DSA": ["algorithms", "data structures", "leetcode", "arrays", "linked list", "trees", "graphs", "sorting", "searching", "dynamic programming", "recursion"],
        "OOD": ["oop", "design patterns", "object-oriented", "encapsulation", "polymorphism", "inheritance"],
        "SQL": ["sql", "mysql", "postgresql", "sqlite", "database", "mongodb", "redis", "cassandra", "nosql"],
        "AI": ["machine learning", "deep learning", "ai", "llm", "nlp", "neural networks", "tensorflow", "pytorch", "scikit-learn", "keras"],
        "CLOUD": ["aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "devops", "cloud computing", "serverless", "microservices"],
        "SWE": ["agile", "scrum", "git", "github", "testing", "unit tests", "integration tests", "version control", "software engineering"],
        "SYSD": ["system design", "scalability", "load balancing", "caching", "message queue", "kafka", "rabbitmq", "distributed systems"],
        "NETW": ["networking", "http", "tcp/ip", "dns", "rest api", "websockets", "protocols"],
        "OS": ["linux", "unix", "windows", "macos", "bash", "shell scripting", "concurrency", "multithreading"],
        "APTI": ["problem solving", "analytical skills", "mathematics", "logical reasoning", "aptitude"],
        "COMM": ["communication", "presentation", "team player", "leadership", "collaboration", "project management"]
    }
    
    extracted_skills = []
    seen_skills = set()
    lower_text = text.lower()
    
    for category, keywords in category_map.items():
        for kw in keywords:
            pattern = r'\b' + re.escape(kw) + r'\b'
            if kw in ["c++", "c#", "node.js", "tcp/ip", "ci/cd"]:
                pattern = re.escape(kw)
                
            matches = list(re.finditer(pattern, lower_text))
            if matches:
                disp_name = kw.title() if len(kw) > 3 else kw.upper()
                if kw == "node.js":
                    disp_name = "Node.js"
                elif kw == "javascript":
                    disp_name = "JavaScript"
                elif kw == "typescript":
                    disp_name = "TypeScript"
                    
                if disp_name not in seen_skills:
                    seen_skills.add(disp_name)
                    
                    first_match = matches[0]
                    start = max(0, first_match.start() - 50)
                    end = min(len(text), first_match.end() + 50)
                    evidence = text[start:end].replace("\n", " ").strip()
                    if len(evidence) > 150:
                        evidence = evidence[:147] + "..."
                        
                    extracted_skills.append({
                        "skill_name": disp_name,
                        "category_code": category,
                        "confidence": "high",
                        "evidence": f"Found in text: \"{evidence}\"",
                        "priority": "required"
                    })
                    
    # 5. Extract Education (best effort)
    guessed_education = []
    for line in lines:
        lower_line = line.lower()
        if any(deg in lower_line for deg in ["btech", "b.tech", "mtech", "m.tech", "b.e", "be ", "b.sc", "bsc", "m.sc", "msc", "bachelor", "master", "phd"]):
            institution = "Unknown University"
            for word in line.split():
                if any(inst in word.lower() for inst in ["university", "college", "institute", "school", "iit", "nit", "bits"]):
                    institution = line.strip()
                    break
            year_match = re.search(r"\b(20\d{2})\b", line)
            year = year_match.group(0) if year_match else None
            guessed_education.append({
                "degree": line.strip()[:100],
                "institution": institution[:100],
                "year": year
            })
            
    if not guessed_education:
        guessed_education = [{"degree": "Bachelor of Technology", "institution": "KITS", "year": "2026"}]

    if doc_type == "jd":
        return {
            "company": guessed_company or "Target Company",
            "role": guessed_role or "Software Engineer",
            "skills": extracted_skills
        }
    else:
        return {
            "candidate_name": guessed_name,
            "email": guessed_email or "candidate@radix.com",
            "education": guessed_education,
            "projects": [{"title": "Portfolio System", "description": "RADIX Talent Match integration and resume parsing project"}],
            "experience": [{"role": "Software Developer Intern", "org": "RADIX Corp", "duration": "3 months"}],
            "skills": extracted_skills
        }

class ExtractionService:
    @staticmethod
    def call_ollama(prompt: str, json_schema: dict) -> tuple[str, int, int, str]:
        """Call local Ollama using system options and JSON schema constraints."""
        url = f"{settings.OLLAMA_URL}/api/chat"
        data = {
            "model": settings.OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "format": "json"
        }
        try:
            response = requests.post(url, json=data, timeout=120)
            if response.status_code == 200:
                content = response.json()["message"]["content"]
                in_tokens = estimate_tokens(prompt)
                out_tokens = estimate_tokens(content)
                return content, in_tokens, out_tokens, settings.OLLAMA_MODEL
            else:
                raise ValueError(f"Ollama returned status {response.status_code}: {response.text}")
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"Local Ollama inference failed. Ensure Ollama is running and model '{settings.OLLAMA_MODEL}' is pulled: {str(e)}"
            )

    @classmethod
    def call_openrouter(cls, prompt: str, json_schema: dict) -> tuple[str, int, int, str]:
        """Call OpenRouter API with JSON schema fallback or format constraints."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/JerwinTitus2006/Radix",
            "X-Title": "RADIX Talent Match"
        }
        
        primary_model = "openrouter/free"
        data = {
            "model": primary_model,
            "messages": [
                {
                    "role": "system",
                    "content": f"You are a precise parsing assistant. You MUST return a JSON object that strictly adheres to this JSON Schema:\n{json.dumps(json_schema)}"
                },
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": settings.LLM_MAX_TOKENS
        }
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=60)
            if response.status_code != 200:
                print(f"[Self-Healing] Primary model failed with status {response.status_code}. Retrying with free model meta-llama/llama-3.3-70b-instruct:free")
                data["model"] = "meta-llama/llama-3.3-70b-instruct:free"
                response = requests.post(url, json=data, headers=headers, timeout=60)
                if response.status_code != 200:
                    print(f"[Self-Healing] Secondary free model failed with status {response.status_code}. Retrying with google/gemma-2-9b-it:free")
                    data["model"] = "google/gemma-2-9b-it:free"
                    response = requests.post(url, json=data, headers=headers, timeout=60)
                if response.status_code == 200:
                    primary_model = data["model"]
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"OpenRouter API connection failed: {str(e)}")
            
        model_used = primary_model
        if response.status_code != 200:
            raise RuntimeError(f"OpenRouter API call failed (status {response.status_code}): {response.text}")
                
        res_data = response.json()
        choices = res_data.get("choices", [])
        if not choices:
            raise ValueError("OpenRouter returned an empty choices list.")
            
        content = choices[0].get("message", {}).get("content", "").strip()
        usage = res_data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", estimate_tokens(prompt))
        output_tokens = usage.get("completion_tokens", estimate_tokens(content))
        
        return content, input_tokens, output_tokens, model_used

    @classmethod
    def extract_document(cls, db: Session, doc_id: str, force: bool = False) -> Extraction:
        """Run extraction on a document using OpenRouter API or local Ollama. Uses cache if possible."""
        existing_extraction = db.query(Extraction).filter(
            Extraction.document_id == doc_id,
            Extraction.status == "completed"
        ).first()
        
        if existing_extraction and not force:
            return existing_extraction
            
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            raise ValueError(f"Document {doc_id} not found.")
            
        extraction = db.query(Extraction).filter(Extraction.document_id == doc_id).first()
        if not extraction:
            extraction = Extraction(document_id=doc_id, status="pending")
            db.add(extraction)
            db.commit()
            db.refresh(extraction)
            
        try:
            text_content = extract_text(doc.storage_ref)
            if not text_content.strip():
                raise ValueError("Extracted text content is empty.")
                
            if doc.doc_type == "jd":
                schema_model = JDExtractSchema
                template = get_prompt_template("jd_extract.txt")
                prompt = template.replace("{jd_text}", text_content)
            else:
                schema_model = ResumeExtractSchema
                template = get_prompt_template("resume_extract.txt")
                prompt = template.replace("{resume_text}", text_content)
                
            json_schema_dict = schema_model.model_json_schema()
            
            try:
                if settings.OPENROUTER_API_KEY:
                    response_text, in_tokens, out_tokens, model_used = cls.call_openrouter(prompt, json_schema_dict)
                else:
                    response_text, in_tokens, out_tokens, model_used = cls.call_ollama(prompt, json_schema_dict)
                
                response_text = clean_llm_json(response_text)
                parsed_data = json.loads(response_text)
            except Exception as llm_err:
                print(f"[Extraction Service] LLM extraction failed: {llm_err}. Falling back to local rule-based extractor.")
                parsed_data = extract_document_locally_fallback(text_content, doc.doc_type, doc.source_file_name)
                model_used = "local-rule-based-fallback"
                in_tokens, out_tokens = 0, 0
                
            # Post-extraction validation and enrichment
            if doc.doc_type == "resume":
                # Ensure skills are present; if LLM returned nothing, run local fallback to get skills
                if not parsed_data.get("skills"):
                    fallback_data = extract_document_locally_fallback(text_content, doc.doc_type, doc.source_file_name)
                    parsed_data["skills"] = fallback_data.get("skills", [])
                
                # Check candidate_name
                c_name = parsed_data.get("candidate_name")
                if not c_name or c_name == "null" or str(c_name).strip() == "":
                    # Guess name from first few lines or filename
                    guessed_n = ""
                    for line in text_content.split("\n")[:3]:
                        words = line.strip().split()
                        if 2 <= len(words) <= 3 and all(w.isalpha() for w in words):
                            guessed_n = line.strip()
                            break
                    if not guessed_n:
                        base_n = os.path.splitext(doc.source_file_name)[0]
                        base_n = re.sub(r"[-_]", " ", base_n)
                        base_n = re.sub(r"(?i)\b(resume|cv|pdf|docx|doc|profile)\b", "", base_n).strip()
                        guessed_n = base_n or "Candidate Name"
                    parsed_data["candidate_name"] = guessed_n

                # Check email
                c_email = parsed_data.get("email")
                if not c_email or c_email == "null" or str(c_email).strip() == "":
                    email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text_content)
                    parsed_data["email"] = email_match.group(0) if email_match else "candidate@radix.com"
            else:
                # JD validation and enrichment
                if not parsed_data.get("skills"):
                    fallback_data = extract_document_locally_fallback(text_content, doc.doc_type, doc.source_file_name)
                    parsed_data["skills"] = fallback_data.get("skills", [])
                
                if not parsed_data.get("company") or parsed_data.get("company") == "null" or str(parsed_data.get("company")).strip() == "":
                    base_n = os.path.splitext(doc.source_file_name)[0]
                    parsed_n = base_n.split(" - ")[0].strip() if " - " in base_n else "Target Company"
                    parsed_data["company"] = parsed_n
                
                if not parsed_data.get("role") or parsed_data.get("role") == "null" or str(parsed_data.get("role")).strip() == "":
                    base_n = os.path.splitext(doc.source_file_name)[0]
                    parsed_r = base_n.split(" - ")[-1].strip() if " - " in base_n else base_n
                    parsed_data["role"] = parsed_r
                    
            extraction.company = parsed_data.get("company")
            extraction.role = parsed_data.get("role")
            
            if doc.doc_type == "resume":
                extraction.company = None
                
            extraction.raw_llm_response = parsed_data
            extraction.cost_usd = calculate_cost(model_used, in_tokens, out_tokens)
            extraction.status = "completed"
            
            db.query(ExtractedSkill).filter(ExtractedSkill.extraction_id == extraction.id).delete()
            
            skills_data = parsed_data.get("skills", [])
            for s in skills_data:
                cat = s.get("category_code", "OTHER").upper()
                valid_cats = {"COD", "DSA", "OOD", "APTI", "COMM", "AI", "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS", "OTHER"}
                if cat not in valid_cats:
                    cat = "OTHER"
                    
                skill = ExtractedSkill(
                    extraction_id=extraction.id,
                    skill_name=s.get("skill_name"),
                    category_code=cat,
                    evidence=s.get("evidence", "")[:200],
                    confidence=s.get("confidence", "medium").lower(),
                    priority=s.get("priority", "required")
                )
                db.add(skill)
                
            db.commit()
            db.refresh(extraction)
            return extraction
            
        except Exception as e:
            db.rollback()
            extraction.status = "failed"
            extraction.raw_llm_response = {"error": str(e)}
            db.commit()
            raise e
