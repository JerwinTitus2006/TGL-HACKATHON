from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException

GITHUB_API_BASE = "https://api.github.com"


async def fetch_github_profile(access_token: str) -> dict[str, Any]:
    token_or_username = access_token.strip()
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "KITS-Placement-Hub",
    }
    if token_or_username.startswith(("ghp_", "gho_", "github_pat_")) or len(token_or_username) > 30:
        headers["Authorization"] = f"Bearer {token_or_username}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Try authenticated /user endpoint
        user_resp = await client.get(f"{GITHUB_API_BASE}/user", headers=headers)
        if user_resp.status_code == 200:
            profile = user_resp.json()
            repos_url = f"{GITHUB_API_BASE}/user/repos"
        else:
            # 2. Fallback to public /users/{username} endpoint
            user_resp = await client.get(f"{GITHUB_API_BASE}/users/{token_or_username}", headers=headers)
            if user_resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not find GitHub user or valid token for '{token_or_username}'"
                )
            profile = user_resp.json()
            repos_url = f"{GITHUB_API_BASE}/users/{profile['login']}/repos"

        repos_resp = await client.get(
            repos_url,
            headers=headers,
            params={"sort": "updated", "per_page": 100},
        )
        repos = repos_resp.json() if repos_resp.status_code == 200 and isinstance(repos_resp.json(), list) else []

        lang_map: dict[str, int] = {}
        for repo in repos:
            if repo.get("fork"):
                continue
            if repo.get("language"):
                lang = repo["language"]
                lang_map[lang] = lang_map.get(lang, 0) + repo.get("size", 100)

        top_repos = sorted(
            [r for r in repos if not r.get("fork")],
            key=lambda r: r.get("stargazers_count", 0),
            reverse=True,
        )[:5]
        top_repos_summary = [
            {
                "name": r["name"],
                "stars": r.get("stargazers_count", 0),
                "forks": r.get("forks_count", 0),
                "url": r["html_url"],
            }
            for r in top_repos
        ]

        events_resp = await client.get(
            f"{GITHUB_API_BASE}/users/{profile['login']}/events/public",
            headers=headers,
            params={"per_page": 100},
        )
        events = events_resp.json() if events_resp.status_code == 200 and isinstance(events_resp.json(), list) else []
        push_dates = sorted(
            {
                e["created_at"][:10]
                for e in events
                if e.get("type") == "PushEvent" and "created_at" in e
            },
            reverse=True,
        )
        streak = _calculate_streak(push_dates)

        total_lang_bytes = sum(lang_map.values())
        language_distribution = (
            {k: round(v / total_lang_bytes, 4) for k, v in lang_map.items()}
            if total_lang_bytes
            else {}
        )

    return {
        "login": profile.get("login"),
        "name": profile.get("name") or profile.get("login"),
        "avatar_url": profile.get("avatar_url"),
        "public_repos": profile.get("public_repos", 0),
        "followers": profile.get("followers", 0),
        "following": profile.get("following", 0),
        "total_commits_last_year": len(push_dates),
        "languages": language_distribution,
        "top_repos": top_repos_summary,
        "contribution_streak": streak,
    }


def _calculate_streak(dates: list[str]) -> int:
    if not dates:
        return 0
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i, d in enumerate(dates):
        current = (today - timedelta(days=i)).isoformat()
        if d == current:
            streak += 1
        else:
            break
    return streak


LEETCODE_GRAPHQL = "https://leetcode.com/graphql"


def _leetcode_headers(session_cookie: str | None = None) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; KITS-Placement-Hub/1.0)",
    }
    if session_cookie:
        headers["Cookie"] = f"LEETCODE_SESSION={session_cookie}"
    return headers


async def _leetcode_query(query: str, variables: dict, session_cookie: str | None = None) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            LEETCODE_GRAPHQL,
            headers=_leetcode_headers(session_cookie),
            json={"query": query, "variables": variables},
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"LeetCode query failed: {resp.text[:200]}",
            )
        data = resp.json()
        if "errors" in data:
            raise HTTPException(status_code=400, detail=str(data["errors"]))
        return data.get("data", {})


async def fetch_leetcode_profile(username: str, session_cookie: str | None = None) -> dict[str, Any]:
    profile_query = """
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        realName
        avatar
        ranking
        reputation
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
    """

    language_query = """
    query getLanguageStats($username: String!) {
      matchedUser(username: $username) {
        languageProblemCount {
          languageName
          problemsSolved
        }
      }
    }
    """

    contest_query = """
    query getContestHistory($username: String!) {
      userContestRanking(username: $username) {
        rating
        globalRanking
        totalParticipants
        topPercentage
        contest {
          title
          startTime
        }
      }
    }
    """

    submission_query = """
    query getRecentSubmissions($username: String!, $limit: Int!) {
      recentSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
        status
        difficulty
      }
    }
    """

    vars = {"username": username}

    try:
        profile_data = await _leetcode_query(profile_query, vars, session_cookie)
        lang_data = await _leetcode_query(language_query, vars, session_cookie)
        contest_data = await _leetcode_query(contest_query, vars, session_cookie)
        sub_data = await _leetcode_query(submission_query, {**vars, "limit": 50}, session_cookie)
    except Exception as e:
        # Graceful fallback mock values if LeetCode GraphQL is down or cookie invalid
        raise HTTPException(status_code=400, detail=f"Failed to fetch from LeetCode API: {str(e)}")

    mu = profile_data.get("matchedUser") or {}
    submit_stats = (mu.get("submitStats") or {}).get("acSubmissionNum") or []
    difficulty_map = {item["difficulty"].lower(): item["count"] for item in submit_stats}

    languages = lang_data.get("matchedUser") or {}
    lang_stats = {
        item["languageName"]: item["problemsSolved"]
        for item in (languages.get("languageProblemCount") or [])
    }

    contest = contest_data.get("userContestRanking") or {}
    submissions = sub_data.get("recentSubmissionList") or []

    total_accepted = sum(difficulty_map.values())
    streak = _calculate_leetcode_streak(submissions)

    return {
        "username": mu.get("username", username),
        "real_name": mu.get("realName"),
        "avatar": mu.get("avatar"),
        "ranking": contest.get("globalRanking") or mu.get("ranking"),
        "reputation": mu.get("reputation"),
        "total_solved": total_accepted,
        "easy_solved": difficulty_map.get("easy", 0),
        "medium_solved": difficulty_map.get("medium", 0),
        "hard_solved": difficulty_map.get("hard", 0),
        "acceptance_rate": 0.0,
        "streak_days": streak,
        "total_submissions": len(submissions),
        "contest_rating": contest.get("rating"),
        "contest_ranking": str(contest.get("topPercentage", "")),
        "language_stats": lang_stats,
        "recent_submissions": submissions[:20],
    }


def _calculate_leetcode_streak(submissions: list[dict]) -> int:
    if not submissions:
        return 0
    dates = sorted({datetime.fromtimestamp(s["timestamp"]).date().isoformat() for s in submissions}, reverse=True)
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i, d in enumerate(dates):
        current = (today - timedelta(days=i)).isoformat()
        if d == current:
            streak += 1
        else:
            break
    return streak
