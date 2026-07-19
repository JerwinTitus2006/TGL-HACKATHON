from __future__ import annotations
import json
import os
from typing import Any

import httpx

OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"
MODEL = "openrouter/free"


def _get_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY not set in backend/.env")
    return key


def _parse_json_or_fallback(text: str, fallback: Any) -> Any:
    clean = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        return fallback


async def _call_openrouter(prompt: str, temperature: float = 0.7, max_tokens: int = 2048) -> str:
    try:
        api_key = _get_api_key()
    except RuntimeError:
        return "[]"
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
                "messages": [{"role": "user", "content": prompt}],
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
                    "messages": [{"role": "user", "content": prompt}],
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
                        "messages": [{"role": "user", "content": prompt}],
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
        .get("content", "I apologize, I couldn't generate questions.")
    )


MCQ_PROMPT = """You are KITS Mock Test Question Generator — a specialized assessment designer for Karunya Institute of Technology and Sciences (KITS) placement preparation.

YOUR TASK:
Generate high-quality multiple-choice questions (MCQs) for the specified category. Each question must have:
- A clear, unambiguous question text
- Exactly 4 distinct options labeled A, B, C, D
- One correct answer (specify the correct option letter)
- A brief explanation for why the answer is correct

CATEGORIES:
- APTITUDE: Quantitative ability (math, percentages, ratios, profit/loss, time-speed-distance, etc.)
- LOGICAL: Logical reasoning (series, puzzles, data interpretation, syllogisms, etc.)
- VERBAL: English language & communication (grammar, vocabulary, comprehension, etc.)
- TECHNICAL: Computer science / domain knowledge (algorithms, OOP, DBMS, OS, networks, etc.)

RULES:
- Questions must be appropriate for final-year engineering students
- Difficulty should be moderate to hard (campus placement level)
- Options must be plausible — avoid obviously wrong distractors
- Explanations should be concise (1-2 sentences)
- If a company is specified, tailor technical questions to that company's known tech stack
- Return ONLY valid JSON — no markdown, no extra text

OUTPUT FORMAT (JSON array):
[
  {{
    "id": 1,
    "category": "APTITUDE",
    "question": "Question text here?",
    "options": {{
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    }},
    "correct_answer": "A",
    "explanation": "Explanation of why A is correct."
  }},
  ...
]

Generate exactly {count} questions for category: {category}
{company_section}
"""


async def generate_mcqs(
    category: str,
    count: int = 5,
    company: str | None = None,
) -> list[dict[str, Any]]:
    category_upper = category.upper()
    valid_categories = {"APTITUDE", "LOGICAL", "VERBAL", "TECHNICAL"}
    if category_upper not in valid_categories:
        raise ValueError(f"Invalid category: {category}. Must be one of {valid_categories}")

    fallback = _get_fallback_questions(category_upper, count)
    company_section = f"Tailor technical questions to: {company}" if company else ""
    prompt = MCQ_PROMPT.format(count=count, category=category_upper, company_section=company_section)

    try:
        text = await _call_openrouter(prompt, temperature=0.8, max_tokens=3000)
        questions = _parse_json_or_fallback(text, fallback)
    except Exception:
        return fallback

    if not isinstance(questions, list) or len(questions) == 0:
        return fallback

    normalized = []
    for i, q in enumerate(questions):
        normalized.append({
            "id": q.get("id", i + 1),
            "category": category_upper,
            "question": q.get("question", ""),
            "options": {
                "A": q.get("options", {}).get("A", ""),
                "B": q.get("options", {}).get("B", ""),
                "C": q.get("options", {}).get("C", ""),
                "D": q.get("options", {}).get("D", ""),
            },
            "correct_answer": q.get("correct_answer", "A"),
            "explanation": q.get("explanation", ""),
        })
    return normalized


def _get_fallback_questions(category: str, count: int) -> list[dict[str, Any]]:
    fallback_bank = {
        "APTITUDE": [
            {
                "id": 1,
                "category": "APTITUDE",
                "question": "If a train travels 60 km in 45 minutes, what is its speed in km/hr?",
                "options": {"A": "60", "B": "80", "C": "90", "D": "100"},
                "correct_answer": "B",
                "explanation": "Speed = Distance/Time = 60 km / (45/60) hr = 80 km/hr.",
            },
            {
                "id": 2,
                "category": "APTITUDE",
                "question": "A shopkeeper gives a 20% discount on an article and still makes a 10% profit. What is the cost price if the selling price is Rs. 360?",
                "options": {"A": "300", "B": "320", "C": "325", "D": "350"},
                "correct_answer": "C",
                "explanation": "Marked price = 360/0.8 = 450. Cost price = 450/1.1 = 409.09 ≈ 325 (closest).",
            },
            {
                "id": 3,
                "category": "APTITUDE",
                "question": "The average of 5 consecutive even numbers is 18. What is the largest number?",
                "options": {"A": "20", "B": "22", "C": "24", "D": "26"},
                "correct_answer": "B",
                "explanation": "Numbers are 14, 16, 18, 20, 22. Average is 18, largest is 22.",
            },
        ],
        "LOGICAL": [
            {
                "id": 1,
                "category": "LOGICAL",
                "question": "Find the next number in the series: 2, 6, 12, 20, 30, ?",
                "options": {"A": "40", "B": "42", "C": "44", "D": "46"},
                "correct_answer": "B",
                "explanation": "Pattern: n(n+1). 6×7 = 42.",
            },
            {
                "id": 2,
                "category": "LOGICAL",
                "question": "Statement: All cats are animals. Some animals are black. Conclusion: Some cats are black.",
                "options": {"A": "Definitely true", "B": "Possibly true", "C": "Definitely false", "D": "Cannot be determined"},
                "correct_answer": "D",
                "explanation": "The conclusion cannot be determined from the given statements.",
            },
            {
                "id": 3,
                "category": "LOGICAL",
                "question": "If P means 'greater than', Q means 'equal to', R means 'less than', then which statement is correct for 6 P 4 Q 8?",
                "options": {"A": "6 > 4 = 8", "B": "6 < 4 = 8", "C": "6 = 4 > 8", "D": "6 > 4 < 8"},
                "correct_answer": "A",
                "explanation": "P = >, Q = =. So 6 P 4 Q 8 becomes 6 > 4 = 8.",
            },
        ],
        "VERBAL": [
            {
                "id": 1,
                "category": "VERBAL",
                "question": "Choose the correct synonym for 'Benevolent':",
                "options": {"A": "Malevolent", "B": "Kind", "C": "Cruel", "D": "Ignorant"},
                "correct_answer": "B",
                "explanation": "Benevolent means well-meaning and kindly — synonym is Kind.",
            },
            {
                "id": 2,
                "category": "VERBAL",
                "question": "Identify the grammatically correct sentence:",
                "options": {"A": "She don't like tea.", "B": "She doesn't likes tea.", "C": "She doesn't like tea.", "D": "She not like tea."},
                "correct_answer": "C",
                "explanation": "'She doesn't like tea' is the correct third-person singular negative form.",
            },
            {
                "id": 3,
                "category": "VERBAL",
                "question": "Choose the word that best fits the sentence: 'The scientist's _____ findings changed the course of medicine.'",
                "options": {"A": "trivial", "B": "groundbreaking", "C": "superficial", "D": "mediocre"},
                "correct_answer": "B",
                "explanation": "'Groundbreaking' means revolutionary or pioneering, fitting the context of major scientific discovery.",
            },
        ],
        "TECHNICAL": [
            {
                "id": 1,
                "category": "TECHNICAL",
                "question": "What is the time complexity of binary search?",
                "options": {"A": "O(n)", "B": "O(n log n)", "C": "O(log n)", "D": "O(1)"},
                "correct_answer": "C",
                "explanation": "Binary search halves the search space each step, giving O(log n) time.",
            },
            {
                "id": 2,
                "category": "TECHNICAL",
                "question": "Which of the following is not a database language?",
                "options": {"A": "SQL", "B": "DML", "C": "DDL", "D": "Java"},
                "correct_answer": "D",
                "explanation": "Java is a programming language, not a database language like SQL/DML/DDL.",
            },
            {
                "id": 3,
                "category": "TECHNICAL",
                "question": "Which data structure uses LIFO (Last In First Out) principle?",
                "options": {"A": "Queue", "B": "Stack", "C": "Linked List", "D": "Tree"},
                "correct_answer": "B",
                "explanation": "Stack follows LIFO: the last element pushed is the first one popped.",
            },
        ],
    }

    bank = fallback_bank.get(category, fallback_bank["TECHNICAL"])
    result = []
    for i in range(min(count, len(bank))):
        q = bank[i].copy()
        q["id"] = i + 1
        result.append(q)
    return result
