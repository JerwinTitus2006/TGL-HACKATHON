import httpx
import json

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def dump_companies():
    res = httpx.get(f"{SUPABASE_URL}/rest/v1/companies", headers=headers)
    if res.status_code == 200:
        data = res.json()
        print("Total rows:", len(data))
        if data:
            all_keys = set()
            for r in data:
                all_keys.update(r.keys())
            print("Total unique keys across all rows:", len(all_keys))
            print("Sorted keys list:")
            print(sorted(list(all_keys)))
            
            with open("C:/Users/Jerwin titus/Desktop/Radix/scripts/supabase_companies_dump.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print("Dumped to supabase_companies_dump.json successfully")
        else:
            print("No rows found")
    else:
        print("Failed to fetch:", res.status_code, res.text)

if __name__ == "__main__":
    dump_companies()
