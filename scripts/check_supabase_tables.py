import httpx
import json

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

tables = [
    "companies",
    "company",
    "placement_hub",
    "skills",
    "candidate_skills",
    "student_skills",
    "placements",
    "opportunities"
]

def check_tables():
    print("Querying specific tables...")
    for t in tables:
        try:
            res = httpx.get(f"{SUPABASE_URL}/rest/v1/{t}?limit=3", headers=headers)
            print(f"Table '{t}' -> Status: {res.status_code}")
            if res.status_code == 200:
                rows = res.json()
                print(f"  Rows count: {len(rows)}")
                if rows:
                    print(f"  Sample row: {json.dumps(rows[0], indent=2)}")
            else:
                print(f"  Response: {res.text}")
        except Exception as e:
            print(f"  Error on '{t}':", e)

if __name__ == "__main__":
    check_tables()
