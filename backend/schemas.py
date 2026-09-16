from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class EvaluateRequest(BaseModel):
    resume_text: str
    job_description: str
    job_requisition_id: Optional[int] = None
    required_skills: Optional[List[str]] = Field(default_factory=list)
    nice_to_have_skills: Optional[List[str]] = Field(default_factory=list)

class JobRequisitionCreate(BaseModel):
    title: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    nice_to_have_skills: List[str] = Field(default_factory=list)

class JobRequisitionResponse(JobRequisitionCreate):
    id: int
    user_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApplicationCreate(BaseModel):
    job_requisition_id: int
    candidate_name: str
    candidate_email: str
    resume_text: str

class ApplicationResponse(ApplicationCreate):
    id: int
    status: str
    evaluation_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ParsedResume(BaseModel):
    candidate_name: str = Field(default="Anonymous", description="Candidate name or Anonymous")
    years_experience: float = Field(default=0.0, description="Total professional years of experience")
    core_skills: List[str] = Field(default_factory=list, description="Primary programming languages and core paradigms")
    frameworks: List[str] = Field(default_factory=list, description="Frameworks, databases, and DevOps tooling")
    summary: str = Field(default="", description="Executive career summary")

class JobFitScorecard(BaseModel):
    score: float = Field(default=0.0, ge=0.0, le=100.0, description="Quantitative score from tool")
    match_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    experience_gap_years: float = Field(default=0.0)
    alignment_verdict: str = Field(default="Moderate Match")
    reasoning: str = Field(default="")
    forensic_confidence_score: Optional[float] = Field(default=None)
    forensic_verification_note: str = Field(default="")

class TechQuestion(BaseModel):
    target_skill: str = Field(description="The deficient or critical skill tested")
    question: str = Field(description="Scenario-based technical architecture question")
    expected_answer_concepts: List[str] = Field(default_factory=list, description="Core architectural concepts required")
    difficulty: str = Field(default="Medium")

class TechnicalScreenKit(BaseModel):
    questions: List[TechQuestion] = Field(default_factory=list)
    focus_areas: List[str] = Field(default_factory=list)

class BehavioralQuestion(BaseModel):
    scenario: str = Field(description="Real-world workplace dilemma")
    question: str = Field(description="Probing behavioral inquiry")
    purpose: str = Field(default="")
    core_competency_evaluated: str = Field(default="Ownership")

class CultureFitKit(BaseModel):
    questions: List[BehavioralQuestion] = Field(default_factory=list)
    core_values_assessed: List[str] = Field(default_factory=list)

class FinalCandidateDossier(BaseModel):
    candidate_name: str = "Anonymous"
    anonymized_id: Optional[str] = None
    verdict: str = "HIRE"
    overall_recommendation: str = "HIRE"
    executive_summary: str = ""
    quantitative_match_score: float = 0.0
    score: float = 0.0
    hire_confidence_score: float = 0.0
    matched_skills: List[str] = Field(default_factory=list)
    skills_matched: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    critical_skill_deficits: List[str] = Field(default_factory=list)
    alternative_matches: List[dict] = Field(default_factory=list)
    parsed_resume: Optional[ParsedResume] = None
    job_fit: Optional[JobFitScorecard] = None
    technical_screen: Optional[TechnicalScreenKit] = None
    technical_interview_pack: Optional[TechnicalScreenKit] = None
    culture_fit: Optional[CultureFitKit] = None
    behavioral_interview_pack: Optional[CultureFitKit] = None