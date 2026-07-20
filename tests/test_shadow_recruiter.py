import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.shadow_recruiter_service import ShadowRecruiterService

client = TestClient(app)

def test_shadow_recruiter_api_unauthorized():
    response = client.post("/api/shadow-recruiter/review")
    assert response.status_code == 401

def test_fairness_guard_agent_strikes_ungrounded_quotes():
    candidate_text = "Experienced Python developer who built RESTful APIs using FastAPI and PostgreSQL."
    
    raw_objections = [
        {
          "objection_id": "test1",
          "category": "missing_quantification",
          "severity": "high",
          "quote": "built RESTful APIs",
          "reasoning": "No metrics on request throughput or latency.",
          "suggested_fix": "Add metrics on API requests per second."
        },
        {
          "objection_id": "test2",
          "category": "overclaim",
          "severity": "high",
          "quote": "Led a massive team of 50 AI researchers",
          "reasoning": "Unsubstantiated leadership claim.",
          "suggested_fix": "Remove or clarify team size."
        }
    ]
    
    audited, audit_log = ShadowRecruiterService._run_fairness_guard_agent(candidate_text, raw_objections)
    
    # Assert quote 'built RESTful APIs' passed because it exists in candidate_text
    # Assert quote 'Led a massive team of 50 AI researchers' was struck out by Fairness Guard
    assert len(audited) == 1
    assert audited[0]["quote"] == "built RESTful APIs"
    assert audit_log["objections_removed"] == 1
    assert "not found in source resume text" in audit_log["removed_reasons"][0]
