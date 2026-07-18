import requests
import json
import time

API_URL = "http://127.0.0.1:8000/api"

def test_api():
    print("=" * 60)
    print("TESTING API ENDPOINTS")
    print("=" * 60)
    
    # 1. Register a test user
    print("\n[1] Registering User...")
    reg_payload = {
        "email": "api_test_user@radix.com",
        "password": "password123",
        "role": "candidate"
    }
    r = requests.post(f"{API_URL}/auth/register", json=reg_payload)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
    assert r.status_code in [200, 201, 400] # 400 if already exists

    # 2. Login test
    print("\n[2] Authenticating User (Login)...")
    login_payload = {
        "email": "api_test_user@radix.com",
        "password": "password123"
    }
    r = requests.post(f"{API_URL}/auth/login", json=login_payload)
    print(f"Status: {r.status_code}")
    login_data = r.json()
    print(f"Response: {login_data}")
    assert r.status_code == 200
    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create profile
    print("\n[3] Creating Candidate Profile...")
    profile_payload = {
        "name": "API Test User",
        "email": "api_test_user@radix.com",
        "education": "BS in CS, MIT (2023)",
        "preferred_roles": ["Backend Developer", "System Designer"],
        "skills": []
    }
    r = requests.post(f"{API_URL}/profiles/me", json=profile_payload, headers=headers)
    print(f"Status: {r.status_code}")
    profile_data = r.json()
    print(f"Response: {profile_data}")
    assert r.status_code in [200, 201, 400]
    
    # 4. Get profile
    print("\n[4] Getting Candidate Profile...")
    r = requests.get(f"{API_URL}/profiles/me", headers=headers)
    print(f"Status: {r.status_code}")
    profile_data = r.json()
    print(f"Response: {profile_data}")
    assert r.status_code == 200

    # 5. List available companies
    print("\n[5] Listing Company Benchmarks...")
    r = requests.get(f"{API_URL}/talent-check/companies", headers=headers)
    print(f"Status: {r.status_code}")
    companies = r.json()
    print(f"Total Companies Found: {len(companies)}")
    assert r.status_code == 200
    assert len(companies) > 0
    target_company = companies[0]["company_id"]
    print(f"Selected Company for Talent Check: {target_company}")

    # 6. Run Talent Check
    print("\n[6] Running Talent Check...")
    r = requests.post(f"{API_URL}/talent-check/?company_id={target_company}", headers=headers)
    print(f"Status: {r.status_code}")
    talent_check = r.json()
    print(f"Response: {talent_check}")
    assert r.status_code == 200
    assert "readiness_score" in talent_check

    # 7. Get Talent Check History
    print("\n[7] Getting Talent Check History...")
    r = requests.get(f"{API_URL}/talent-check/history", headers=headers)
    print(f"Status: {r.status_code}")
    history = r.json()
    print(f"Total Runs: {len(history)}")
    assert r.status_code == 200
    assert len(history) > 0

    print("\n" + "=" * 60)
    print("ALL API ENDPOINTS TESTED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_api()
