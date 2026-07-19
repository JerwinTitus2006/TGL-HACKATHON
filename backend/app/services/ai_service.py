from __future__ import annotations
import os
import json
from typing import Any

import httpx

OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"
MODEL = "google/gemini-2.5-flash:free"


def get_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise ValueError("OPENROUTER_API_KEY not set in backend/.env")
    return key


CHAT_AGENT_PROMPT = """You are KITS Placement Intelligence Agent — a dedicated career mentor for students at Karunya Institute of Technology and Sciences (KITS).

YOUR EXPERTISE:
- Campus placement preparation strategies
- Company-specific recruitment processes (tech giants, product-based, service-based)
- Technical interview preparation (DSA, system design, domain knowledge)
- Soft skills, group discussions, and HR interview techniques
- Resume building tailored to campus placements
- Industry trends, hiring patterns, and skill demand forecasting

YOUR PERSONALITY:
- Encouraging but brutally honest when needed
- Practical and action-oriented — students need steps, not theory
- Use bullet points and clear formatting for readability
- Cite specific company examples from KITS placement history when relevant

RESPONSE RULES:
- Keep responses under 300 words unless deep analysis is requested
- Start with a brief empathetic acknowledgment of the student's query
- End with a clear next-step action the student can take immediately
- If the query is vague, ask clarifying questions before answering"""


RESUME_AGENT_PROMPT = """You are KITS Resume Analysis Agent — a specialized placement resume reviewer for Karunya Institute of Technology and Sciences (KITS).

YOUR MISSION:
Analyze student resumes for campus placement applications and provide structured, actionable feedback that maximizes their chances of shortlisting.

YOUR METHODOLOGY:
1. SCORE (0-100): Evaluate overall resume strength based on:
   - Technical skills relevance (30%)
   - Project experience quality & depth (25%)
   - Academic performance presentation (15%)
   - Extracurriculars & leadership (10%)
   - Formatting, clarity & impact (10%)
   - Certification & achievements (10%)

2. STRENGTHS (exactly 3): What the student is doing right — specific, not generic.

3. WEAKNESSES (exactly 3): Gaps that could hurt their chances — be direct but constructive.

4. MISSING SKILLS (3-5): Skills the student should add based on their target company/role. If no target company is specified, suggest the most in-demand skills across the industry.

5. RECOMMENDATIONS (3-5): Concrete, sequential action items the student can execute within 1-4 weeks.

OUTPUT RULES:
- Return ONLY valid JSON — no markdown, no explanations outside the JSON
- Be specific and detailed in every field — vague feedback is worthless
- If a target company is provided, tailor ALL feedback to that company's known requirements
- Score must be realistic — do not inflate. A weak resume should score 40-55, average 55-70, good 70-85, excellent 85+"""


INTERVIEW_AGENT_PROMPT = """You are KITS Interview Coach Agent — a specialized interview preparation expert for Karunya Institute of Technology and Sciences (KITS) campus placements.

YOUR EXPERTISE:
- You have deep knowledge of interview patterns at 200+ companies that recruit from KITS
- You understand the difference between service-based (TCS, Infosys, Wipro, Accenture) and product-based (Google, Microsoft, Amazon, Uber) interview formats
- You know the latest hiring trends, including virtual interviews, hackathons, and group discussions

QUESTION GENERATION METHODOLOGY:

1. TECHNICAL QUESTIONS (exactly 5):
   - 2 DSA/problemsolving questions at appropriate difficulty for campus level
   - 1-2 domain-specific questions based on the company's tech stack
   - 1-2 conceptual/fundamental questions that test depth of understanding
   - Questions must be realistic — they should match what the company actually asks

2. BEHAVIORAL QUESTIONS (exactly 3):
   - Based on real campus interview experiences
   - Cover teamwork, conflict resolution, adaptability, and leadership
   - Include competency-based questions using the STAR framework implicitly

3. PREPARATION TIPS (exactly 3):
   - Specific and actionable — not generic advice like "practice more"
   - Include company-specific insights (e.g., "Amazon focuses on leadership principles")
   - Mention relevant resources (specific LeetCode problem patterns, specific topics)

OUTPUT RULES:
- Return ONLY valid JSON — no markdown, no extra text
- Every question must end with "?" and be self-contained
- Questions must be answerable by a final-year engineering student
- Do not repeat the same question pattern across different calls"""


READINESS_AGENT_PROMPT = """You are KITS Readiness Scoring Agent — a placement preparedness evaluator for Karunya Institute of Technology and Sciences (KITS).

YOUR MISSION:
Evaluate a student's current skill set against campus placement requirements and produce a multi-dimensional readiness score with targeted improvement suggestions.

SCORING RUBRIC:

1. OVERALL (0-100) — Weighted composite of all dimensions below

2. TECHNICAL (0-100) — Evaluates:
   - Programming proficiency (based on languages the student knows)
   - Data Structures & Algorithms understanding
   - Domain/tech stack knowledge
   - Project implementation depth
   Deduct points if skills are too narrow or lack depth

3. BEHAVIORAL (0-100) — Evaluates:
   - Communication skills (inferred from skill set — try to suggest based on patterns)
   - Teamwork and collaboration indicators
   - Leadership and initiative signals
   Default to moderate score (50-65) if no clear indicators

4. PROBLEM SOLVING (0-100) — Evaluates:
   - Analytical thinking potential
   - Breadth of technical exposure
   - Project complexity indicators
   Cross-reference known DSA/coding skills

5. COMMUNICATION (0-100) — Evaluates:
   - English proficiency indicators
   - Presence of soft-skill related activities
   - Extracurricular involvement

SCORING RULES:
- Be honest — do not inflate scores. A student with 2-3 basic skills should score 30-45 overall
- Each dimension must be independently justified
- If insufficient data exists for a dimension, score conservatively (40-55)
- Scores should follow a roughly normal distribution centered at 60

SUGGESTIONS RULES:
- Provide exactly 3 suggestions
- Each suggestion must be specific, actionable, and time-bound
- Tailor suggestions to the student's current skill level
- Include the most impactful improvement areas first
- If a target company is provided, align suggestions with that company's requirements

OUTPUT RULES:
- Return ONLY valid JSON — no markdown, no extra text
- All scores must be integers between 0 and 100
- Suggestions must be concrete — include specific technologies, platforms, or topics"""


async def _call_openrouter(
    messages: list[dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    try:
        api_key = get_api_key()
    except ValueError:
        return "I apologize, I couldn't generate a response because the OpenRouter API key is not configured."
    import re
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{OPENROUTER_API_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        if not resp.is_success:
            print(f"[Self-Healing] Primary model failed with status {resp.status_code}. Retrying with free model meta-llama/llama-3.3-70b-instruct:free")
            resp = await client.post(
                f"{OPENROUTER_API_BASE}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": "meta-llama/llama-3.3-70b-instruct:free",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            if not resp.is_success:
                print(f"[Self-Healing] Secondary free model failed with status {resp.status_code}. Retrying with google/gemma-2-9b-it:free")
                resp = await client.post(
                    f"{OPENROUTER_API_BASE}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}",
                    },
                    json={
                        "model": "google/gemma-2-9b-it:free",
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                )
    if not resp.is_success:
        raise RuntimeError(f"OpenRouter API error ({resp.status_code}): {resp.text}")
    data = resp.json()
    return (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "I apologize, I couldn't generate a response.")
    )


def _parse_json_or_fallback(text: str, fallback: dict[str, Any]) -> dict[str, Any]:
    clean = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        return fallback


async def chat_completion(
    messages: list[dict[str, str]],
) -> str:
    chat_messages = [{"role": "system", "content": CHAT_AGENT_PROMPT}] + messages
    return await _call_openrouter(chat_messages)


async def analyze_resume(
    resume_text: str,
    target_company: str | None = None,
) -> dict[str, Any]:
    fallback = {
        "score": 72,
        "strengths": ["Good academic record", "Technical fundamentals"],
        "weaknesses": ["Need more real-world projects", "Improve communication of experience"],
        "missingSkills": ["Data Structures practice", "System Design basics"],
        "recommendations": ["Practice coding problems daily", "Build 2-3 full-stack projects"],
    }

    prompt = f"""Analyze the following resume for a campus placement candidate{f" targeting {target_company}" if target_company else ""}.

RESUME TEXT:
{resume_text[:3000]}

Now, analyze this resume using the methodology defined in your system prompt. Return ONLY valid JSON with these exact keys:
{{
  "score": <integer 0-100>,
  "strengths": ["<exact strength 1>", "<exact strength 2>", "<exact strength 3>"],
  "weaknesses": ["<exact weakness 1>", "<exact weakness 2>", "<exact weakness 3>"],
  "missingSkills": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>", "<recommendation 4>", "<recommendation 5>"]
}}

Be specific, honest, and constructive. Do NOT include any text outside the JSON object."""

    messages = [
        {"role": "system", "content": RESUME_AGENT_PROMPT},
        {"role": "user", "content": prompt},
    ]
    try:
        text = await _call_openrouter(messages, temperature=0.3, max_tokens=1200)
        return _parse_json_or_fallback(text, fallback)
    except Exception:
        return fallback


async def generate_interview_questions(
    company: str,
    role: str | None = None,
) -> dict[str, list[str]]:
    fallback = {
        "technical": [
            f"Explain OOP concepts with examples relevant to {company}",
            "Write a function to reverse a linked list",
            "What are the key differences between SQL and NoSQL databases?",
        ],
        "behavioral": [
            "Tell me about a time you worked in a team to solve a difficult problem.",
            "Describe a situation where you had to learn a new technology quickly.",
            "Why do you want to work at this company?",
        ],
        "preparation": [
            f"Research {company}'s products and recent news",
            "Practice coding problems on LeetCode (Medium level)",
            "Prepare 3 questions to ask the interviewer",
        ],
    }

    prompt = f"""Generate interview questions for a KITS campus placement candidate{f" applying for {role}" if role else ""} at {company}.

Company: {company}
{"Target Role: " + role if role else "Role: Not specified (general placement)"}

Using the methodology defined in your system prompt, return ONLY valid JSON with these exact keys:
{{
  "technical": ["<question 1>", "<question 2>", "<question 3>", "<question 4>", "<question 5>"],
  "behavioral": ["<question 1>", "<question 2>", "<question 3>"],
  "preparation": ["<tip 1>", "<tip 2>", "<tip 3>"]
}}

Make each question specific to {company}'s known interview patterns. Do NOT include any text outside the JSON object."""

    messages = [
        {"role": "system", "content": INTERVIEW_AGENT_PROMPT},
        {"role": "user", "content": prompt},
    ]
    try:
        text = await _call_openrouter(messages, temperature=0.5, max_tokens=1200)
        return _parse_json_or_fallback(text, fallback)
    except Exception:
        return fallback


async def calculate_readiness(
    skills: list[str],
    target_company: str | None = None,
) -> dict[str, Any]:
    fallback = {
        "overall": 65,
        "technical": min(100, len(skills) * 15 + 30),
        "behavioral": 58,
        "problemSolving": 62,
        "communication": 60,
        "suggestions": [
            "Practice coding problems daily to improve problem-solving speed.",
            "Work on communication skills through mock interviews.",
            "Build projects to demonstrate practical knowledge.",
        ],
    }

    prompt = f"""Assess the placement readiness of a KITS student with the following profile.

Student's Skills: {', '.join(skills)}
{"Target Company: " + target_company if target_company else "No specific target company"}

Using the scoring rubric defined in your system prompt, return ONLY valid JSON with these exact keys:
{{
  "overall": <integer 0-100>,
  "technical": <integer 0-100>,
  "behavioral": <integer 0-100>,
  "problemSolving": <integer 0-100>,
  "communication": <integer 0-100>,
  "suggestions": ["<specific suggestion 1>", "<specific suggestion 2>", "<specific suggestion 3>"]
}}

Be honest — do not inflate scores based on limited information. Do NOT include any text outside the JSON object."""

    messages = [
        {"role": "system", "content": READINESS_AGENT_PROMPT},
        {"role": "user", "content": prompt},
    ]
    try:
        text = await _call_openrouter(messages, temperature=0.3, max_tokens=800)
        return _parse_json_or_fallback(text, fallback)
    except Exception:
        return fallback


COMPANY_INTEL_PROMPT = """You are KITS Corporate Intelligence Agent.
Analyze the company overview, vision, and mission. Extract key intelligence metrics.
Return ONLY valid JSON with these exact keys:
{
  "weaknesses": ["list of 3 key challenges or areas of improvement faced by this company"],
  "work_culture": ["list of 3 key attributes describing their engineering/work culture"],
  "tools_technologies": ["list of 5 key technologies/tools they actively use"],
  "adopting_tech": ["list of 3 technologies/frameworks they are currently adopting or moving towards"],
  "awards": ["list of 2 awards, certifications, or milestones they have achieved"],
  "uniqueness": ["list of 2 unique selling points or proprietary technologies they have"]
}
Do NOT include any text outside the JSON object."""


async def get_company_intel(
    company_name: str,
    overview: str,
    vision: str,
    mission: str
) -> dict[str, Any]:
    # Local cache to prevent redundant API calls
    cache_file = "c:/Users/Jerwin titus/Desktop/Radix/backend/app/services/company_intel_cache.json"
    cache = {}
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            pass
            
    if company_name in cache:
        return cache[company_name]
        
    fallback = {
        "weaknesses": [
            "Fierce competition in core market sectors",
            "Complex legacy systems to maintain",
            "High dependency on enterprise service contracts"
        ],
        "work_culture": [
            "High collaboration and teamwork",
            "Emphasis on continuous learning & certifications",
            "Structured performance-driven environment"
        ],
        "tools_technologies": [
            "Python", "SQL", "Cloud Platforms (AWS/Azure)", "Docker", "Git/GitHub"
        ],
        "adopting_tech": [
            "Generative AI / LLM integration",
            "Microservices architecture",
            "Serverless computing"
        ],
        "awards": [
            "Great Place to Work certified",
            "Top Industry Innovation Award winner"
        ],
        "uniqueness": [
            "Global footprint with localized delivery",
            "Proprietary AI and data analytics platform"
        ]
    }
    
    # If we don't have enough metadata, return fallback immediately
    if not overview:
        return fallback
        
    prompt = f"""Company: {company_name}
Overview: {overview[:1500]}
Vision: {vision[:500]}
Mission: {mission[:500]}

Now, extract the corporate intelligence. Return ONLY valid JSON."""

    messages = [
        {"role": "system", "content": COMPANY_INTEL_PROMPT},
        {"role": "user", "content": prompt}
    ]
    try:
        text = await _call_openrouter(messages, temperature=0.3, max_tokens=1000)
        result = _parse_json_or_fallback(text, fallback)
        # Update cache
        cache[company_name] = result
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
        return result
    except Exception:
        return fallback

