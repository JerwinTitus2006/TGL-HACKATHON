import httpx
import json

SUPABASE_URL = "https://lavcghupigiazgadzcbc.supabase.co"
SUPABASE_KEY = "sb_publishable_IwSIEy353dfc_NCK0aTtoQ_g7I3TDVo"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def check_supabase():
    print("Checking Supabase connection...")
    try:
        # Fetch Swagger schema if possible, or try common tables
        res = httpx.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
        print("Schema status:", res.status_code)
        if res.status_code == 200:
            schema = res.json()
            definitions = schema.get("definitions", {})
            print("Tables found in schema:")
            for table_name in definitions.keys():
                print(f"- {table_name}")
                properties = definitions[table_name].get("properties", {})
                cols = list(properties.keys())
                print(f"  Columns: {cols}")
                
                try:
                    data_res = httpx.get(f"{SUPABASE_URL}/rest/v1/{table_name}?limit=3", headers=headers)
                    if data_res.status_code == 200:
                        rows = data_res.json()
                        print(f"  Sample Rows count: {len(rows)}")
                        if rows:
                            print(f"  Sample: {json.dumps(rows[0], indent=2)[:500]}")
                    else:
                        print(f"  Failed to fetch rows: {data_res.status_code}")
                except Exception as ex:
                    print("  Error fetching rows:", ex)
        else:
            print("Failed to fetch schema. Querying common tables...")
            probe_tables()
    except Exception as e:
        print("Error checking Supabase:", e)

def probe_tables():
    common = ["companies", "placement_hub", "skills", "job_roles", "jobs", "placements", "opportunities", "student_skills", "candidate_skills", "candidate", "users"]
    for t in common:
        try:
            res = httpx.get(f"{SUPABASE_URL}/rest/v1/{t}?limit=1", headers=headers)
            if res.status_code != 404:
                print(f"Found Table: '{t}' (Status: {res.status_code})")
                if res.status_code == 200:
                    rows = res.json()
                    if rows:
                        print(f"  Columns: {list(rows[0].keys())}")
                        print(f"  Sample: {json.dumps(rows[0], indent=2)[:500]}")
            else:
                pass
        except Exception as e:
            print(f"Error on {t}:", e)

if __name__ == "__main__":
    check_supabase()
