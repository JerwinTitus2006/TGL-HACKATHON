import httpx
import json

SUPABASE_URL = "https://lavcghupigiazgadzcbc.supabase.co"
SUPABASE_KEY = "sb_publishable_IwSIEy353dfc_NCK0aTtoQ_g7I3TDVo"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def get_schema():
    res = httpx.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
    if res.status_code == 200:
        data = res.json()
        print("Keys in schema definition:", list(data.keys()))
        paths = data.get("paths", {})
        print("Endpoints (tables):")
        for path in paths:
            if path.startswith("/"):
                print("  ", path)
    else:
        print("Failed to fetch schema:", res.status_code, res.text)

if __name__ == "__main__":
    get_schema()
