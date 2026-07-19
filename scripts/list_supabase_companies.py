import httpx

SUPABASE_URL = "https://dlwozckkwwuineysmeiz.supabase.co"
SUPABASE_KEY = "sb_publishable_05qcVUg5DD1mwDMdYt4cvw_-5jIqYOE"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def list_companies():
    res = httpx.get(f"{SUPABASE_URL}/rest/v1/companies?select=company_id,name,short_name,category", headers=headers)
    if res.status_code == 200:
        companies = res.json()
        print(f"Total companies found: {len(companies)}")
        for idx, c in enumerate(companies):
            print(f"{idx+1}. ID: {c.get('company_id')}, Name: {c.get('name')}, Short: {c.get('short_name')}, Cat: {c.get('category')}")
    else:
        print("Error fetching:", res.status_code, res.text)

if __name__ == "__main__":
    list_companies()
