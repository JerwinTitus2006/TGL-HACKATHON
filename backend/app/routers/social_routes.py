from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.models import User, SocialConnection, GithubStats, LeetcodeStats
from backend.app.services.social_api import fetch_github_profile, fetch_leetcode_profile
from backend.app.utils.encryption import encrypt_token, decrypt_token

router = APIRouter()


class ConnectGithubRequest(BaseModel):
    access_token: str


class SyncGithubRequest(BaseModel):
    encrypted_token: str


class ConnectLeetcodeRequest(BaseModel):
    username: str
    session_cookie: Optional[str] = None


class SyncLeetcodeRequest(BaseModel):
    username: str
    encrypted_cookie: str


@router.get("/api/social/connections")
async def get_connections(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conns = db.query(SocialConnection).filter(SocialConnection.user_id == user.id).all()
    connections_list = []
    for c in conns:
        connections_list.append({
            "id": str(c.id),
            "user_id": str(c.user_id),
            "platform": c.platform,
            "username": c.username,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() + "Z",
            "updated_at": c.updated_at.isoformat() + "Z" if c.updated_at else None,
        })
    return {"user_id": str(user.id), "connections": connections_list}


@router.post("/api/social/github/connect")
async def connect_github(
    req: ConnectGithubRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        profile = await fetch_github_profile(req.access_token)
        encrypted = encrypt_token(req.access_token)

        # Upsert SocialConnection
        conn = db.query(SocialConnection).filter(
            SocialConnection.user_id == user.id,
            SocialConnection.platform == "github"
        ).first()

        if conn:
            conn.username = profile.get("login")
            conn.access_token = encrypted
            conn.is_active = True
            conn.updated_at = datetime.utcnow()
        else:
            conn = SocialConnection(
                user_id=user.id,
                platform="github",
                username=profile.get("login"),
                access_token=encrypted,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(conn)

        # Upsert GithubStats
        stats = db.query(GithubStats).filter(GithubStats.user_id == user.id).first()
        now = datetime.utcnow()
        
        stats_payload = {
            "user_id": user.id,
            "login": profile.get("login"),
            "name": profile.get("name"),
            "avatar_url": profile.get("avatar_url"),
            "public_repos": profile.get("public_repos", 0),
            "followers": profile.get("followers", 0),
            "following": profile.get("following", 0),
            "total_commits_last_year": profile.get("total_commits_last_year", 0),
            "languages": profile.get("languages", {}),
            "top_repos": profile.get("top_repos", []),
            "contribution_streak": profile.get("contribution_streak", 0),
            "synced_at": now,
            "updated_at": now,
        }

        if stats:
            for k, v in stats_payload.items():
                setattr(stats, k, v)
        else:
            stats = GithubStats(**stats_payload, created_at=now)
            db.add(stats)

        db.commit()

        return {
            "ok": True,
            "profile": profile,
            "encrypted_token": encrypted,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/social/github/sync")
async def sync_github(
    req: SyncGithubRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        token = decrypt_token(req.encrypted_token)
        data = await fetch_github_profile(token)
        now = datetime.utcnow()

        stats = db.query(GithubStats).filter(GithubStats.user_id == user.id).first()
        stats_payload = {
            "user_id": user.id,
            "login": data.get("login"),
            "name": data.get("name"),
            "avatar_url": data.get("avatar_url"),
            "public_repos": data.get("public_repos", 0),
            "followers": data.get("followers", 0),
            "following": data.get("following", 0),
            "total_commits_last_year": data.get("total_commits_last_year", 0),
            "languages": data.get("languages", {}),
            "top_repos": data.get("top_repos", []),
            "contribution_streak": data.get("contribution_streak", 0),
            "synced_at": now,
            "updated_at": now,
        }

        if stats:
            for k, v in stats_payload.items():
                setattr(stats, k, v)
        else:
            stats = GithubStats(**stats_payload, created_at=now)
            db.add(stats)

        db.commit()

        return {"ok": True, "data": data, "synced_at": now.isoformat() + "Z"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/api/social/github/disconnect")
async def disconnect_github(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(SocialConnection).filter(
        SocialConnection.user_id == user.id,
        SocialConnection.platform == "github"
    ).delete()
    db.query(GithubStats).filter(GithubStats.user_id == user.id).delete()
    db.commit()
    return {"ok": True}


@router.post("/api/social/leetcode/connect")
async def connect_leetcode(
    req: ConnectLeetcodeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        data = await fetch_leetcode_profile(req.username, req.session_cookie)
        encrypted = encrypt_token(req.session_cookie or "")

        conn = db.query(SocialConnection).filter(
            SocialConnection.user_id == user.id,
            SocialConnection.platform == "leetcode"
        ).first()

        if conn:
            conn.username = data.get("username", req.username)
            conn.access_token = encrypted
            conn.extra_data = {"session_cookie_provided": bool(req.session_cookie)}
            conn.is_active = True
            conn.updated_at = datetime.utcnow()
        else:
            conn = SocialConnection(
                user_id=user.id,
                platform="leetcode",
                username=data.get("username", req.username),
                access_token=encrypted,
                extra_data={"session_cookie_provided": bool(req.session_cookie)},
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(conn)

        stats = db.query(LeetcodeStats).filter(LeetcodeStats.user_id == user.id).first()
        now = datetime.utcnow()

        stats_payload = {
            "user_id": user.id,
            "username": data.get("username", req.username),
            "real_name": data.get("real_name"),
            "avatar": data.get("avatar"),
            "ranking": data.get("ranking"),
            "reputation": data.get("reputation"),
            "total_solved": data.get("total_solved", 0),
            "easy_solved": data.get("easy_solved", 0),
            "medium_solved": data.get("medium_solved", 0),
            "hard_solved": data.get("hard_solved", 0),
            "acceptance_rate": data.get("acceptance_rate", 0),
            "streak_days": data.get("streak_days", 0),
            "total_submissions": data.get("total_submissions", 0),
            "contest_rating": data.get("contest_rating"),
            "contest_ranking": data.get("contest_ranking"),
            "language_stats": data.get("language_stats", {}),
            "recent_submissions": data.get("recent_submissions", []),
            "synced_at": now,
            "updated_at": now,
        }

        if stats:
            for k, v in stats_payload.items():
                setattr(stats, k, v)
        else:
            stats = LeetcodeStats(**stats_payload, created_at=now)
            db.add(stats)

        db.commit()

        return {
            "ok": True,
            "profile": data,
            "encrypted_cookie": encrypted,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/social/leetcode/sync")
async def sync_leetcode(
    req: SyncLeetcodeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cookie = decrypt_token(req.encrypted_cookie) if req.encrypted_cookie else None
        data = await fetch_leetcode_profile(req.username, cookie)
        now = datetime.utcnow()

        stats = db.query(LeetcodeStats).filter(LeetcodeStats.user_id == user.id).first()
        stats_payload = {
            "user_id": user.id,
            "username": data.get("username", req.username),
            "real_name": data.get("real_name"),
            "avatar": data.get("avatar"),
            "ranking": data.get("ranking"),
            "reputation": data.get("reputation"),
            "total_solved": data.get("total_solved", 0),
            "easy_solved": data.get("easy_solved", 0),
            "medium_solved": data.get("medium_solved", 0),
            "hard_solved": data.get("hard_solved", 0),
            "acceptance_rate": data.get("acceptance_rate", 0),
            "streak_days": data.get("streak_days", 0),
            "total_submissions": data.get("total_submissions", 0),
            "contest_rating": data.get("contest_rating"),
            "contest_ranking": data.get("contest_ranking"),
            "language_stats": data.get("language_stats", {}),
            "recent_submissions": data.get("recent_submissions", []),
            "synced_at": now,
            "updated_at": now,
        }

        if stats:
            for k, v in stats_payload.items():
                setattr(stats, k, v)
        else:
            stats = LeetcodeStats(**stats_payload, created_at=now)
            db.add(stats)

        db.commit()

        return {"ok": True, "data": data, "synced_at": now.isoformat() + "Z"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/social/stats")
async def get_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    gh = db.query(GithubStats).filter(GithubStats.user_id == user.id).first()
    lc = db.query(LeetcodeStats).filter(LeetcodeStats.user_id == user.id).first()
    
    gh_data = None
    if gh:
        gh_data = {
            "login": gh.login,
            "name": gh.name,
            "avatar_url": gh.avatar_url,
            "public_repos": gh.public_repos,
            "followers": gh.followers,
            "following": gh.following,
            "total_commits_last_year": gh.total_commits_last_year,
            "languages": gh.languages or {},
            "top_repos": gh.top_repos or [],
            "contribution_streak": gh.contribution_streak,
            "synced_at": gh.synced_at.isoformat() + "Z" if gh.synced_at else None,
        }

    lc_data = None
    if lc:
        lc_data = {
            "username": lc.username,
            "real_name": lc.real_name,
            "avatar": lc.avatar,
            "ranking": lc.ranking,
            "reputation": lc.reputation,
            "total_solved": lc.total_solved,
            "easy_solved": lc.easy_solved,
            "medium_solved": lc.medium_solved,
            "hard_solved": lc.hard_solved,
            "acceptance_rate": float(lc.acceptance_rate or 0.0),
            "streak_days": lc.streak_days,
            "total_submissions": lc.total_submissions,
            "contest_rating": float(lc.contest_rating) if lc.contest_rating else None,
            "contest_ranking": lc.contest_ranking,
            "language_stats": lc.language_stats or {},
            "recent_submissions": lc.recent_submissions or [],
            "synced_at": lc.synced_at.isoformat() + "Z" if lc.synced_at else None,
        }

    return {
        "github": gh_data,
        "leetcode": lc_data,
    }


@router.delete("/api/social/leetcode/disconnect")
async def disconnect_leetcode(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(SocialConnection).filter(
        SocialConnection.user_id == user.id,
        SocialConnection.platform == "leetcode"
    ).delete()
    db.query(LeetcodeStats).filter(LeetcodeStats.user_id == user.id).delete()
    db.commit()
    return {"ok": True}
