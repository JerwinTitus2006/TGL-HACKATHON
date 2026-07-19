from __future__ import annotations
import asyncio
import json
import os
from typing import Any

import httpx

LEETCODE_GRAPHQL = "https://leetcode.com/graphql"
OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"
MODEL = "google/gemini-2.5-flash"


def _get_api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY not set in backend/.env")
    return key


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; KITS-Placement-Hub/1.0)",
    }


async def _graphql(query: str, variables: dict, retries: int = 2) -> dict:
    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    LEETCODE_GRAPHQL,
                    headers=_headers(),
                    json={"query": query, "variables": variables},
                )
                if resp.status_code == 429:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                if resp.status_code != 200:
                    if attempt == retries:
                        return {}
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                data = resp.json()
                if "errors" in data:
                    if attempt == retries:
                        return {}
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                ret_val = data.get("data")
                return ret_val if isinstance(ret_val, dict) else {}
        except (httpx.TimeoutException, httpx.NetworkError):
            if attempt == retries:
                return {}
            await asyncio.sleep(1 * (attempt + 1))
    return {}


PROBLEMSET_QUERY = """
query {
  problemsetQuestionListV2(limit: %d) {
    questions {
      title
      titleSlug
      difficulty
      topicTags {
        name
        slug
      }
      frequency
      paidOnly
    }
  }
}
"""


async def get_problems_by_difficulty(
    difficulty: str,
    limit: int = 10,
    topic: str | None = None,
) -> list[dict[str, Any]]:
    query = PROBLEMSET_QUERY % max(150, limit * 10)
    data = await _graphql(
        query,
        {},
    )
    pq_list = data.get("problemsetQuestionListV2") or {}
    questions = pq_list.get("questions") or []
    filtered = [q for q in questions if q and q.get("difficulty", "").upper() == difficulty.upper()]
    if topic:
        topic_lower = topic.lower()
        filtered = [q for q in filtered if any(
            t.get("slug", "").lower() == topic_lower or t.get("name", "").lower() == topic_lower
            for t in (q.get("topicTags") or [])
        )]
    return [
        {
            "title": q["title"],
            "titleSlug": q["titleSlug"],
            "difficulty": q["difficulty"],
            "topicTags": [t["name"] for t in (q.get("topicTags") or [])],
            "frequency": q.get("frequency"),
            "isPaidOnly": q.get("paidOnly", False),
            "url": f"https://leetcode.com/problems/{q['titleSlug']}/",
            "content": "",
            "codeSnippets": [],
        }
        for q in filtered[:limit]
        if not q.get("paidOnly", False)
    ]


async def get_problems_by_company(
    company: str,
    limit: int = 15,
) -> list[dict[str, Any]]:
    return await _get_company_problems_via_openrouter(company, limit)


async def _get_company_problems_via_openrouter(company: str, limit: int = 15) -> list[dict[str, Any]]:
    try:
        api_key = _get_api_key()
    except RuntimeError:
        return []
    prompt = f"""List exactly {limit} well-known LeetCode problem titles (not slugs) that are frequently asked in interviews at {company}.
Return ONLY a valid JSON array of strings like:
["Two Sum", "Valid Parentheses", ...]
No markdown, no extra text."""

    try:
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
            if resp.status_code == 402:
                print("[Self-Healing] Credit limit hit (402) in LeetCode fetch. Retrying with free model google/gemini-2.5-flash:free")
                resp = await client.post(
                    f"{OPENROUTER_API_BASE}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}",
                    },
                    json={
                        "model": "google/gemini-2.5-flash:free",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 512,
                    },
                )
        if not resp.is_success:
            return []
        data = resp.json()
        text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "[]")
        )
        clean = text.replace("```json", "").replace("```", "").strip()
        titles = json.loads(clean)
        if not isinstance(titles, list):
            return []
    except Exception:
        return []

    slugs = [_title_to_slug(t) for t in titles[:limit]]

    async def fetch_one(slug: str) -> dict[str, Any] | None:
        try:
            return await get_problem_by_slug(slug)
        except Exception:
            return None

    tasks = [fetch_one(slug) for slug in slugs]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, dict) and r]


def _title_to_slug(title: str) -> str:
    slug = title.lower()
    replacements = {
        " ": "-",
        "(": "",
        ")": "",
        ",": "",
        "'": "",
        '"': "",
        "/": "",
        "\\": "",
        "?": "",
        "!": "",
        ":": "",
        ";": "",
        ".": "",
    }
    for old, new in replacements.items():
        slug = slug.replace(old, new)
    slug = "-".join(part for part in slug.split("-") if part)
    return slug


async def get_problem_by_slug(title_slug: str) -> dict[str, Any]:
    query = """
    query getProblem($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        titleSlug
        difficulty
        topicTags {
          name
          slug
        }
        content
        codeSnippets {
          lang
          code
        }
        hints
        sampleTestCase
      }
    }
    """
    data = await _graphql(query, {"titleSlug": title_slug})
    q = data.get("question") or {}
    if not q or not q.get("title"):
        return {}
    return {
        "title": q.get("title"),
        "titleSlug": q.get("titleSlug"),
        "difficulty": q.get("difficulty"),
        "topicTags": [t["name"] for t in (q.get("topicTags") or [])],
        "content": q.get("content", ""),
        "codeSnippets": q.get("codeSnippets", []),
        "hints": q.get("hints", []),
        "sampleTestCase": q.get("sampleTestCase"),
        "url": f"https://leetcode.com/problems/{title_slug}/",
    }


async def get_company_tags() -> list[str]:
    query = """
    query getCompanyTags {
      companyTags {
        name
        slug
        frequency
      }
    }
    """
    data = await _graphql(query, {})
    return [c["slug"] for c in (data.get("companyTags") or [])]


async def get_topic_tags() -> list[dict[str, str]]:
    query = """
    query getTopicTags {
      topicTags {
        name
        slug
      }
    }
    """
    data = await _graphql(query, {})
    return [
        {"name": t["name"], "slug": t["slug"]}
        for t in (data.get("topicTags") or [])
    ]
