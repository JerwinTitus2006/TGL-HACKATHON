import os
import sys
import uuid
import datetime
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.config import settings
from backend.app.database import Base, engine, SessionLocal
from backend.app.models import User, Candidate, Document, Extraction
from backend.app.services.extraction_service import ExtractionService
from backend.app.services.profile_service import ProfileService
from backend.app.services.scoring_service import ScoringService
from backend.app.services.match_service import MatchService
from backend.app.utils.storage import compute_hash

# Using local Ollama configuration defined in settings

RESUME_DIR = "samples/Resumes/PDF"
JD_DIR = "samples/JDs/PDF"

def run_regression():
    print("=" * 60)
    print("RADIX TALENT MATCH - AUTOMATED REGRESSION SUITE")
    print("=" * 60)

    # Initialize db connection
    db = SessionLocal()
    Base.metadata.create_all(bind=engine)

    # 1. Ensure we have a test user and candidate profile setup
    user = db.query(User).filter(User.email == "test_regression@radix.com").first()
    if not user:
        user = User(email="test_regression@radix.com", hashed_password="mocked_hashed_password", role="candidate")
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Extract and Process the 4 Resumes
    resume_files = [f for f in os.listdir(RESUME_DIR) if f.endswith(".pdf")]
    print(f"Found {len(resume_files)} sample resumes to process.")
    
    candidates_data = {}

    for rf in resume_files:
        r_path = os.path.join(RESUME_DIR, rf)
        candidate_name = os.path.splitext(rf)[0]
        cand_email = f"{candidate_name.lower().replace(' ', '_')}@radix.com"
        
        # Ensure we have a unique user for this candidate
        cand_user = db.query(User).filter(User.email == cand_email).first()
        if not cand_user:
            cand_user = User(email=cand_email, hashed_password="mocked_hashed_password", role="candidate")
            db.add(cand_user)
            db.commit()
            db.refresh(cand_user)

        # Calculate file hash
        with open(r_path, "rb") as f:
            f_hash = compute_hash(f.read())

        # Check if doc exists
        doc = db.query(Document).filter(Document.source_hash == f_hash).first()
        if not doc:
            doc = Document(
                owner_id=cand_user.id,
                doc_type="resume",
                source_file_name=rf,
                source_hash=f_hash,
                storage_ref=r_path,
                uploaded_at=datetime.datetime.utcnow()
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            
        print(f"\nProcessing Resume: {candidate_name}...")
        try:
            extraction = ExtractionService.extract_document(db, doc.id)
            print(f"  -> Extracted {len(extraction.skills)} skills.")
            
            candidate = db.query(Candidate).filter(Candidate.email == cand_email).first()
            if candidate:
                # Clear candidate to simulate fresh merge
                db.delete(candidate)
                db.commit()

            # Initialize profile
            from backend.app.schemas import CandidateProfileCreate
            profile_data = CandidateProfileCreate(
                name=candidate_name,
                email=cand_email,
                education="Loaded from resume",
                skills=[]
            )
            candidate = ProfileService.create_profile(db, cand_user.id, profile_data)
            
            # Merge extracted skills into this candidate
            candidate = ProfileService.merge_resume_extraction(db, candidate.id, extraction.id)
            print(f"  -> Created profile with {len(candidate.skills)} merged skills.")
            candidates_data[candidate_name] = candidate.id
            
        except Exception as e:
            db.rollback()
            print(f"  -> ERROR processing resume {rf}: {e}")

    # 3. Extract and Process the 6 Job Descriptions
    jd_files = [f for f in os.listdir(JD_DIR) if f.endswith(".pdf")]
    print(f"\nFound {len(jd_files)} sample Job Descriptions to process.")
    
    jds_data = {}

    for jdf in jd_files:
        jd_path = os.path.join(JD_DIR, jdf)
        jd_name = os.path.splitext(jdf)[0]
        
        with open(jd_path, "rb") as f:
            f_hash = compute_hash(f.read())

        doc = db.query(Document).filter(Document.source_hash == f_hash).first()
        if not doc:
            doc = Document(
                owner_id=user.id,
                doc_type="jd",
                source_file_name=jdf,
                source_hash=f_hash,
                storage_ref=jd_path,
                uploaded_at=datetime.datetime.utcnow()
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            
        print(f"Processing JD: {jd_name}...")
        try:
            extraction = ExtractionService.extract_document(db, doc.id)
            print(f"  -> Extracted {len(extraction.skills)} skills from JD.")
            jds_data[jd_name] = extraction.id
        except Exception as e:
            db.rollback()
            print(f"  -> ERROR processing JD {jdf}: {e}")

    # 4. Perform Talent Check for each Candidate
    print("\n" + "=" * 50)
    print("RUNNING TALENT CHECKS (Benchmarking against target companies)")
    print("=" * 50)
    
    # We will test Google, Microsoft, and Oracle
    companies_to_test = ["google-llc", "microsoft", "oracle-corporation"]
    
    # Seed target companies if they do not exist
    from backend.app.models import Company, CompanySkillset
    
    target_companies = {
        "google-llc": {
            "name": "Google LLC",
            "type": "Super Dream",
            "location": "Mountain View, CA",
            "logo": "G",
            "required_skills": {"Data Structures": 9, "Algorithms": 9, "System Design": 9, "Python": 8},
            "benchmarks": {
                "COD": (9, "Super Dream"), "DSA": (9, "Super Dream"), "OOD": (8, "Super Dream"), "APTI": (9, "Super Dream"),
                "COMM": (7, "Dream"), "AI": (8, "Super Dream"), "CLOUD": (8, "Super Dream"), "SQL": (7, "Dream"),
                "SWE": (8, "Super Dream"), "SYSD": (9, "Super Dream"), "NETW": (7, "Dream"), "OS": (8, "Super Dream")
            }
        },
        "microsoft": {
            "name": "Microsoft",
            "type": "Super Dream",
            "location": "Redmond, WA",
            "logo": "M",
            "required_skills": {"Data Structures": 8, "Algorithms": 8, "System Design": 8, "C#": 8},
            "benchmarks": {
                "COD": (8, "Super Dream"), "DSA": (8, "Super Dream"), "OOD": (9, "Super Dream"), "APTI": (8, "Super Dream"),
                "COMM": (8, "Super Dream"), "AI": (7, "Dream"), "CLOUD": (8, "Super Dream"), "SQL": (8, "Super Dream"),
                "SWE": (8, "Super Dream"), "SYSD": (8, "Super Dream"), "NETW": (8, "Super Dream"), "OS": (8, "Super Dream")
            }
        },
        "oracle-corporation": {
            "name": "Oracle Corporation",
            "type": "Super Dream",
            "location": "Austin, TX",
            "logo": "O",
            "required_skills": {"Data Structures": 8, "SQL": 9, "Java": 8},
            "benchmarks": {
                "COD": (8, "Super Dream"), "DSA": (8, "Super Dream"), "OOD": (8, "Super Dream"), "APTI": (8, "Super Dream"),
                "COMM": (7, "Dream"), "AI": (6, "Dream"), "CLOUD": (7, "Dream"), "SQL": (9, "Super Dream"),
                "SWE": (8, "Super Dream"), "SYSD": (8, "Super Dream"), "NETW": (7, "Dream"), "OS": (8, "Super Dream")
            }
        }
    }
    
    for comp_slug, comp_data in target_companies.items():
        # Check if Company exists
        comp = db.query(Company).filter(Company.id == comp_slug).first()
        if not comp:
            print(f"Seeding missing Company record for {comp_data['name']} ({comp_slug})...")
            comp = Company(
                id=comp_slug,
                name=comp_data["name"],
                type=comp_data["type"],
                location=comp_data["location"],
                is_hiring=True,
                deadline="2026-12-31",
                logo=comp_data["logo"],
                required_skills=comp_data["required_skills"]
            )
            db.add(comp)
            db.commit()
            
        # Check if CompanySkillset benchmarks exist
        count = db.query(CompanySkillset).filter(CompanySkillset.company_id == comp_slug).count()
        if count == 0:
            print(f"Seeding missing benchmarks for {comp_data['name']} ({comp_slug})...")
            for cat_code, (level, tier) in comp_data["benchmarks"].items():
                benchmark = CompanySkillset(
                    company_id=comp_slug,
                    company_name=comp_data["name"],
                    category_code=cat_code,
                    required_level=level,
                    required_tier=tier
                )
                db.add(benchmark)
            db.commit()
            
    # Check if companies exist in DB
    existing_companies = [c[0] for c in db.query(CompanySkillset.company_id).distinct().all()]
    print(f"Available companies in database: {len(existing_companies)}")
    
    # Let's map target companies to database keys
    # Standard slugified names: google-llc, microsoft, oracle-corporation
    target_slugs = []
    for target in ["google", "microsoft", "oracle"]:
        match = [slug for slug in existing_companies if target in slug]
        if match:
            target_slugs.append(match[0])
            
    print(f"Targeting companies for test: {target_slugs}")
    
    talent_check_results = []
    for cand_name, cand_id in candidates_data.items():
        for comp_slug in target_slugs:
            try:
                check = ScoringService.compute_talent_check(db, cand_id, comp_slug)
                print(f"Candidate: {cand_name} | Company: {comp_slug} | Readiness: {check.readiness_score}%")
                talent_check_results.append({
                    "Candidate": cand_name,
                    "Company": comp_slug,
                    "Readiness Score": f"{check.readiness_score}%"
                })
            except Exception as e:
                db.rollback()
                print(f"  -> Failed Talent Check for {cand_name} at {comp_slug}: {e}")

    # 5. Perform Skill Matches for all 24 pairs
    print("\n" + "=" * 50)
    print("RUNNING SKILL MATCHES (24 Candidate x JD Combinations)")
    print("=" * 50)
    
    match_results = []
    for cand_name, cand_id in candidates_data.items():
        for jd_name, ext_id in jds_data.items():
            try:
                match_record = MatchService.match_candidate_to_jd(db, cand_id, ext_id)
                print(f"Candidate: {cand_name} | JD: {jd_name} | Score: {match_record.match_score}%")
                match_results.append({
                    "Candidate": cand_name,
                    "Job Description": jd_name,
                    "Match Score": f"{match_record.match_score}%",
                    "Matched Skills": len(match_record.matched_skills),
                    "Missing Skills": len(match_record.missing_skills)
                })
            except Exception as e:
                db.rollback()
                print(f"  -> Failed Match for {cand_name} with {jd_name}: {e}")

    # 6. Output Markdown Report Summary
    print("\nSaving results report...")
    report_path = "docs/regression_results.md"
    os.makedirs("docs", exist_ok=True)
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# RADIX Talent Match - Regression Suite Results\n\n")
        f.write(f"**Run Date:** {datetime.datetime.utcnow().isoformat()} UTC\n\n")
        
        f.write("## 1. Talent Check Benchmarking\n\n")
        tc_df = pd.DataFrame(talent_check_results)
        f.write(tc_df.to_markdown(index=False) + "\n\n")
        
        f.write("## 2. Skill Matches (Candidate x Job Description)\n\n")
        sm_df = pd.DataFrame(match_results)
        f.write(sm_df.to_markdown(index=False) + "\n\n")
        
    print(f"Regression results saved to {report_path}")
    print("\nRegression suite completed successfully!")
    print("=" * 60)
    db.close()

if __name__ == "__main__":
    run_regression()
