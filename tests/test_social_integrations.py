import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_social_routes_without_auth():
    response = client.get("/api/social/connections")
    # Should return 401 Unauthorized without bearer token
    assert response.status_code == 401

def test_social_stats_without_auth():
    response = client.get("/api/social/stats")
    assert response.status_code == 401
