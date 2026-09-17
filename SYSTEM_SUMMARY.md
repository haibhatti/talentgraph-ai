# TalentGraph AI — Exhaustive System Summary
**Version:** Production-Ready (September 2026)
**Document Purpose:** Complete, context-transferable state of the TalentGraph AI system. Copy-paste this into any AI session to instantly restore full architectural context.

---

## 1. Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend** | Next.js | 14 (App Router, `"use client"` pattern) |
| **Styling** | Tailwind CSS v4 | `@import "tailwindcss"` (no config file needed) |
| **UI Icons** | Lucide React | via npm |
| **Auth** | Supabase Auth | Google OAuth, JWT tokens |
| **Supabase Client** | `@supabase/ssr` | `createBrowserClient` / `createServerClient` |
| **Backend** | FastAPI (Python) | Uvicorn ASGI, `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000` |
| **ORM** | SQLAlchemy | `declarative_base`, `SessionLocal` pattern |
| **Database** | SQLite (local dev) | File: `backend/talentgraph.db` — falls back from Supabase PostgreSQL |
| **AI Orchestration** | LangGraph | `StateGraph`, `START`, `END` |
| **LLM** | Groq API | Model: `openai/gpt-oss-120b`, via `langchain_groq.ChatGroq` |
| **PDF Extraction** | pdfplumber | POST `/api/v1/upload-resume` |
| **PDF Export** | html2pdf.js | Client-side dynamic import, outputs `Candidate_Evaluation.pdf` |
| **Digital Footprint** | DuckDuckGo Search | `duckduckgo_search` library, `DDGS` class |
| **Data Validation** | Pydantic v2 | `BaseModel`, `model_dump()`, `model_validate()` |
| **Font** | Inter (Google Fonts) | CSS variable: `--font-inter`, loaded via `next/font/google` |

### Environment Variables
**`backend/.env`:**
```
GROQ_API_KEY=<groq_api_key>
DATABASE_URL=<optional_postgres_url>  # Falls back to SQLite if absent or Supabase URL
```
**`frontend/.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

---

## 2. Database Schema

### Table: `job_requisitions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, auto-increment | |
| `user_id` | VARCHAR | NOT NULL, indexed | Supabase Auth user UUID |
| `title` | VARCHAR | NOT NULL, indexed | Job title |
| `description` | TEXT | NOT NULL | Full job description |
| `required_skills` | JSON | default `[]` | Array of skill strings |
| `nice_to_have_skills` | JSON | default `[]` | Array of skill strings |
| `created_at` | DATETIME | server_default=now() | UTC timestamp |

**Seeded on startup (if empty):**
- "Senior Backend Engineer" (Python, FastAPI, PostgreSQL, Docker)
- "Frontend Developer" (React, TypeScript, Next.js, TailwindCSS)
- "Technical Product Manager" (Product Strategy, Agile, API Design)

### Table: `evaluations`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, auto-increment | |
| `user_id` | VARCHAR | NOT NULL, indexed | Supabase user UUID |
| `job_requisition_id` | INTEGER | FK → `job_requisitions.id`, nullable | |
| `anonymized_id` | VARCHAR | nullable | **Always NULL** — anonymization removed |
| `candidate_name` | VARCHAR | | Real name extracted by Resume Analyzer agent |
| `status` | VARCHAR | default `"completed"` | |
| `score` | FLOAT | default `0.0` | Job fit score 0–100 |
| `verdict` | VARCHAR | | `STRONG HIRE` / `HIRE` / `LEAN HIRE` / `RE-EVALUATE` |
| `forensic_confidence_score` | FLOAT | nullable | DuckDuckGo verification score |
| `alternative_matches` | JSON | default `[]` | Array of `{job_title, job_id, match_score}` |
| `full_dossier` | JSON | | Full `FinalCandidateDossier` blob (see schema below) |
| `created_at` | DATETIME | server_default=now() | UTC timestamp |

### Table: `applications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | |
| `job_requisition_id` | INTEGER | FK → `job_requisitions.id`, NOT NULL | |
| `candidate_name` | VARCHAR | NOT NULL | Self-reported by candidate |
| `candidate_email` | VARCHAR | NOT NULL | Unique per requisition |
| `resume_text` | TEXT | NOT NULL | Extracted text from PDF |
| `status` | VARCHAR | default `"Pending"` | `"Pending"` → `"Evaluated"` |
| `evaluation_id` | INTEGER | FK → `evaluations.id`, nullable | Set after evaluation |
| `created_at` | DATETIME | server_default=now() | |

---

## 3. All API Routes

### Base URL: `http://127.0.0.1:8000`

#### Auth Pattern
All protected routes require: `Authorization: Bearer <supabase_access_token>`
- `/api/v1/evaluations` — requires auth (HR role to see all)
- `/api/v1/evaluate` — gracefully accepts anonymous (never 401-masks LangGraph failures)
- `/api/v1/requisitions/open` — public
- `/api/v1/applications` — public POST (candidate self-apply)

---

### `GET /api/v1/health`
**Auth:** None
**Response:**
```json
{ "status": "ok", "service": "TalentGraph AI", "db": "sqlite-local" }
```

---

### `GET /api/v1/requisitions`
**Auth:** Bearer token
**Response:** Array of `JobRequisitionResponse`

### `POST /api/v1/requisitions` (201)
**Auth:** Bearer token
**Payload:**
```json
{ "title": "...", "description": "...", "required_skills": [], "nice_to_have_skills": [] }
```

### `PUT /api/v1/requisitions/{id}`
**Auth:** Bearer token
**Response:** `{ "status": "success", "message": "Requisition updated" }`

### `DELETE /api/v1/requisitions/{id}`
**Auth:** Bearer token
**Response:** `{ "status": "success", "message": "Requisition deleted" }`

### `GET /api/v1/requisitions/open`
**Auth:** None (public)

### `GET /api/v1/requisitions/{id}/applications`
**Auth:** Bearer token

---

### `GET /api/v1/evaluations`
**Auth:** Bearer token (Required — returns 401 without it)
**Query Params:** `?job_requisition_id=<int>` (optional filter)
**Response:** **FLAT ARRAY** (NOT wrapped in `{ data: [...] }`)
```json
[
  {
    "id": 1,
    "candidate_name": "Alice Johnson",
    "score": 85.0,
    "verdict": "STRONG HIRE",
    "job_requisition_id": 1,
    "full_dossier": { ...FinalCandidateDossier blob... }
  }
]
```

> [!IMPORTANT]
> `anonymized_id` is **no longer returned** by the evaluations endpoints. It was removed as part of the Zero-Bias anonymization feature removal.

### `GET /api/v1/evaluations/{id}`
**Auth:** Bearer token

### `PUT /api/v1/evaluations/{id}/override`
**Auth:** Bearer token (HR role)
**Payload:**
```json
{ "verdict": "HIRE", "justification": "HR note explaining the override reason" }
```

### `GET /api/v1/evaluations/candidate`
**Auth:** Bearer token (candidate's own evaluations only)

---

### `POST /api/v1/evaluate`
**Auth:** Bearer token or anonymous (graceful)
**Payload:**
```json
{
  "resume_text": "Full resume plain text...",
  "job_description": "Job description text...",
  "job_requisition_id": 1,
  "required_skills": ["Python", "FastAPI"],
  "nice_to_have_skills": ["Docker"]
}
```

> [!IMPORTANT]
> The resume text is passed **directly into the LangGraph pipeline without any anonymization**. The Resume Analyzer agent extracts the real candidate name from the raw text.

### `POST /api/v1/upload-resume`
**Auth:** None
**Payload:** `multipart/form-data` with `file` field (PDF only)

### `POST /api/v1/applications` (201)
**Auth:** None (public — candidate self-apply)

### `POST /api/v1/applications/{id}/evaluate`
**Auth:** Bearer token (HR triggers evaluation of an application)

### `GET /api/v1/applications/candidate`
**Auth:** Bearer token

---

## 4. FinalCandidateDossier — Full JSON Schema

```typescript
interface FinalCandidateDossier {
  // Identity — REAL names only, no anonymization
  candidate_name: string;        // Real name extracted by Resume Analyzer
  candidate_email?: string;      // Injected from application record (POST /applications/{id}/evaluate)

  // Top-Level Verdict
  verdict: string;               // "STRONG HIRE" | "HIRE" | "LEAN HIRE" | "RE-EVALUATE"
  overall_recommendation: string;// Mirror of verdict
  executive_summary: string;     // Orchestrator's narrative synthesis

  // Scores (all mirrors of job_fit.score)
  quantitative_match_score: number; // 0–100
  score: number;                    // 0–100
  hire_confidence_score: number;    // 0–100

  // Skills
  matched_skills: string[];
  skills_matched: string[];         // Mirror of matched_skills
  missing_skills: string[];
  critical_skill_deficits: string[];// Mirror of missing_skills

  // Salvage
  alternative_matches: Array<{
    job_title: string;
    job_id: number;
    match_score: number;
  }>;

  // Human Override
  human_override_justification?: string;

  // Nested Agent Outputs
  parsed_resume: {
    candidate_name: string;
    years_experience: number;
    core_skills: string[];
    frameworks: string[];
    summary: string;
  };

  job_fit: {
    score: number;
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    experience_gap_years: number;
    alignment_verdict: string;
    reasoning: string;
    forensic_confidence_score: number | null;
    forensic_verification_note: string;
  };

  technical_screen: {
    questions: Array<{
      target_skill: string;
      question: string;
      expected_answer_concepts: string[];
      difficulty: string;
    }>;
    focus_areas: string[];
  };
  technical_interview_pack: typeof technical_screen; // Exact mirror

  culture_fit: {
    questions: Array<{
      scenario: string;
      question: string;
      purpose: string;
      core_competency_evaluated: string;
    }>;
    core_values_assessed: string[];
  };
  behavioral_interview_pack: typeof culture_fit; // Exact mirror
}
```

---

## 5. The 5-Agent LangGraph DAG

### DAG Topology (Sequential Linear Chain)

```
START → resume_analyzer → job_fit → technical_screener → culture_fit → orchestrator → END
```

### State Object: `AgentState` (TypedDict)

```python
class AgentState(TypedDict):
    request: EvaluateRequest          # Input payload from POST /api/v1/evaluate
    parsed_resume: ParsedResume       # Set by resume_analyzer node
    job_fit: JobFitScorecard          # Set by job_fit node
    technical_screen: TechnicalScreenKit  # Set by technical_screener node
    culture_fit: CultureFitKit        # Set by culture_fit node
    final_dossier: FinalCandidateDossier  # Set by orchestrator node
    steps: List[str]                  # Audit trail — one entry per agent
```

### Agent Descriptions

**Agent 1: `resume_analyzer` node**
- LLM: Groq `openai/gpt-oss-120b`
- Input: `request.resume_text` — **real, unmodified resume text**
- Output: `ParsedResume` — `{candidate_name, years_experience, core_skills[], frameworks[], summary}`
- Extracts the **real candidate name** directly from the resume

**Agent 2: `job_fit` node**
- Tools called:
  1. `calculate_competency_match(candidate_skills, required_skills, nice_to_have_skills)` — deterministic math (85% weight core / 15% nice-to-have)
  2. `verify_digital_footprint(entities[:3])` — DuckDuckGo search for forensic confidence
- Output: `JobFitScorecard` — score is ALWAYS from the deterministic tool, not LLM

**Agent 3: `technical_screener` node**
- Generates exactly 3 scenario-driven technical questions
- At least 2 must probe skills in `missing_skills`

**Agent 4: `culture_fit` node**
- Generates exactly 2 behavioral situational questions

**Agent 5: `orchestrator` node**
- Synthesizes ALL 4 prior agent outputs into `FinalCandidateDossier`
- **Verdict Logic:**
  - Score ≥ 80% → `"STRONG HIRE"`
  - Score ≥ 65% → `"HIRE"`
  - Score ≥ 50% → `"LEAN HIRE"`
  - Score < 50%  → `"RE-EVALUATE"`
- **Cross-Requisition Salvage:** If `job_fit.score < 50`, queries ALL `JobRequisition` records and runs `calculate_competency_match` against each. If alternative score > 70%, appends to `alternative_matches[]`

> [!IMPORTANT]
> **Zero-Bias Anonymization has been completely removed.** There is no `anonymize_resume()` function and no pre-processing step. The pipeline receives real resume text. The Resume Analyzer extracts the real candidate name and all downstream agents use it.

### LLM JSON Parsing: `extract_and_parse()`
- Strips markdown code fences
- Handles newlines inside JSON strings
- Falls back to finding first `{` and last `}` in response
- Validates against Pydantic model via `model_validate()`

---

## 6. Frontend — UI Layout & Pages

### Layout (`app/layout.tsx`)
- Root layout with Inter font
- **Authenticated users:** `<Sidebar>` component rendered on the left
- **Unauthenticated users:** No sidebar (full-width content)
- `<ThemeProvider>` wraps all content

### Pages

#### `/` — Landing Page (`app/page.tsx`)
- **Theme:** Light blue/white, no dark mode toggle
- **Architecture:** "ae"-inspired design with curved glassmorphic arch at top (`rounded-b-[100%] bg-gradient-to-b from-blue-50 to-white`)
- **Navbar:** Centered links (Home, About, How it Works) with `bg-blue-600 rounded-full` "Get Started" / "Dashboard →" button on the right
- **Agent Pipeline Cards:** `hover:-translate-y-2 hover:shadow-[0_10px_25px_rgba(37,99,235,0.25)] border hover:border-blue-500 transition-all duration-300`
- **Feature Cards:** Same hover treatment matching portfolio animations
- **CTAs:** "Sign In as HR" / "Sign In as Candidate" → Google OAuth

#### `/dashboard` — HR Dashboard (`app/dashboard/page.tsx`)
- **Auth:** Required (HR role)
- **Data source:** `GET /api/v1/evaluations` (Bearer token required) + `GET /api/v1/requisitions`
- **Metric Cards (Fixed Math):**
  - **Card 1 — Total Evaluations:** `evaluations.length`
  - **Card 2 — Qualified for Hire:** `evaluations.filter(e => e.verdict?.toUpperCase().includes('HIRE')).length`
  - **Card 3 — Cross-Req Matches:** `evaluations.filter(e => e.fullData?.alternative_matches?.length > 0).length`
- **Recent Evaluations table:** Shows real candidate name, role target, match score bar, verdict badge
- **Row click:** Stores `full_dossier` in `sessionStorage["dossierData"]` → navigates to `/dossier?id={id}`

#### `/dossier` — Candidate Dossier (`app/dossier/page.tsx`)
- **Anonymization removed:** Displays real `candidate_name` and `candidate_email` directly — no Eye/EyeOff toggle
- **PDF Download:** `handleDownloadPDF()` dynamically imports `html2pdf.js`, targets an off-screen `ref` div, downloads `Candidate_Evaluation.pdf`
- **RBAC PDF Fix:** `PrintDocument` component receives `userRole` prop. Technical Screen Kit and Culture Fit sections are wrapped in `{userRole !== 'candidate' && (...)}` — these sections are **absent from the PDF for candidates**
- **HR Override Panel:** React state driven, submits to `PUT /api/v1/evaluations/{id}/override`, justification appears in PDF
- **Sidebar:** Job Fit Score, Forensic Verification (HR only), Skills Analysis

#### `/evaluate` — Resume Evaluation (`app/evaluate/page.tsx`)
- HR submits resume text + selects requisition → `POST /api/v1/evaluate`
- Can also upload PDF → `POST /api/v1/upload-resume` → extracts text

#### `/requisitions` — Requisition Management (`app/requisitions/page.tsx`)
- HR-only: Create, edit, delete job requisitions
- **B2B Tenant Display:** Company name badge (`🏢 {companyName}`) shown on each card

#### `/requisitions/[id]` — Applicants Pipeline (`app/requisitions/[id]/page.tsx`)
- **Anonymization removed:** Displays real `candidate_name` and `candidate_email` directly
- No Eye/EyeOff toggle, no `revealedApps` state
- 1-Click Evaluation triggers the LangGraph pipeline via `POST /api/v1/applications/{id}/evaluate`

#### `/candidate/dashboard` — Candidate View (`app/candidate/page.tsx`)
- Shows candidate's own applications and evaluation results
- Reads from `GET /api/v1/evaluations/candidate`

#### `/auth/callback` — OAuth Callback (`app/auth/callback/route.ts`)
- Handles Supabase Google OAuth redirect
- Reads `?role=` from query param, sets `user_metadata.role` in session
- Redirects HR → `/dashboard`, Candidate → `/candidate/dashboard`

#### `/profile` — User Profile (`app/profile/page.tsx`)
- **Avatar Upload:** `<input type="file" accept="image/*" />` (hidden) triggered by camera icon overlay on avatar circle
- **Upload Pipeline:** `supabase.storage.from('avatars').upload(userId/timestamp.ext)` → get public URL → `supabase.auth.updateUser({ data: { avatar_url: publicUrl } })`
- Full name, company (HR) or GitHub/LinkedIn (Candidate) editable fields
- Sign-out button

---

## 7. RBAC — Role-Based Access Control

### Role Assignment
- Set during OAuth flow: `?role=hr` or `?role=candidate`
- Stored in: Supabase `user_metadata.role`
- Read from: JWT payload `user_metadata.role`

### Route Protection (`middleware.ts`)
- Unauthenticated users → redirected to `/` (landing page)
- HR users → allowed `/dashboard`, `/evaluate`, `/requisitions`, `/dossier`, `/profile`
- Candidate users → allowed `/candidate/dashboard`, `/dossier`, `/profile`

### RBAC Rules in UI

| Feature | HR | Candidate |
|---|---|---|
| Dashboard overview | ✅ Full metrics | ❌ Not accessible |
| Run new evaluation | ✅ Yes | ❌ No |
| View all evaluations | ✅ Yes | ❌ Own only |
| Dossier — real name display | ✅ Always visible | ✅ Always visible (no masking) |
| Dossier — Technical Screen Kit | ✅ Visible | ❌ Hidden |
| Dossier — Culture Fit questions | ✅ Visible | ❌ Hidden |
| Dossier — Forensic Verification | ✅ Visible | ❌ Hidden |
| Human Override Panel | ✅ Visible (HR only) | ❌ Hidden |
| Download PDF — content | ✅ Full dossier incl. interview kits | ✅ Partial: skills + verdict only |
| Manage Requisitions | ✅ Full CRUD | ❌ Read-only candidate portal |
| Apply to job | ❌ N/A | ✅ Via candidate portal |

> [!CAUTION]
> **PDF RBAC is enforced at the component level.** The `PrintDocument` component receives a `userRole` prop. Technical Screen Kit and Culture Fit sections are wrapped in `{userRole !== 'candidate' && (...)}`. The html2pdf.js target div is off-screen (absolutely positioned at left: -9999px) and is never visible in the browser UI — it is only used as the html2pdf source. Since the RBAC guard is in the component rendering the target div, candidates cannot access interview questions even by inspecting the PDF.

---

## 8. Key Architectural Decisions

1. **Zero-Bias Anonymization REMOVED:** The `anonymize_resume()` function has been completely deleted from `backend/main.py`. Resumes are passed directly into the LangGraph pipeline. The `anonymized_id` database column is retained for schema compatibility but is always set to `None` for new evaluations.

2. **html2pdf.js PDF Engine:** Replaced `window.print()` with programmatic PDF generation using `html2pdf.js`. The library is dynamically imported (client-side only) to avoid SSR issues. It targets an off-screen `ref` div containing the `PrintDocument` component. Output filename: `Candidate_Evaluation.pdf`.

3. **RBAC-Secured PDF:** The `PrintDocument` component is rendered off-screen for pdf purposes with a `userRole` prop. Sections containing interview questions (Technical Screen Kit, Culture Fit) are conditionally rendered only when `userRole !== 'candidate'`. This means candidates cannot obtain interview questions via PDF download.

4. **Dashboard Metric Math (Fixed):**
   - Card 1 = `evaluations.length` (total count)
   - Card 2 = `evaluations.filter(e => e.verdict?.toUpperCase().includes('HIRE')).length` (all HIRE verdicts including STRONG HIRE, HIRE, LEAN HIRE)
   - Card 3 = `evaluations.filter(e => e.fullData?.alternative_matches?.length > 0).length`

5. **Deterministic Competency Math:** The `calculate_competency_match()` tool in `tools.py` performs pure set intersection with weighted ratios (85% required / 15% nice-to-have). The LLM is explicitly instructed NEVER to invent or modify the score.

6. **LangGraph Linear DAG:** The 5-agent pipeline is strictly sequential. The `AgentState` TypedDict is passed by reference and mutated in-place at each node.

7. **Profile Avatar via Supabase Storage:** Profile page now uses `<input type="file">` + Supabase Storage upload to the `avatars` bucket. Path format: `{userId}/{timestamp}.{ext}`. The public URL is stored in `user_metadata.avatar_url`.

8. **Full Dossier as JSON Blob:** The entire `FinalCandidateDossier` is stored as a `JSON` column in `full_dossier`. Key searchable fields (`score`, `verdict`, `candidate_name`) are also stored at the top level.

9. **Human Override:** `PUT /api/v1/evaluations/{id}/override` updates both the top-level `verdict` column AND `full_dossier.verdict` and `full_dossier.human_override_justification` in a single transaction.

10. **SQLite over Supabase PostgreSQL (local dev):** `database.py` detects if `DATABASE_URL` is absent or points to `supabase.co` and falls back to `talentgraph.db`.

---

## 9. Running the Project

### Backend
```powershell
cd "d:\Semesters Data\AI SEEKHO\AI SEEKHO PROJECT\talentgraph-ai\backend"
..\venv\Scripts\activate
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend
```powershell
cd "d:\Semesters Data\AI SEEKHO\AI SEEKHO PROJECT\talentgraph-ai\frontend"
npm run dev
# Runs at http://localhost:3000
```

### Backend Python Dependencies (`backend/requirements.txt`)
- `fastapi`, `uvicorn[standard]`
- `sqlalchemy`, `pydantic`
- `python-jose[cryptography]` / `pyjwt`
- `python-dotenv`
- `langgraph`, `langchain-groq`, `langchain-core`
- `pdfplumber`
- `duckduckgo-search`

### Frontend Dependencies (`frontend/package.json`)
- `next`, `react`, `react-dom`
- `@supabase/ssr`, `@supabase/supabase-js`
- `lucide-react`
- `tailwindcss` (v4)
- `next-themes` (ThemeProvider)
- `html2pdf.js` ← **new addition**

---

## 10. File Map

```
talentgraph-ai/
├── backend/
│   ├── main.py          ← FastAPI app, all API routes, CORS, auth helpers
│   │                      (anonymize_resume() REMOVED — real names throughout)
│   ├── models.py        ← SQLAlchemy ORM models (JobRequisition, Evaluation, Application)
│   ├── schemas.py       ← Pydantic schemas (EvaluateRequest, FinalCandidateDossier, etc.)
│   ├── graph.py         ← LangGraph 5-agent DAG definition
│   ├── prompts.py       ← System prompts for each agent
│   ├── tools.py         ← calculate_competency_match(), verify_digital_footprint()
│   ├── database.py      ← SQLAlchemy engine setup, SQLite/Postgres fallback
│   ├── supabase_migration.sql  ← PostgreSQL schema for Supabase (RLS policies included)
│   └── talentgraph.db   ← Local SQLite database (dev)
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           ← Root layout: Inter font, Sidebar, ThemeProvider
│   │   ├── globals.css          ← Base styles
│   │   ├── page.tsx             ← Landing page (ae-inspired arch design, blue CTA)
│   │   ├── dashboard/page.tsx   ← HR Dashboard (fixed metric math)
│   │   ├── dossier/page.tsx     ← Candidate Dossier + html2pdf.js + RBAC PDF
│   │   ├── evaluate/page.tsx    ← Evaluation submission form
│   │   ├── requisitions/page.tsx← CRUD for job requisitions (company badge)
│   │   ├── requisitions/[id]/   ← Applicants pipeline (real names, no masking)
│   │   ├── candidate/           ← Candidate portal pages
│   │   ├── auth/callback/       ← Supabase OAuth callback handler
│   │   ├── profile/page.tsx     ← User profile (file upload avatar + Supabase Storage)
│   │   └── components/
│   │       ├── Sidebar.tsx      ← Navigation sidebar (authenticated only)
│   │       └── ThemeProvider.tsx← next-themes wrapper
│   └── middleware.ts            ← Route protection & RBAC redirects
│
└── SYSTEM_SUMMARY.md            ← This file
```
