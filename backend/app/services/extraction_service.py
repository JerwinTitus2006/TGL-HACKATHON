import os
import json
import re
import time
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

class ExtractionService:
    @staticmethod
    def call_ollama(prompt: str, json_schema: dict) -> tuple[str, int, int, str]:
        """Call local Ollama API with schema-constrained format and return response."""
        data = {
            "model": settings.OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": settings.LLM_MAX_TOKENS
            },
            "format": json_schema
        }
        
        url = f"{settings.OLLAMA_URL}/api/chat"
        try:
            response = requests.post(
                url,
                json=data,
                timeout=300  # Local inference on CPU can be slow, set high timeout
            )
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=503,
                detail=f"Ollama server connection failed at {settings.OLLAMA_URL}. Ensure Ollama is running: {str(e)}"
            )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Ollama API call failed: {response.text}"
            )
            
        res_data = response.json()
        message = res_data.get("message", {})
        content = message.get("content", "").strip()
        
        if not content:
            raise HTTPException(
                status_code=500,
                detail="Ollama returned an empty response content."
            )
        
        # Read exact token metrics returned by Ollama
        input_tokens = res_data.get("prompt_eval_count", estimate_tokens(prompt))
        output_tokens = res_data.get("eval_count", estimate_tokens(content))
        
        return content, input_tokens, output_tokens, settings.OLLAMA_MODEL

    @staticmethod
    def call_openrouter(prompt: str, json_schema: dict) -> tuple[str, int, int, str]:
        """Call OpenRouter API with JSON schema fallback or format constraints."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/JerwinTitus2006/Radix",
            "X-Title": "RADIX Talent Match"
        }
        
        primary_model = "google/gemini-2.5-flash"
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
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=503,
                detail=f"OpenRouter API connection failed: {str(e)}"
            )
            
        model_used = primary_model
        if response.status_code != 200:
            # Fallback to Gemini 2.5 Pro if Flash fails
            fallback_model = "google/gemini-2.5-pro"
            try:
                data["model"] = fallback_model
                response = requests.post(url, json=data, headers=headers, timeout=60)
                if response.status_code == 200:
                    model_used = fallback_model
            except Exception:
                pass
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"OpenRouter API call failed: {response.text}"
                )
                
        res_data = response.json()
        choices = res_data.get("choices", [])
        if not choices:
            raise HTTPException(
                status_code=500,
                detail="OpenRouter returned an empty choices list."
            )
            
        content = choices[0].get("message", {}).get("content", "").strip()
        usage = res_data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", estimate_tokens(prompt))
        output_tokens = usage.get("completion_tokens", estimate_tokens(content))
        
        return content, input_tokens, output_tokens, model_used

    @classmethod
    def extract_document(cls, db: Session, doc_id: str, force: bool = False) -> Extraction:
        """Run extraction on a document using OpenRouter API or local Ollama. Uses cache if possible."""
        # Check if completed extraction already exists
        existing_extraction = db.query(Extraction).filter(
            Extraction.document_id == doc_id,
            Extraction.status == "completed"
        ).first()
        
        if existing_extraction and not force:
            return existing_extraction
            
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            raise ValueError(f"Document {doc_id} not found.")
            
        # Create or update extraction record to pending
        extraction = db.query(Extraction).filter(Extraction.document_id == doc_id).first()
        if not extraction:
            extraction = Extraction(document_id=doc_id, status="pending")
            db.add(extraction)
            db.commit()
            db.refresh(extraction)
            
        try:
            # 1. Parse text from document file
            text_content = extract_text(doc.storage_ref)
            if not text_content.strip():
                raise ValueError("Extracted text content is empty.")
                
            # 2. Determine model schema and get prompt template
            if doc.doc_type == "jd":
                schema_model = JDExtractSchema
                template = get_prompt_template("jd_extract.txt")
                prompt = template.replace("{jd_text}", text_content)
            else:
                schema_model = ResumeExtractSchema
                template = get_prompt_template("resume_extract.txt")
                prompt = template.replace("{resume_text}", text_content)
                
            # 3. Call LLM with JSON schema
            json_schema_dict = schema_model.model_json_schema()
            if settings.OPENROUTER_API_KEY:
                response_text, in_tokens, out_tokens, model_used = cls.call_openrouter(prompt, json_schema_dict)
            else:
                response_text, in_tokens, out_tokens, model_used = cls.call_ollama(prompt, json_schema_dict)
            
            # 4. Parse JSON content
            response_text = clean_llm_json(response_text)
            parsed_data = json.loads(response_text)
            
            # 5. Populate and update extraction record
            extraction.company = parsed_data.get("company")
            extraction.role = parsed_data.get("role")
            
            # For resumes
            if doc.doc_type == "resume":
                extraction.company = None
                extraction.raw_llm_response = parsed_data
            else:
                extraction.raw_llm_response = parsed_data
                
            extraction.cost_usd = calculate_cost(model_used, in_tokens, out_tokens)
            extraction.status = "completed"
            
            # Clear any previously extracted skills
            db.query(ExtractedSkill).filter(ExtractedSkill.extraction_id == extraction.id).delete()
            
            # 6. Save extracted skills
            skills_data = parsed_data.get("skills", [])
            for s in skills_data:
                # Validate category code
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
                    priority=s.get("priority")
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
