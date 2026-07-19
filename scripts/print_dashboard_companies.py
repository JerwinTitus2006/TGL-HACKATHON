import requests

BASE_URL = "http://127.0.0.1:8000"

def get_companies():
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser_unique@karunya.edu.in",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    dash_res = requests.get(f"{BASE_URL}/api/student/dashboard", headers=headers)
    companies = dash_res.json().get("hiring_companies", [])
    print(f"Hiring companies count: {len(companies)}")
    for c in companies:
        print(f"Company ID: {c.get('id')}")
        print(f"  Name: {c.get('name')}")
        print(f"  Type: {c.get('type')}")
        print(f"  Location: {c.get('location')}")
        print(f"  Skills: {c.get('required_skills')}")
        print(f"  Match Percentage: {c.get('match_percentage')}%")

if __name__ == "__main__":
    get_companies()
