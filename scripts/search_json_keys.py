import json

with open("C:/Users/Jerwin titus/Desktop/Radix/scripts/supabase_companies_v2_dump.json", "r", encoding="utf-8") as f:
    data = json.load(f)

keywords = ["culture", "weak", "award", "tool", "tech", "adopt", "unique"]
found_keys = set()
for r in data:
    for k, v in r.items():
        if any(kw in k.lower() for kw in keywords):
            found_keys.add(k)
        if isinstance(v, str) and any(kw in v.lower() for kw in keywords):
            found_keys.add(f"{k} (value match)")

print("Matching keys/columns:")
for fk in sorted(found_keys):
    print("  ", fk)
