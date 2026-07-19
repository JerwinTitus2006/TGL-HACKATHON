import httpx

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

endpoints = [
    "users",
    "candidates",
    "candidate_skills",
    "hackathons",
    "internships",
    "certifications",
    "documents",
    "extractions",
    "extracted_skills",
    "company_skillsets",
    "talent_checks",
    "skill_matches",
    "skill_embeddings",
    "audit_log",
    "social_connections",
    "github_stats",
    "leetcode_stats",
    "mock_test_sessions",
    "mock_test_questions",
    "mock_test_results",
    "companies",
    "company_applications",
    "student_tests",
    "innovx_opportunities",
    "innovx_applications"
]

def check_all_endpoints():
    print("Probing endpoints...")
    found = []
    for ep in endpoints:
        try:
            res = httpx.get(f"{SUPABASE_URL}/rest/v1/{ep}?limit=1", headers=headers)
            if res.status_code != 404:
                print(f"Endpoint '{ep}' -> Status: {res.status_code}")
                found.append((ep, res.status_code))
            else:
                pass
        except Exception as e:
            print(f"Error on '{ep}':", e)
    print("\nProbing complete. Endpoints found:", found)

if __name__ == "__main__":
    check_all_endpoints()
