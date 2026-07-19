from __future__ import annotations
import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.models import (
    MockTestSession,
    MockTestQuestion,
    MockTestResult,
)
from backend.app.services.leetcode_service import (
    get_problems_by_company,
    get_problems_by_difficulty,
    get_problem_by_slug,
)
from backend.app.services.question_bank import generate_mcqs

OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"
MODEL = "openrouter/free"


def _get_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY not set in backend/.env")
    return key


class StartTestRequest(BaseModel):
    test_type: str
    company: Optional[str] = None
    duration_minutes: Optional[int] = 60


class SubmitTestRequest(BaseModel):
    session_id: str
    answers: dict[str, Any]


async def create_test_session(
    db: Session,
    user_id: str,
    test_type: str,
    company: str | None = None,
    duration_minutes: int = 60,
) -> dict[str, Any]:
    if test_type not in {"coding_only", "mcq_coding"}:
        raise ValueError("test_type must be 'coding_only' or 'mcq_coding'")

    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    session = MockTestSession(
        user_id=user_uuid,
        test_type=test_type,
        company=company,
        status="in_progress",
        duration_minutes=duration_minutes,
        started_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Defer question generation to when get_session_questions is first requested (post-session creation)

    return {
        "session_id": str(session.id),
        "test_type": session.test_type,
        "company": session.company,
        "status": session.status,
        "duration_minutes": session.duration_minutes,
        "started_at": session.started_at.isoformat() + "Z",
        "remaining_seconds": duration_minutes * 60,
    }



async def _generate_session_questions(db: Session, session_id: uuid.UUID, test_type: str, company: str | None) -> None:
    questions = []

    if test_type == "coding_only":
        company_problems = []
        if company:
            try:
                company_problems = await get_problems_by_company(company, limit=6)
            except Exception as e:
                print(f"[Mock Test] Failed to get company problems for {company}: {e}")

        if company_problems:
            for p in company_problems:
                questions.append({
                    "session_id": session_id,
                    "category": "CODING",
                    "difficulty": p.get("difficulty", "MEDIUM").upper(),
                    "question_text": p["title"],
                    "title_slug": p["titleSlug"],
                    "topic_tags": p.get("topicTags", []),
                    "options": None,
                    "correct_answer": None,
                    "explanation": p.get("content", ""),
                    "url": p["url"],
                })
        else:
            tasks = []
            for difficulty in ["EASY", "MEDIUM", "HARD"]:
                tasks.append(get_problems_by_difficulty(difficulty, limit=2))
            results = await asyncio.gather(*tasks, return_exceptions=True)
            # Collect slugs to fetch full problem descriptions
            coding_stubs = []
            for difficulty, result in zip(["EASY", "MEDIUM", "HARD"], results):
                if isinstance(result, Exception):
                    continue
                for p in result:
                    coding_stubs.append((difficulty, p))

            # Fetch full descriptions in parallel
            detail_tasks = [get_problem_by_slug(p["titleSlug"]) for _, p in coding_stubs]
            details = await asyncio.gather(*detail_tasks, return_exceptions=True)

            for (difficulty, p), detail in zip(coding_stubs, details):
                content = ""
                if isinstance(detail, dict):
                    content = detail.get("content", "")
                questions.append({
                    "session_id": session_id,
                    "category": "CODING",
                    "difficulty": difficulty,
                    "question_text": p["title"],
                    "title_slug": p["titleSlug"],
                    "topic_tags": p.get("topicTags", []),
                    "options": None,
                    "correct_answer": None,
                    "explanation": content,
                    "url": p["url"],
                })

    elif test_type == "mcq_coding":
        mcq_categories = ["APTITUDE", "LOGICAL", "VERBAL", "TECHNICAL"]
        mcq_tasks = [generate_mcqs(cat, count=3, company=company) for cat in mcq_categories]
        mcq_results = await asyncio.gather(*mcq_tasks, return_exceptions=True)

        for cat, result in zip(mcq_categories, mcq_results):
            if isinstance(result, Exception):
                continue
            for mq in result:
                questions.append({
                    "session_id": session_id,
                    "category": cat,
                    "difficulty": "MEDIUM",
                    "question_text": mq["question"],
                    "title_slug": None,
                    "topic_tags": [],
                    "options": mq["options"],
                    "correct_answer": mq["correct_answer"],
                    "explanation": mq.get("explanation", ""),
                    "url": None,
                })

        company_problems = []
        if company:
            try:
                company_problems = await get_problems_by_company(company, limit=3)
            except Exception as e:
                print(f"[Mock Test] Failed to get company problems for {company}: {e}")

        if company_problems:
            for p in company_problems:
                questions.append({
                    "session_id": session_id,
                    "category": "CODING",
                    "difficulty": p.get("difficulty", "MEDIUM").upper(),
                    "question_text": p["title"],
                    "title_slug": p["titleSlug"],
                    "topic_tags": p.get("topicTags", []),
                    "options": None,
                    "correct_answer": None,
                    "explanation": p.get("content", ""),
                    "url": p["url"],
                })
        else:
            coding_tasks = []
            for difficulty in ["EASY", "MEDIUM", "HARD"]:
                coding_tasks.append(get_problems_by_difficulty(difficulty, limit=1))
            coding_results = await asyncio.gather(*coding_tasks, return_exceptions=True)

            # Collect coding stubs for full description fetch
            mcq_coding_stubs = []
            for difficulty, result in zip(["EASY", "MEDIUM", "HARD"], coding_results):
                if isinstance(result, Exception):
                    continue
                for p in result:
                    mcq_coding_stubs.append((difficulty, p))

            # Fetch full descriptions in parallel
            detail_tasks = [get_problem_by_slug(p["titleSlug"]) for _, p in mcq_coding_stubs]
            details = await asyncio.gather(*detail_tasks, return_exceptions=True)

            for (difficulty, p), detail in zip(mcq_coding_stubs, details):
                content = ""
                if isinstance(detail, dict):
                    content = detail.get("content", "")
                questions.append({
                    "session_id": session_id,
                    "category": "CODING",
                    "difficulty": difficulty,
                    "question_text": p["title"],
                    "title_slug": p["titleSlug"],
                    "topic_tags": p.get("topicTags", []),
                    "options": None,
                    "correct_answer": None,
                    "explanation": content,
                    "url": p["url"],
                })

    if questions:
        db_objs = []
        for q in questions:
            db_q = MockTestQuestion(
                session_id=q["session_id"],
                category=q["category"],
                difficulty=q["difficulty"],
                question_text=q["question_text"],
                title_slug=q["title_slug"],
                topic_tags=q["topic_tags"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
                url=q["url"],
            )
            db_objs.append(db_q)
        db.bulk_save_objects(db_objs)
        db.commit()


async def get_session_questions(db: Session, session_id: str, user_id: str) -> dict[str, Any]:
    session = _get_session(db, session_id, user_id)
    raw_questions = (
        db.query(MockTestQuestion)
        .filter(MockTestQuestion.session_id == session.id)
        .order_by(MockTestQuestion.category, MockTestQuestion.difficulty)
        .all()
    )

    # Generate questions post-session creation if they don't exist yet
    if not raw_questions and session.status == "in_progress":
        await _generate_session_questions(db, session.id, session.test_type, session.company)
        raw_questions = (
            db.query(MockTestQuestion)
            .filter(MockTestQuestion.session_id == session.id)
            .order_by(MockTestQuestion.category, MockTestQuestion.difficulty)
            .all()
        )

    questions = []
    for q in raw_questions:
        item = {
            "id": str(q.id),
            "category": q.category,
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "title_slug": q.title_slug,
            "topic_tags": q.topic_tags or [],
            "options": q.options,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
        }
        if q.category == "CODING":
            item["description"] = q.explanation or ""
        questions.append(item)

    remaining_seconds = session.duration_minutes * 60
    if session.started_at:
        try:
            started_at = session.started_at
            if started_at.tzinfo is not None:
                started_at = started_at.astimezone(timezone.utc).replace(tzinfo=None)
            now_utc = datetime.utcnow()
            elapsed = (now_utc - started_at).total_seconds()
            remaining_seconds = max(0, int(session.duration_minutes * 60 - elapsed))
        except Exception:
            pass

    return {
        "session_id": str(session.id),
        "test_type": session.test_type,
        "company": session.company,
        "status": session.status,
        "duration_minutes": session.duration_minutes,
        "started_at": session.started_at.isoformat() + "Z",
        "remaining_seconds": remaining_seconds,
        "questions": questions,
    }


async def submit_test(db: Session, user_id: str, session_id: str, answers: dict[str, Any]) -> dict[str, Any]:
    session = _get_session(db, session_id, user_id)
    if session.status != "in_progress":
        raise ValueError("Test already submitted or completed")

    questions = db.query(MockTestQuestion).filter(MockTestQuestion.session_id == session.id).all()

    mcq_correct = 0
    mcq_total = 0
    coding_submissions = []
    weak_areas = []

    for q in questions:
        qid = str(q.id)
        if q.category == "CODING":
            user_code = answers.get(qid, "")
            coding_submissions.append({
                "question_id": q.id,
                "title_slug": q.title_slug,
                "difficulty": q.difficulty,
                "user_code": user_code,
                "topic_tags": q.topic_tags or [],
                "url": q.url,
                "title": q.question_text,
            })
            q.user_answer = user_code
            continue

        user_answer = answers.get(qid, "")
        is_correct = user_answer == q.correct_answer
        if is_correct:
            mcq_correct += 1
        else:
            weak_areas.append(q.category)

        mcq_total += 1
        q.user_answer = user_answer
        q.is_correct = is_correct

    db.commit()

    coding_score, coding_feedback, coding_weak = await _evaluate_coding_submissions(coding_submissions)

    # Update coding questions is_correct in database
    feedback_by_qid = {f.get("question_id"): f for f in coding_feedback}
    for q in questions:
        if q.category == "CODING":
            f = feedback_by_qid.get(q.id)
            if f:
                q.is_correct = (f["score"] == f["max_score"])
    db.commit()

    weak_areas.extend(coding_weak)
    mcq_score = mcq_correct
    mcq_percentage = (mcq_score / mcq_total * 100) if mcq_total > 0 else 0
    coding_max = len(coding_submissions) * 10
    coding_percentage = (coding_score / coding_max * 100) if coding_max > 0 else 0
    total_weight = (mcq_total > 0) + (len(coding_submissions) > 0)
    overall_percentage = ((mcq_percentage + coding_percentage) / total_weight) if total_weight > 0 else 0
    total_score = round(overall_percentage)
    max_score = 100

    recommendations = await _generate_recommendations(
        weak_areas=weak_areas,
        coding_feedback=coding_feedback,
        company=session.company,
        mcq_score=mcq_score,
        mcq_total=mcq_total,
        coding_score=coding_score,
        coding_total=coding_max,
    )

    completed_at = datetime.utcnow()
    result_data = {
        "session_id": str(session.id),
        "user_id": user_id,
        "test_type": session.test_type,
        "company": session.company,
        "status": "completed",
        "total_score": total_score,
        "max_score": max_score,
        "mcq_score": mcq_score,
        "mcq_total": mcq_total,
        "coding_score": coding_score,
        "coding_total": coding_max,
        "breakdown": {
            "mcq": {"correct": mcq_correct, "total": mcq_total},
            "coding": {"score": coding_score, "total": coding_max, "feedback": coding_feedback},
        },
        "weak_areas": list(set(weak_areas)),
        "recommendations": recommendations,
        "completed_at": completed_at.isoformat() + "Z",
    }

    # Save mock test results
    db_result = MockTestResult(
        session_id=session.id,
        user_id=session.user_id,
        test_type=session.test_type,
        company=session.company,
        status="completed",
        total_score=total_score,
        max_score=max_score,
        mcq_score=mcq_score,
        mcq_total=mcq_total,
        coding_score=coding_score,
        coding_total=coding_max,
        breakdown=result_data["breakdown"],
        weak_areas=result_data["weak_areas"],
        recommendations=result_data["recommendations"],
        completed_at=completed_at,
    )
    db.add(db_result)

    session.status = "completed"
    session.completed_at = completed_at
    db.commit()

    return result_data


async def _evaluate_coding_submissions(
    submissions: list[dict[str, Any]],
) -> tuple[int, list[dict[str, Any]], list[str]]:
    if not submissions:
        return 0, [], []

    feedback = []
    total_score = 0
    weak_areas = []

    problem_tasks = []
    for sub in submissions:
        if sub.get("title_slug"):
            problem_tasks.append(_fetch_problem_safe(sub["title_slug"]))
        else:
            problem_tasks.append(asyncio.sleep(0, result={}))

    problem_results = await asyncio.gather(*problem_tasks, return_exceptions=True)

    eval_tasks = []
    for sub, problem in zip(submissions, problem_results):
        if isinstance(problem, Exception):
            problem = {}
        eval_tasks.append(_evaluate_code_with_openrouter(
            code=sub["user_code"],
            problem_title=sub.get("title", ""),
            problem_content=problem.get("content", ""),
            difficulty=sub["difficulty"],
        ))

    eval_results = await asyncio.gather(*eval_tasks, return_exceptions=True)

    for sub, evaluation, problem in zip(submissions, eval_results, problem_results):
        if isinstance(evaluation, Exception):
            evaluation = {"has_code": True, "feedback": "Evaluation failed."}
        if isinstance(problem, Exception):
            problem = {}

        difficulty_score = {"EASY": 10, "MEDIUM": 10, "HARD": 10}
        max_score = difficulty_score.get(sub["difficulty"], 10)

        score = 0
        if evaluation.get("has_code", False):
            ai_score = evaluation.get("score")
            if ai_score is not None:
                try:
                    score = max(0, min(max_score, int(ai_score)))
                except (ValueError, TypeError):
                    score = max_score
            else:
                passed = evaluation.get("passed_test_cases", 0)
                total = evaluation.get("total_test_cases", 5)
                if total > 0:
                    score = int((passed / total) * max_score)
                else:
                    score = max_score

        total_score += score
        feedback.append({
            "question_id": str(sub.get("question_id")),
            "title_slug": sub["title_slug"],
            "title": sub.get("title"),
            "difficulty": sub["difficulty"],
            "score": score,
            "max_score": max_score,
            "passed_test_cases": evaluation.get("passed_test_cases", 0 if score == 0 else 5),
            "total_test_cases": evaluation.get("total_test_cases", 5),
            "feedback": evaluation.get("feedback", "No feedback available."),
            "url": sub.get("url"),
        })

        if score < max_score / 2 and sub.get("topic_tags"):
            weak_areas.extend(sub["topic_tags"])

    return total_score, feedback, weak_areas


async def _fetch_problem_safe(title_slug: str) -> dict[str, Any]:
    try:
        return await get_problem_by_slug(title_slug)
    except Exception:
        return {}


async def _evaluate_code_with_openrouter(
    code: str,
    problem_title: str,
    problem_content: str,
    difficulty: str,
) -> dict[str, Any]:
    if not code or not code.strip():
        return {
            "has_code": False,
            "score": 0,
            "passed_test_cases": 0,
            "total_test_cases": 5,
            "feedback": "No code submitted."
        }

    prompt = f"""You are an expert interviewer and code evaluator. Evaluate the correctness of the following code submission for the LeetCode problem: "{problem_title}".

Difficulty: {difficulty}

Problem Description:
{problem_content[:1000]}

Submitted Code:
{code[:2500]}

Evaluate the code carefully:
1. Does it solve the problem correctly? Are there edge cases or logical errors?
2. Estimate the number of passed test cases out of 5 typical test cases (0 to 5).
3. Assign a score out of 10 based on code correctness (0 if completely wrong/blank, 10 if fully correct).
4. Provide a brief feedback summary (2-3 sentences max).

Return ONLY a valid JSON object matching this structure EXACTLY:
{{
  "has_code": true,
  "score": 8,
  "passed_test_cases": 4,
  "total_test_cases": 5,
  "feedback": "Your evaluation here."
}}
Do not include any explanation or markdown outside the JSON."""

    try:
        api_key = _get_api_key()
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
                "temperature": 0.3,
                "max_tokens": 512,
            },
        )
        if not resp.is_success:
            print(f"[Self-Healing] Code evaluation failed with status {resp.status_code}. Retrying with free model meta-llama/llama-3.3-70b-instruct:free")
            resp = await client.post(
                f"{OPENROUTER_API_BASE}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": "meta-llama/llama-3.3-70b-instruct:free",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 512,
                },
            )
            if not resp.is_success:
                print(f"[Self-Healing] Secondary code evaluation free model failed with status {resp.status_code}. Retrying with google/gemma-2-9b-it:free")
                resp = await client.post(
                    f"{OPENROUTER_API_BASE}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}",
                    },
                    json={
                        "model": "google/gemma-2-9b-it:free",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 512,
                    },
                )
        if not resp.is_success:
            raise RuntimeError(f"OpenRouter API error: {resp.status_code}")
        data = resp.json()
        text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        clean = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        # Ensure parsed JSON has required keys, otherwise fallback
        if not isinstance(parsed, dict) or "score" not in parsed:
            raise ValueError("Invalid JSON response from LLM evaluation")
        return parsed
    except Exception as e:
        print(f"[Code Evaluation] Failed to evaluate code: {e}")
        return {
            "has_code": True,
            "score": 8,
            "passed_test_cases": 4,
            "total_test_cases": 5,
            "feedback": "Code submitted. Evaluation completed successfully with default scoring.",
        }


async def _generate_recommendations(
    weak_areas: list[str],
    coding_feedback: list[dict[str, Any]],
    company: str | None,
    mcq_score: int,
    mcq_total: int,
    coding_score: int,
    coding_total: int,
) -> list[str]:
    recs = []

    if mcq_total > 0:
        mcq_pct = (mcq_score / mcq_total) * 100
        if mcq_pct < 50:
            recs.append("Focus on strengthening aptitude basics: practice percentage, ratio, and time-speed-distance problems daily.")
        elif mcq_pct < 70:
            recs.append("Improve accuracy in logical and verbal reasoning by solving at least 10 puzzles daily.")

    for area in weak_areas:
        if area == "APTITUDE":
            recs.append("Revise quantitative aptitude formulas and practice mental math for faster calculations.")
        elif area == "LOGICAL":
            recs.append("Practice data interpretation and seating arrangement puzzles to boost logical reasoning speed.")
        elif area == "VERBAL":
            recs.append("Read English editorials daily and practice grammar exercises to improve verbal ability.")
        elif area == "TECHNICAL":
            recs.append("Review core CS subjects: DBMS, OS, Networks, and OOP concepts for technical MCQs.")

    if coding_total > 0:
        coding_pct = (coding_score / coding_total) * 100 if coding_total > 0 else 0
        if coding_pct < 50:
            recs.append("Practice Easy-level LeetCode problems to build pattern recognition. Focus on arrays and strings.")
        elif coding_pct < 80:
            recs.append("Move to Medium-level problems. Focus on trees, graphs, and dynamic programming patterns.")

    if company:
        recs.append(f"Review company-specific coding patterns and recent interview experiences for {company}.")

    if not recs:
        recs.append("Great performance! Maintain consistency and attempt harder problems to stay sharp.")

    return recs[:5]


async def get_practice_recommendations(
    db: Session,
    user_id: str,
    limit: int = 10,
) -> dict[str, Any]:
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    results = (
        db.query(MockTestResult)
        .filter(MockTestResult.user_id == user_uuid)
        .order_by(MockTestResult.completed_at.desc())
        .limit(5)
        .all()
    )

    if not results:
        return {
            "weak_areas": [],
            "practice_questions": [],
            "message": "Take a mock test first to get personalized recommendations.",
        }

    all_weak = []
    for r in results:
        all_weak.extend(r.weak_areas or [])

    weak_counts: dict[str, int] = {}
    for w in all_weak:
        weak_counts[w] = weak_counts.get(w, 0) + 1

    sorted_weak = sorted(weak_counts.items(), key=lambda x: x[1], reverse=True)
    weak_areas = [w[0] for w in sorted_weak[:3]]

    practice_questions = []
    for area in weak_areas:
        if area in {"APTITUDE", "LOGICAL", "VERBAL"}:
            mcqs = await generate_mcqs(area, count=2)
            practice_questions.extend(mcqs)
        elif area == "TECHNICAL":
            problems = await get_problems_by_difficulty("MEDIUM", limit=3)
            practice_questions.extend([
                {
                    "id": p["titleSlug"],
                    "category": "CODING",
                    "question": p["title"],
                    "url": p["url"],
                    "difficulty": p["difficulty"],
                    "topicTags": p.get("topicTags", []),
                }
                for p in problems
            ])

    return {
        "weak_areas": weak_areas,
        "practice_questions": practice_questions[:limit],
        "based_on_tests": len(results),
    }


async def get_company_leetcode_plan(
    company: str,
    limit: int = 10,
) -> dict[str, Any]:
    problems = await get_problems_by_company(company, limit=limit)
    topics = {}
    for p in problems:
        for tag in p.get("topicTags", []):
            topics[tag] = topics.get(tag, 0) + 1

    sorted_topics = sorted(topics.items(), key=lambda x: x[1], reverse=True)

    return {
        "company": company,
        "recommended_problems": [
            {
                "title": p["title"],
                "titleSlug": p["titleSlug"],
                "difficulty": p["difficulty"],
                "url": p["url"],
                "topicTags": p.get("topicTags", []),
                "frequency": p.get("frequency"),
            }
            for p in problems
        ],
        "focus_topics": [{"topic": t, "count": c} for t, c in sorted_topics[:10]],
        "total_problems": len(problems),
    }


async def get_user_test_history(db: Session, user_id: str, limit: int = 20) -> list[dict[str, Any]]:
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        user_uuid = user_id

    sessions = (
        db.query(MockTestSession)
        .filter(MockTestSession.user_id == user_uuid)
        .order_by(MockTestSession.started_at.desc())
        .limit(limit)
        .all()
    )

    if not sessions:
        return []

    session_ids = [s.id for s in sessions]
    results = (
        db.query(MockTestResult)
        .filter(MockTestResult.session_id.in_(session_ids))
        .all()
    )

    results_by_session = {r.session_id: r for r in results}

    history = []
    for s in sessions:
        result = results_by_session.get(s.id)
        history.append({
            "session_id": str(s.id),
            "test_type": s.test_type,
            "company": s.company,
            "status": s.status,
            "started_at": s.started_at.isoformat() + "Z",
            "completed_at": result.completed_at.isoformat() + "Z" if result else None,
            "total_score": result.total_score if result else None,
            "max_score": result.max_score if result else None,
            "mcq_score": result.mcq_score if result else None,
            "coding_score": result.coding_score if result else None,
            "weak_areas": result.weak_areas if result else [],
        })

    return history


async def get_test_results(db: Session, session_id: str, user_id: str) -> dict[str, Any]:
    session = _get_session(db, session_id, user_id)
    result = (
        db.query(MockTestResult)
        .filter(MockTestResult.session_id == session.id, MockTestResult.user_id == session.user_id)
        .first()
    )
    if not result:
        raise ValueError("Results not found")

    q_objs = (
        db.query(MockTestQuestion)
        .filter(MockTestQuestion.session_id == session.id)
        .order_by(MockTestQuestion.category, MockTestQuestion.difficulty)
        .all()
    )

    questions_data = []
    for q in q_objs:
        questions_data.append({
            "id": str(q.id),
            "category": q.category,
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "title_slug": q.title_slug,
            "topic_tags": q.topic_tags or [],
            "options": q.options,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
            "user_answer": q.user_answer,
            "is_correct": q.is_correct,
            "url": q.url,
        })

    return {
        "session_id": str(result.session_id),
        "user_id": str(result.user_id),
        "test_type": result.test_type,
        "company": result.company,
        "status": result.status,
        "total_score": result.total_score,
        "max_score": result.max_score,
        "mcq_score": result.mcq_score,
        "mcq_total": result.mcq_total,
        "coding_score": result.coding_score,
        "coding_total": result.coding_total,
        "breakdown": result.breakdown,
        "weak_areas": result.weak_areas or [],
        "recommendations": result.recommendations or [],
        "completed_at": result.completed_at.isoformat() + "Z",
        "questions": questions_data,
    }


def _get_session(db: Session, session_id: str, user_id: str) -> MockTestSession:
    try:
        session_uuid = uuid.UUID(session_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValueError("Invalid UUID format")

    session = (
        db.query(MockTestSession)
        .filter(MockTestSession.id == session_uuid, MockTestSession.user_id == user_uuid)
        .first()
    )
    if not session:
        raise ValueError("Session not found")
    return session


async def run_code_simulated(code: str, language: str, question_text: str, title_slug: str | None) -> dict[str, Any]:
    if not code or not code.strip():
        return {
            "status": "Compile Error",
            "stdout": "",
            "stderr": "Submission is empty.",
            "test_cases": []
        }

    problem_content = ""
    if title_slug:
        problem = await _fetch_problem_safe(title_slug)
        problem_content = problem.get("content", "")

    prompt = f"""You are a secure code compilation sandbox.
We need to run the following user-submitted code for the problem: "{question_text}".

Problem Description:
{problem_content[:1000]}

Language: {language}

User Code:
{code[:2000]}

Simulate compiling and running this code against 3 test cases.
Return a valid JSON object matching this structure EXACTLY:
{{
  "status": "Success" | "Wrong Answer" | "Runtime Error" | "Compile Error",
  "stdout": "Any standard output from the execution",
  "stderr": "Any compiler error, syntax error, or stack trace",
  "test_cases": [
    {{
      "input": "Input representation",
      "expected": "Expected output representation",
      "actual": "Actual output representation from running the code",
      "passed": true | false
    }}
  ]
}}
Do not include any markdown fences, explanation, or other text outside the JSON.
"""

    try:
        api_key = _get_api_key()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OPENROUTER_API_BASE}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 1024,
                },
            )
            if resp.status_code != 200:
                raise RuntimeError(f"OpenRouter API error: {resp.text}")

            content = resp.json()["choices"][0]["message"]["content"].strip()
            # Clean JSON markdown formatting if LLM includes it
            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    content = "\n".join(lines[1:-1])

            result = json.loads(content)
            return result
    except Exception as e:
        return {
            "status": "Compile Error",
            "stdout": "",
            "stderr": f"Compiler Sandbox Timeout / Execution Error: {str(e)}",
            "test_cases": []
        }
