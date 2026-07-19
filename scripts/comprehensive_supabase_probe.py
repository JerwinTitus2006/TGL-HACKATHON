import httpx

SUPABASE_URL = "https://lavcghupigiazgadzcbc.supabase.co"
SUPABASE_KEY = "sb_publishable_IwSIEy353dfc_NCK0aTtoQ_g7I3TDVo"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

guesses = [
    # Company related
    "companies", "company", "company_profiles", "company_details", "partners", "hiring_companies", "employers",
    # Job related
    "jobs", "job", "job_roles", "job_postings", "job_listings", "job_openings", "opportunities", "vacancies", "careers", "roles",
    # Skill related
    "skills", "skill", "skills_list", "required_skills", "company_skills", "skillset", "skillsets", "company_skillsets",
    # Student/Candidate related
    "students", "student", "candidates", "candidate", "candidate_profiles", "student_profiles", "profiles", "profile", "users", "user",
    # Placement related
    "placements", "placement", "placement_hub", "placement_data", "placement_records", "placement_insights", "placement_stats",
    # Application related
    "applications", "application", "job_applications", "company_applications", "student_applications", "placement_applications",
    # Hackathon/InnovX related
    "innovx", "innovx_projects", "innovx_opportunities", "innovx_applications", "hackathons", "hackathon", "events", "contests",
    # Test related
    "mock_tests", "mock_test", "questions", "question", "test_sessions", "results", "mock_test_questions", "mock_test_sessions",
    # Social/Portfolio related
    "social_connections", "github_stats", "leetcode_stats", "linked_accounts",
    # Other common naming patterns
    "placement_details", "job_requirements", "company_requirements", "student_details", "candidate_details",
    "interview_experiences", "interviews", "interview", "salaries", "packages", "recruitment", "drives", "placement_drives"
]

def probe_all():
    found = []
    print("Starting comprehensive table probe...")
    for idx, g in enumerate(guesses):
        try:
            res = httpx.get(f"{SUPABASE_URL}/rest/v1/{g}?limit=1", headers=headers)
            if res.status_code != 404:
                print(f"Found Table: '{g}' (Status: {res.status_code})")
                found.append(g)
        except Exception as e:
            pass
    print("\nProbe finished. Found tables:", found)

if __name__ == "__main__":
    probe_all()
