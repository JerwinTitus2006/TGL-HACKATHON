import httpx

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

guesses = [
    "jobs",
    "job_roles",
    "job_postings",
    "placement_data",
    "placement_insights",
    "placement_records",
    "company_profiles",
    "company_skills",
    "requirements",
    "placements_hub",
    "placement_hub_data",
    "skills_list",
    "student_profile"
]

def probe_more():
    for g in guesses:
        try:
            res = httpx.get(f"{SUPABASE_URL}/rest/v1/{g}?limit=1", headers=headers)
            if res.status_code != 404:
                print(f"Found: '{g}' (Status: {res.status_code})")
        except Exception as e:
            print("Error on", g, e)
    print("Done probing extra guesses.")

if __name__ == "__main__":
    probe_more()
