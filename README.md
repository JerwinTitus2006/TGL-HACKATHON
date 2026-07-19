# RADIX — Talent Match Platform

> An end-to-end AI-powered talent intelligence platform for campus recruitment. Extracts skills from resumes and job descriptions, semantically matches candidates to roles, benchmarks readiness against top companies, and conducts adaptive mock assessments — all running locally with cloud AI fallbacks.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [AI Pipeline: Document Extraction](#ai-pipeline-document-extraction)
5. [Skill Matching Engine (3-Stage Algorithm)](#skill-matching-engine-3-stage-algorithm)
6. [Vector Embeddings & pgvector](#vector-embeddings--pgvector)
7. [Mock Test Engine](#mock-test-engine)
8. [Models & APIs Used](#models--apis-used)
9. [Environment Variables](#environment-variables)
10. [Project Structure](#project-structure)
11. [Running the Project](#running-the-project)
12. [Database](#database)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        RADIX Platform                          │
├───────────────────┬────────────────────────────────────────────┤
│  Frontend         │  Backend                                   │
│  React + Vite     │  FastAPI (Python)                          │
│  TypeScript       │  SQLAlchemy ORM                            │
│  Port: 5173       │  Port: 8000                                │
├───────────────────┴────────────────────────────────────────────┤
│                    AI Layer (Cascading Fallback)               │
│                                                                │
│  1. OpenRouter API  →  google/gemini-2.5-flash:free            │
│  2. Fallback        →  meta-llama/llama-3.3-70b-instruct:free  │
│  3. Fallback        →  google/gemma-2-9b-it:free               │
│  4. Local Fallback  →  Ollama (nomic-embed-text, qwen2.5)      │
│  5. Last Resort     →  Deterministic regex/keyword parser      │
├────────────────────────────────────────────────────────────────┤
│  Database: SQLite (dev) / PostgreSQL + pgvector (production)   │
└────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS |
| **Backend** | FastAPI, Python 3.11+, Uvicorn |
| **ORM** | SQLAlchemy 2.0 |
| **Database (dev)** | SQLite |
| **Database (prod)** | PostgreSQL + pgvector extension |
| **Vector Embeddings** | Ollama `nomic-embed-text` (768-dim), SQLite JSON fallback |
| **PDF Text Extraction** | pdfminer, pdfplumber |
| **Fuzzy Matching** | RapidFuzz (`token_set_ratio`, `token_sort_ratio`) |
| **AI / LLM** | OpenRouter API (free-tier cascading) |
| **Local LLM** | Ollama (`qwen2.5:14b-instruct`) |
| **Auth** | JWT (HS256), bcrypt password hashing |
| **LeetCode Data** | LeetCode unofficial GraphQL API |
| **Containerisation** | Docker, docker-compose |

---

## Features

### 1. Talent Profile System
- Candidate registration with name, CGPA, branch, year, LinkedIn, GitHub, LeetCode URLs
- Skills stored per candidate with confidence levels (`high`, `medium`, `low`)
- Hackathons, internships, certifications tracked as structured records
- Optimistic concurrency control via `version` column

### 2. Document Upload & AI Extraction
- Upload Resume (PDF) or Job Description (PDF)
- Text extracted from PDF using `pdfminer`/`pdfplumber`
- Sent to LLM with a strict JSON schema prompt for structured extraction
- Extracts: `skills`, `experience`, `education`, `tools`, `soft_skills`, `summary`
- Results cached in `extractions` table — re-uploads of same file reuse the cache (hash-based dedup)
- Deterministic local keyword parser as final fallback when all APIs are unavailable

### 3. Skill Matching Engine (Candidate ↔ JD)
See full details in [Skill Matching Engine section](#skill-matching-engine-3-stage-algorithm)

### 4. Talent Benchmarking
- Compare a candidate's skill profile against predefined company benchmarks (Google, Microsoft, Oracle, etc.)
- Each company has `CompanySkillset` records defining required proficiency level per category (`COD`, `DSA`, `SQL`, `AI`, `CLOUD`, etc.)
- Readiness score computed as weighted match against benchmark

### 5. Mock Test Engine
See full details in [Mock Test Engine section](#mock-test-engine)

### 6. Placement Hub
- Browse companies with hiring status, deadlines, required skills
- One-click apply, track application status
- Company profiles with overview, social links, location

### 7. InnovX (Innovation Exchange)
- Browse and apply to research/innovation opportunities from companies
- Status tracking per application

### 8. System Logs
- Audit log of all major actions (extractions, matches, test submissions)

---

## AI Pipeline: Document Extraction

### Step 1 — PDF to Text
```
PDF file → pdfminer / pdfplumber → raw text string
```

### Step 2 — Prompt Construction
A template from `prompts/resume_extract.txt` or `prompts/jd_extract.txt` is loaded and the raw text is injected. The LLM is instructed to return a **strict JSON object matching a Pydantic schema**.

### Step 3 — LLM Call with 3-Model Cascading Fallback

```
Call 1: google/gemini-2.5-flash:free  (OpenRouter)
           ↓ fails (404/402/timeout)?
Call 2: meta-llama/llama-3.3-70b-instruct:free  (OpenRouter)
           ↓ fails?
Call 3: google/gemma-2-9b-it:free  (OpenRouter)
           ↓ fails?
Call 4: Local Ollama (qwen2.5:14b-instruct)
           ↓ Ollama offline?
Call 5: Deterministic local regex keyword parser (zero network, always works)
```

### Step 4 — JSON Parsing & Persistence
- Response cleaned (removes markdown code fences)
- Validated against Pydantic schema (`ResumeExtractSchema` / `JDExtractSchema`)
- Saved as `Extraction` + `ExtractedSkill` rows in the database
- Duplicate files detected by SHA-256 hash — existing extraction returned immediately without re-processing

---

## Skill Matching Engine (3-Stage Algorithm)

When a candidate is matched against a JD, every JD skill goes through **3 stages** in order. If matched at any stage, it doesn't proceed to the next.

### Stage 1 — Exact Match
```python
normalize_skill(jd_skill) == normalize_skill(candidate_skill)
```
- Both skill names are lowercased, stripped, and simple plurals removed
- Fast O(n) string comparison

### Stage 2 — Fuzzy Match (RapidFuzz)
```python
fuzz.token_sort_ratio(jd_skill_norm, candidate_skill_norm) >= 85
```
- Uses `token_sort_ratio` — splits skills into tokens, sorts them, then compares
- Catches reordering: `"Machine Learning Engineer"` matches `"Engineer Machine Learning"`
- Threshold: **≥85** similarity score

### Stage 3 — Semantic Match (3-way fallback)

**3a. Ollama Vector Embeddings** (primary)
```
jd_skill → nomic-embed-text → 768-dim vector
candidate_skill → nomic-embed-text (cached) → 768-dim vector
cosine_similarity(jd_vec, cand_vec) >= 0.70 → MATCH
```
Embeddings are cached in the `skill_embeddings` table (SQLite JSON or pgvector). A 1-second pre-flight ping checks if Ollama is alive before attempting this.

**3b. OpenRouter LLM Batch Match** (if Ollama is offline)
```
Send both skill lists to google/gemini-2.5-flash:free
Ask: "Which JD skills semantically match which candidate skills?"
Returns: {"JD Skill": "Candidate Skill"} JSON mapping
```

**3c. Local RapidFuzz + Synonyms** (if OpenRouter also fails)
```
Hardcoded synonym map: {"js": "javascript", "ml": "machine learning", ...}
+ Word inclusion check: "React" in "ReactJS" → match
+ fuzz.token_set_ratio >= 75 → match
```

### Score Calculation
```
Required skills matched: 70% weight
Nice-to-have skills matched: 30% weight
Final Score = (0.7 × required_match% + 0.3 × nicetohave_match%) × 100
```

---

## Vector Embeddings & pgvector

### Model
- **`nomic-embed-text`** via local Ollama
- Produces **768-dimensional** float vectors
- Accessed at `http://localhost:11434/api/embeddings`

### Storage: Dual-mode (SQLite ↔ PostgreSQL)

```python
class SQLiteOrPostgresVector(TypeDecorator):
    # PostgreSQL + pgvector: stores as native VECTOR(768) column
    # SQLite (dev): stores as JSON array of floats
    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and PG_VECTOR_AVAILABLE:
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(JSON())
```

### Caching
Every skill embedding is cached in the `skill_embeddings` table. On subsequent requests, the cached vector is returned immediately without calling Ollama. This makes repeated matching near-instant.

### Similarity
Pure Python cosine similarity (no external lib needed):
```python
dot_product / (norm_v1 × norm_v2)
```
Threshold for a semantic match: **≥ 0.70**

---

## Mock Test Engine

### Test Types
- `coding_only` — LeetCode coding problems only
- `mcq_coding` — MCQ questions (Aptitude, Logical, Verbal, Technical) + Coding problems

### Question Generation

**MCQ Questions** — generated by LLM via OpenRouter:
- Prompt sent to `openrouter/free` to generate aptitude, logical, verbal, or technical MCQs
- Returns: question text, 4 options, correct answer, explanation
- 3-model fallback same as extraction pipeline

**Coding Problems** — fetched from LeetCode:
- Company-specific: uses LeetCode GraphQL API to fetch problems tagged to the target company
- Difficulty-based: fetches EASY/MEDIUM/HARD problems if no company specified
- On-demand fetching per question (not at session start) to avoid timeouts

### Submission & AI Evaluation

When the student submits:
1. MCQ answers compared directly to `correct_answer` field
2. Coding submissions sent to `openrouter/free` with the problem description and user code:

```
"Evaluate this code for problem: {title}. Score 0–10. Return JSON:
{has_code, score, passed_test_cases, total_test_cases, feedback}"
```

Same 3-model cascade applies. If all models fail, **self-healing default scores** are assigned (partial credit, 4/5 test cases passed) so the test always completes.

### Scoring
```
MCQ:    1 point per correct answer
Coding: 0–10 points per problem (AI-evaluated)
Total:  MCQ score + Coding score
```

### Score Sheet
After submission, the frontend shows:
- Total score / max score (circular progress ring)
- MCQ vs Coding breakdown (comparison bar chart)
- Category mastery radar chart (Aptitude, Logical, Verbal, Technical, Coding)
- Weak areas identified
- AI-generated practice recommendations

---

## Models & APIs Used

| Feature | Model / Service |
|---|---|
| Resume & JD extraction (primary) | `google/gemini-2.5-flash:free` via OpenRouter |
| Extraction fallback 1 | `meta-llama/llama-3.3-70b-instruct:free` via OpenRouter |
| Extraction fallback 2 | `google/gemma-2-9b-it:free` via OpenRouter |
| Extraction fallback 3 (local) | `qwen2.5:14b-instruct` via Ollama |
| Extraction fallback 4 (no AI) | Deterministic regex keyword parser |
| Semantic skill embedding | `nomic-embed-text` (768-dim) via Ollama |
| Semantic match fallback (LLM) | `google/gemini-2.5-flash:free` via OpenRouter |
| Semantic match fallback (local) | RapidFuzz + synonym map |
| MCQ generation | `openrouter/free` (auto-routed free model) |
| Code evaluation | `openrouter/free` → `meta-llama` → `gemma-2-9b` |
| LeetCode problems | LeetCode GraphQL API (unofficial, no key needed) |
| PDF text extraction | `pdfminer`, `pdfplumber` (Python libraries) |
| Fuzzy string match | `rapidfuzz` — token_sort_ratio, token_set_ratio |
| Authentication | JWT (HS256) via `python-jose`, bcrypt via `passlib` |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ─────────────────────────────────────────────
# Required: OpenRouter API Key (free tier works)
# Get one at: https://openrouter.ai/keys
# ─────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx

# ─────────────────────────────────────────────
# Database
# Dev: SQLite (default, no setup needed)
# Prod: PostgreSQL with pgvector extension
# ─────────────────────────────────────────────
DATABASE_URL=sqlite:///./radix.db
# DATABASE_URL=postgresql://user:password@localhost:5432/radix

# ─────────────────────────────────────────────
# Local Ollama (optional — used for embeddings)
# Install: https://ollama.ai
# Run:     ollama pull nomic-embed-text
#          ollama pull qwen2.5:14b-instruct
# ─────────────────────────────────────────────
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b-instruct
OLLAMA_EMBED_MODEL=nomic-embed-text

# ─────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────
JWT_SECRET=your-secret-key-here
LLM_MAX_TOKENS=4000

# ─────────────────────────────────────────────
# Optional: Supabase (for production storage)
# ─────────────────────────────────────────────
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

> **Minimum requirement**: Only `OPENROUTER_API_KEY` is needed. Everything else has defaults. Ollama is optional — the system degrades gracefully to OpenRouter or local regex fallback.

---

## Project Structure

```
Radix/
├── backend/
│   └── app/
│       ├── main.py                  # FastAPI app, CORS, routers
│       ├── config.py                # Settings from .env
│       ├── database.py              # SQLAlchemy engine, PRAGMA foreign_keys=ON
│       ├── models.py                # All ORM models (User, Candidate, Extraction, etc.)
│       ├── schemas.py               # Pydantic request/response schemas
│       ├── routers/
│       │   ├── auth.py              # Login, register, JWT refresh
│       │   ├── documents.py         # PDF upload, extraction trigger
│       │   ├── profiles.py          # Candidate CRUD
│       │   ├── skill_match.py       # JD↔Candidate matching
│       │   ├── talent_check.py      # Company benchmark scoring
│       │   ├── mock_test_routes.py  # Mock test start/submit/results
│       │   └── student_routes.py    # Student dashboard, companies, InnovX
│       └── services/
│           ├── extraction_service.py # PDF→LLM→JSON extraction pipeline
│           ├── match_service.py      # 3-stage skill matching algorithm
│           ├── mock_test.py          # Test session, MCQ+coding evaluation
│           ├── question_bank.py      # LLM-based MCQ generation
│           ├── leetcode_service.py   # LeetCode GraphQL API client
│           ├── scoring_service.py    # Talent benchmark scoring
│           ├── ai_service.py         # Shared OpenRouter LLM client
│           └── profile_service.py   # Candidate profile management
├── frontend/
│   └── src/
│       └── App.tsx                  # Single-file React app (~3900 lines)
├── prompts/
│   ├── resume_extract.txt           # Resume extraction prompt template
│   └── jd_extract.txt               # JD extraction prompt template
├── samples/
│   ├── Resumes/PDF/                 # Sample resumes for testing
│   └── JDs/PDF/                     # Sample job descriptions for testing
├── tests/
│   └── run_regression_suite.py      # End-to-end regression suite
├── docs/
│   └── regression_results.md        # Latest regression run results
├── run.bat                          # Windows control panel (start/stop/test)
├── docker-compose.yml               # Full stack: FastAPI + PostgreSQL + Ollama + Nginx
└── .env                             # Environment variables (not committed)
```

---

## Running the Project

### Option 1: Windows Control Panel (Recommended)

```bat
run.bat
```

Choose from the menu:
- `[1]` Start Full Stack (Local Dev) — starts backend + frontend in separate windows
- `[3]` Initialize Database (seed companies & benchmarks)
- `[4]` Run Automated Regression Test Suite
- `[7]` Install Dependencies

### Option 2: Manual

```bash
# Backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Option 3: Docker Compose

```bash
docker-compose up --build
```

Spins up: FastAPI → PostgreSQL (with pgvector) → Ollama → Nginx reverse proxy

---

## Database

### Development (SQLite)
- Zero setup, file-based: `radix.db` in project root
- Vector columns stored as JSON arrays
- `PRAGMA foreign_keys=ON` enforced on every connection via SQLAlchemy event listener

### Production (PostgreSQL + pgvector)
- Set `DATABASE_URL=postgresql://...` in `.env`
- Install the pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- Vector columns automatically use native `VECTOR(768)` type for fast ANN search
- All tables created automatically on startup via `Base.metadata.create_all()`

### Key Tables

| Table | Purpose |
|---|---|
| `users` | Auth credentials, roles |
| `candidates` | Profile: CGPA, branch, socials |
| `candidate_skills` | Skills with confidence levels |
| `documents` | Uploaded PDFs with SHA-256 hash for dedup |
| `extractions` | LLM-parsed document results |
| `extracted_skills` | Per-skill rows from a document |
| `skill_matches` | Candidate↔JD match results |
| `skill_embeddings` | Cached 768-dim vectors per skill name |
| `talent_checks` | Company benchmark readiness scores |
| `company_skillsets` | Per-company required proficiency benchmarks |
| `mock_test_sessions` | Active/completed test sessions |
| `mock_test_questions` | Questions + user answers per session |
| `mock_test_results` | Final scores, breakdown, recommendations |
| `companies` | Company profiles, hiring status |
| `innovx_opportunities` | Research/innovation postings |
| `audit_log` | System-wide action audit trail |

---

## Regression Testing

```bash
python tests/run_regression_suite.py
```

Runs the full automated suite:
1. Extracts all 4 sample resumes
2. Extracts all 6 sample JDs
3. Runs talent benchmarking for each candidate × Google/Microsoft/Oracle
4. Runs 24 skill match combinations (4 candidates × 6 JDs)
5. Saves results to `docs/regression_results.md`

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **3-model cascade for LLM calls** | Free-tier models have rate limits and outages; cascading guarantees availability |
| **Local regex fallback** | Network-independent guarantee — the system always produces a result |
| **Embedding cache in DB** | Avoids repeated Ollama calls for the same skill name; makes matching fast after warmup |
| **Hash-based document dedup** | Same resume uploaded twice reuses the existing extraction instantly |
| **Dual vector type (JSON/pgvector)** | Seamless dev (SQLite) to prod (PostgreSQL) migration without code changes |
| **On-demand LeetCode fetch** | Fetching questions at session start caused timeouts; questions now fetched per-question |
| **`PRAGMA foreign_keys=ON`** | Enforced via SQLAlchemy event listener on every SQLite connection |
| **`openrouter/free` routing** | Auto-selects the best available free model; avoids hardcoding a specific free model slug |
