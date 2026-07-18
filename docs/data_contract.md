# RADIX Talent Match - Data Contracts

This document outlines the locked data contracts (schemas) for the RADIX Talent Match platform.

## 1. Skill Category Codes (12 RADIX Skillsets)

We map the skill categories to the following 3-letter or 4-letter uppercase codes:

| Code | Name |
|---|---|
| **COD** | Coding |
| **DSA** | Data Structures & Algorithms |
| **OOD** | Object-Oriented Programming & Design |
| **APTI** | Aptitude & Problem Solving |
| **COMM** | Communication Skills |
| **AI** | AI-Native Engineering |
| **CLOUD** | DevOps & Cloud |
| **SQL** | SQL & Data Design |
| **SWE** | Software Engineering |
| **SYSD** | System Design & Architecture |
| **NETW** | Computer Networking |
| **OS** | Operating Systems |
| **OTHER** | Anything outside the 12 (named technologies, tools, domain skills) |

## 2. JSON Schemas

### 2.1 Single Skill Object
```json
{
  "skill_name": "string",
  "category_code": "DSA|COD|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER",
  "evidence": "short quote or reason, max 200 chars",
  "confidence": "high|medium|low"
}
```

### 2.2 JD Analytics / Resume Parsing Output
```json
{
  "schema_version": "1.0",
  "source_type": "jd|resume",
  "source_file": "string",
  "source_hash": "string (sha256)",
  "company": "string|null",
  "role": "string|null",
  "extracted_at": "string (ISO 8601)",
  "skills": [
    {
      "skill_name": "string",
      "category_code": "string",
      "evidence": "string",
      "confidence": "string",
      "priority": "required|nice_to_have"
    }
  ],
  "raw_text_ref": "string"
}
```

*Note: For JD extraction, skills include a `priority` field indicating whether it is `required` or `nice_to_have` based on the JD text.*

For Resume parsing, the following additional structured profile fields are returned:
```json
{
  "candidate_name": "string|null",
  "email": "string|null",
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string"
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string"
    }
  ],
  "experience": [
    {
      "role": "string",
      "org": "string",
      "duration": "string"
    }
  ]
}
```

### 2.3 Candidate Profile (System of Record)
```json
{
  "schema_version": "1.0",
  "candidate_id": "uuid",
  "name": "string",
  "email": "string",
  "education": "string",
  "skills": [],
  "hackathons": [
    {
      "name": "string",
      "result": "string",
      "year": "string"
    }
  ],
  "internships": [
    {
      "org": "string",
      "role": "string",
      "duration": "string"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "year": "string"
    }
  ],
  "preferred_roles": ["string"],
  "cv_file": "string (storage reference)",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)",
  "version": "integer"
}
```

### 2.4 Talent Check Output
```json
{
  "schema_version": "1.0",
  "candidate_id": "uuid",
  "company": "string",
  "skillset_gap": [
    {
      "category_code": "string",
      "required_level": 7,
      "required_tier": "AS",
      "candidate_level": 5,
      "gap": true,
      "gap_size": 2
    }
  ],
  "readiness_score": 85,
  "computed_at": "string (ISO 8601)"
}
```

### 2.5 Skill Matching Output
```json
{
  "schema_version": "1.0",
  "candidate_id": "uuid",
  "jd_source_file": "string",
  "match_score": 82,
  "matched_skills": [
    {
      "skill_name": "string",
      "category_code": "string",
      "match_type": "exact|fuzzy|semantic"
    }
  ],
  "missing_skills": [
    {
      "skill_name": "string",
      "category_code": "string",
      "importance": "required|nice_to_have"
    }
  ],
  "computed_at": "string (ISO 8601)"
}
```
