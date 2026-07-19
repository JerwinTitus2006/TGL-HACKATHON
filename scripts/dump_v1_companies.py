import httpx
import json

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def dump():
    res = httpx.get(f"{SUPABASE_URL}/rest/v1/companies", headers=headers)
    if res.status_code == 200:
        data = res.json()
        print("Total rows fetched from secondary:", len(data))
        if data:
            first_row = data[0]
            print("Keys/Columns in secondary:")
            for k in sorted(first_row.keys()):
                print(f"  {k}")
            with open("C:/Users/Jerwin titus/Desktop/Radix/scripts/supabase_companies_v1_dump.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
    else:
        print("Failed to fetch from secondary:", res.status_code, res.text)

if __name__ == "__main__":
    dump()
