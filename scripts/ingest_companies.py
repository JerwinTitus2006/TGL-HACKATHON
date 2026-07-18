import os
import sys
import pandas as pd
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.config import settings
from backend.app.database import Base
from backend.app.models import CompanySkillset

COLUMN_MAP = {
    "coding": "COD",
    "data_structures_and_algorithms": "DSA",
    "object_oriented_programming_and_design": "OOD",
    "aptitude_and_problem_solving": "APTI",
    "communication_skills": "COMM",
    "ai_native_engineering": "AI",
    "devops_and_cloud": "CLOUD",
    "sql_and_design": "SQL",
    "software_engineering": "SWE",
    "system_design_and_architecture": "SYSD",
    "computer_networking": "NETW",
    "operating_system": "OS"
}

def slugify(name: str) -> str:
    """Slugify company name to create a stable identifier."""
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"[\s-]+", "-", name)
    return name

def parse_cell(val) -> tuple[int, str]:
    """Parse cell values like '7-AS' into (7, 'AS')."""
    if pd.isna(val) or not val:
        return 1, "AS"
    
    val_str = str(val).strip()
    match = re.match(r"^(\d+)-([A-Z]{2})$", val_str)
    if match:
        return int(match.group(1)), match.group(2)
        
    # Fallback to just integer if possible
    try:
        level = int(re.search(r"\d+", val_str).group())
        return level, "AS"
    except Exception:
        return 1, "AS"

def main():
    excel_path = "backend/data/skilll_levels_company.xlsx"
    if not os.path.exists(excel_path):
        print(f"Error: Spreadsheet not found at {excel_path}")
        sys.exit(1)
        
    print(f"Reading spreadsheet: {excel_path}")
    df = pd.read_excel(excel_path)
    
    # Verify required column
    if "companies" not in df.columns:
        print("Error: Sheet must contain a 'companies' column.")
        sys.exit(1)
        
    print(f"Found {len(df)} raw company rows.")
    
    # Establish DB session
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    records_inserted = 0
    records_updated = 0
    companies_processed = set()
    
    try:
        for idx, row in df.iterrows():
            company_name = str(row["companies"]).strip()
            if not company_name or pd.isna(row["companies"]):
                continue
                
            company_id = slugify(company_name)
            
            # Deduplicate rows in sheet on normalized name
            if company_id in companies_processed:
                print(f"Row {idx}: Skipping duplicate row for '{company_name}' ({company_id})")
                continue
            companies_processed.add(company_id)
            
            # Delete any existing benchmarks for this company for idempotency
            db.query(CompanySkillset).filter(CompanySkillset.company_id == company_id).delete()
            
            # Insert each skill category benchmark
            for col_name, cat_code in COLUMN_MAP.items():
                if col_name in df.columns:
                    cell_val = row[col_name]
                    level, tier = parse_cell(cell_val)
                    
                    benchmark = CompanySkillset(
                        company_id=company_id,
                        company_name=company_name,
                        category_code=cat_code,
                        required_level=level,
                        required_tier=tier
                    )
                    db.add(benchmark)
                    records_inserted += 1
                    
        db.commit()
        print(f"Successfully ingested benchmark data.")
        print(f"Total Unique Companies: {len(companies_processed)}")
        print(f"Total Skill Benchmarks Inserted: {records_inserted}")
        
    except Exception as e:
        db.rollback()
        print(f"Error during ingestion: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
