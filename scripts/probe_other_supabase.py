import httpx
import json

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def probe():
    print("Checking Secondary Supabase connection...")
    common = ["companies", "placement_hub", "skills", "job_roles", "jobs", "placements", "opportunities", "student_skills", "candidate_skills", "candidate", "users", "skills_list", "weaknesses", "tools_technologies", "awards", "uniqueness", "culture"]
    for t in common:
        try:
            res = httpx.get(f"{SUPABASE_URL}/rest/v1/{t}?limit=1", headers=headers)
            if res.status_code != 404:
                print(f"Found Table: '{t}' (Status: {res.status_code})")
                if res.status_code == 200:
                    rows = res.json()
                    if rows:
                        print(f"  Columns: {list(rows[0].keys())}")
                        print(f"  Sample: {json.dumps(rows[0], indent=2)[:300]}")
        except Exception as e:
            print(f"Error on {t}:", e)

if __name__ == "__main__":
    probe()
