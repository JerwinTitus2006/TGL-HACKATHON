import httpx
import json

SUPABASE_URL = "https://lavcghupigiazgadzcbc.supabase.co"
SUPABASE_KEY = "sb_publishable_IwSIEy353dfc_NCK0aTtoQ_g7I3TDVo"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def dump_companies():
    res = httpx.get(f"{SUPABASE_URL}/rest/v1/companies", headers=headers)
    if res.status_code == 200:
        data = res.json()
        print("Total rows fetched:", len(data))
        if data:
            print("Row names:")
            for idx, r in enumerate(data):
                print(f"{idx+1}. Name: {r.get('name')}, Category: {r.get('category')}, Incorporation: {r.get('incorporation_year')}")
            
            with open("C:/Users/Jerwin titus/Desktop/Radix/scripts/supabase_companies_v2_dump.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print("Successfully dumped all data to supabase_companies_v2_dump.json")
        else:
            print("No rows found")
    else:
        print("Failed to fetch:", res.status_code, res.text)

if __name__ == "__main__":
    dump_companies()
