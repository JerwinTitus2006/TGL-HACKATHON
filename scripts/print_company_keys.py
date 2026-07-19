import httpx
import json

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def print_company_keys():
    res = httpx.get(f"{SUPABASE_URL}/rest/v1/companies?limit=1", headers=headers)
    if res.status_code == 200:
        data = res.json()
        if data:
            print("Keys in 'companies' table:")
            print(list(data[0].keys()))
            print("\nValues in sample row:")
            for k, v in data[0].items():
                if v and len(str(v)) > 100:
                    print(f"{k}: {str(v)[:100]}...")
                else:
                    print(f"{k}: {v}")
        else:
            print("No data in companies table")
    else:
        print("Failed to fetch companies:", res.status_code, res.text)

if __name__ == "__main__":
    print_company_keys()
