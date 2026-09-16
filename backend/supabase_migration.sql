-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (matching SQLAlchemy models)
CREATE TABLE IF NOT EXISTS public.job_requisitions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    required_skills JSONB DEFAULT '[]',
    nice_to_have_skills JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.evaluations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    job_requisition_id INTEGER REFERENCES public.job_requisitions(id),
    anonymized_id VARCHAR,
    candidate_name VARCHAR,
    status VARCHAR DEFAULT 'completed',
    score FLOAT DEFAULT 0.0,
    verdict VARCHAR,
    forensic_confidence_score FLOAT,
    alternative_matches JSONB DEFAULT '[]',
    full_dossier JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR job_requisitions
CREATE POLICY "Users can view their own job requisitions"
    ON public.job_requisitions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job requisitions"
    ON public.job_requisitions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job requisitions"
    ON public.job_requisitions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job requisitions"
    ON public.job_requisitions FOR DELETE
    USING (auth.uid() = user_id);

-- POLICIES FOR evaluations
CREATE POLICY "Users can view their own evaluations"
    ON public.evaluations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evaluations"
    ON public.evaluations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations"
    ON public.evaluations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evaluations"
    ON public.evaluations FOR DELETE
    USING (auth.uid() = user_id);
