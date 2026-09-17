# TalentGraph AI System Summary

## Executive Overview
TalentGraph AI is a comprehensive, multi-agent Applicant Tracking System (ATS). It streamlines the recruitment process by leveraging an advanced multi-agent architecture to evaluate candidates holistically, providing deep insights into their technical capabilities, cultural fit, and overall job alignment.

## Infrastructure
- **Frontend**: Vercel (Next.js) for scalable, edge-optimized delivery of the user interface.
- **Backend**: Render (FastAPI) providing a robust and performant API layer.
- **Database**: Supabase (PostgreSQL) utilizing an IPv4 Session Pooler for efficient, high-concurrency connection management.

## 5-Agent LangGraph Pipeline
Our AI pipeline employs LangGraph for orchestrated, deterministic multi-agent workflows. Each node is responsible for specific evaluation metrics and utilizes deterministic JSON extraction for structured outputs.
1. **Resume Analyzer**: Parses and standardizes initial candidate data, extracting skills, experience, and education.
2. **Job Fit + Forensics**: Evaluates the candidate's background against job requirements and detects inconsistencies or anomalies in their employment history.
3. **Technical Screener**: Deep-dives into technical proficiencies, assessing project complexity and matching tech stacks.
4. **Culture Fit**: Analyzes soft skills, communication styles, and values alignment with organizational culture.
5. **Chief Orchestrator**: Synthesizes reports from the previous nodes, making final recommendations and generating a holistic candidate profile.

## Structural Multi-Tenancy (RBAC)
To ensure strict data isolation between Candidates and HR personnel, the system implements structural multi-tenancy. SQLAlchemy query-level scoping enforces role-based access control (RBAC) at the database interaction layer. Relational joins are strictly controlled to prevent accidental data leaks, ensuring users only access data permitted by their tenant and role ID.

## Data Integrity & Serialization
- **Pydantic Models**: We use Pydantic for strict data validation and serialization. Dedicated response models actively mask restricted HR data, ensuring candidates never receive internal evaluation metrics or sensitive fields.
- **SQLAlchemy Eager Loading**: To prevent N+1 query problems and subsequent serialization crashes, relational data is meticulously eager-loaded via SQLAlchemy options, ensuring efficient database querying and reliable API responses.

## Frontend State Management
- **Optimistic UI Updates**: The Next.js frontend employs optimistic UI patterns to instantly reflect user actions (like status changes or application submissions). This masks database transaction latency, resulting in a highly responsive user experience.
- **React DOM Modals**: We transitioned to custom React DOM modals to ensure clean state isolation and avoid z-index conflicts or mounting issues common with third-party modal libraries, enhancing the stability of the UI.
