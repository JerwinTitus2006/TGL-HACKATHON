import json

with open("C:/Users/Jerwin titus/Desktop/Radix/scripts/supabase_companies_v2_dump.json", "r", encoding="utf-8") as f:
    data = json.load(f)

if data:
    print("Number of rows:", len(data))
    first_row = data[0]
    print("Keys/Columns:")
    for k in sorted(first_row.keys()):
        val_summary = str(first_row[k])[:80] if first_row[k] is not None else "None"
        print(f"  {k}: {val_summary}")
else:
    print("Dump is empty")
