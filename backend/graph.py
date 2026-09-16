import os
import sys
import json
import re
from pathlib import Path
from typing import TypedDict, List, Dict, Any, Optional

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

try:
    from typing import NotRequired
except ImportError:
    from typing_extensions import NotRequired

from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel

from schemas import (
    EvaluateRequest,
    ParsedResume,
    JobFitScorecard,
    TechnicalScreenKit,
    CultureFitKit,
    FinalCandidateDossier
)
from prompts import (
    RESUME_ANALYZER_PROMPT,
    JOB_FIT_PROMPT,
    TECHNICAL_SCREENER_PROMPT,
    CULTURE_FIT_PROMPT,
    ORCHESTRATOR_PROMPT
)
from tools import calculate_competency_match


def extract_and_parse(content: str, model_cls: type[BaseModel]):
    try:
        clean = content.strip()
        m = re.search(r'```(?:json)?\s*(\{.*\}|\[.*\])\s*```', clean, re.DOTALL)
        if m:
            clean = m.group(1)
        else:
            start = clean.find('{')
            end = clean.rfind('}')
            if start != -1 and end != -1 and end > start:
                clean = clean[start:end+1]
        
        clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', ' ', clean)
        
        clean_lines = []
        in_string = False
        escape_next = False
        for char in clean:
            if char == '"' and not escape_next:
                in_string = not in_string
            escape_next = (char == '\\' and not escape_next)
            if in_string and char == '\n':
                clean_lines.append(' ')
            else:
                clean_lines.append(char)
        clean = "".join(clean_lines)

        data = json.loads(clean)
        return model_cls.model_validate(data)
    except Exception as e:
        raise ValueError(f"JSON parse error for {model_cls.__name__}: {e}\nRaw output snippet: {content[:300]}")


class AgentState(TypedDict):
    request: EvaluateRequest
    parsed_resume: NotRequired[ParsedResume]
    job_fit: NotRequired[JobFitScorecard]
    technical_screen: NotRequired[TechnicalScreenKit]
    culture_fit: NotRequired[CultureFitKit]
    final_dossier: NotRequired[FinalCandidateDossier]
    steps: List[str]


def get_llm():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is missing in backend/.env")
    return ChatGroq(
        model_name="openai/gpt-oss-120b",
        temperature=0.1,
        groq_api_key=api_key
    )


def resume_analyzer_node(state: AgentState):
    llm = get_llm()
    request = state["request"]
    schema_skeleton = '{"candidate_name": "", "years_experience": 0.0, "core_skills": [], "frameworks": [], "summary": ""}'
    
    messages = [
        SystemMessage(content=RESUME_ANALYZER_PROMPT),
        HumanMessage(content=f"Candidate Resume Text:\n{request.resume_text}\n\nREQUIRED JSON FORMAT:\n{schema_skeleton}")
    ]
    response = llm.invoke(messages)
    state["parsed_resume"] = extract_and_parse(response.content, ParsedResume)
    state.setdefault("steps", []).append("Resume Analyzer: Structured extraction completed.")
    return state


def job_fit_node(state: AgentState):
    llm = get_llm()
    request = state["request"]
    parsed = state["parsed_resume"]
    
    candidate_skills = list(set(parsed.core_skills + parsed.frameworks))
    req_skills = request.required_skills if request.required_skills else ["Python", "FastAPI", "Docker", "Database Design"]
    nice_skills = request.nice_to_have_skills if request.nice_to_have_skills else []
    
    tool_output = calculate_competency_match(candidate_skills, req_skills, nice_skills)
    schema_skeleton = '{"experience_gap_years": 0.0, "alignment_verdict": "", "reasoning": ""}'
    
    from tools import verify_digital_footprint
    entities_to_verify = parsed.frameworks[:3]
    if not entities_to_verify:
        entities_to_verify = parsed.core_skills[:3]
    forensic_result = verify_digital_footprint(entities_to_verify)
    
    messages = [
        SystemMessage(content=JOB_FIT_PROMPT),
        HumanMessage(
            content=f"Candidate Skills: {candidate_skills}\n"
                    f"Job Description:\n{request.job_description}\n\n"
                    f"Deterministic Math Tool Result:\n{tool_output}\n\n"
                    f"Forensic Verification:\nScore: {forensic_result['forensic_confidence_score']}\nNote: {forensic_result['verification_note']}\n\nREQUIRED JSON FORMAT:\n{schema_skeleton}"
        )
    ]
    response = llm.invoke(messages)
    result = extract_and_parse(response.content, JobFitScorecard)
    
    result.score = tool_output["score"]
    result.match_percentage = tool_output["score"]
    result.matched_skills = tool_output["matched_skills"]
    result.missing_skills = tool_output["missing_skills"]
    result.forensic_confidence_score = forensic_result.get("forensic_confidence_score", 50.0)
    result.forensic_verification_note = forensic_result.get("verification_note", "")
    
    state["job_fit"] = result
    state["steps"].append(f"Job Fit Agent: Tool executed. Score: {result.score}%. Forensic Confidence: {result.forensic_confidence_score}%.")
    return state


def technical_screener_node(state: AgentState):
    llm = get_llm()
    request = state["request"]
    parsed = state["parsed_resume"]
    job_fit = state["job_fit"]
    
    schema_skeleton = '{"questions": [{"target_skill": "", "question": "", "expected_answer_concepts": [""]}]}'
    
    messages = [
        SystemMessage(content=TECHNICAL_SCREENER_PROMPT),
        HumanMessage(
            content=f"Job Description:\n{request.job_description}\n\n"
                    f"Candidate Summary: {parsed.summary}\n"
                    f"Candidate Skills: {parsed.core_skills + parsed.frameworks}\n"
                    f"Missing Skills: {job_fit.missing_skills}\n\nREQUIRED JSON FORMAT:\n{schema_skeleton}"
        )
    ]
    response = llm.invoke(messages)
    state["technical_screen"] = extract_and_parse(response.content, TechnicalScreenKit)
    state["steps"].append("Technical Screener: 3 targeted architectural questions generated.")
    return state


def culture_fit_node(state: AgentState):
    llm = get_llm()
    request = state["request"]
    parsed = state["parsed_resume"]
    
    schema_skeleton = '{"questions": [{"scenario": "", "question": "", "purpose": "", "core_competency_evaluated": ""}], "core_values_assessed": [""]}'
    
    messages = [
        SystemMessage(content=CULTURE_FIT_PROMPT),
        HumanMessage(
            content=f"Job Context:\n{request.job_description}\n\n"
                    f"Experience Level: {parsed.years_experience} years.\n"
                    f"Summary: {parsed.summary}\n\nREQUIRED JSON FORMAT:\n{schema_skeleton}"
        )
    ]
    response = llm.invoke(messages)
    state["culture_fit"] = extract_and_parse(response.content, CultureFitKit)
    state["steps"].append("Culture Fit Agent: 2 behavioral scenarios generated.")
    return state


def orchestrator_node(state: AgentState):
    llm = get_llm()
    parsed = state["parsed_resume"]
    job_fit = state["job_fit"]
    tech = state["technical_screen"]
    culture = state["culture_fit"]
    
    schema_skeleton = '{"candidate_name": "", "verdict": "", "executive_summary": ""}'
    
    payload = (
        f"Parsed Resume:\n{parsed.model_dump_json()}\n\n"
        f"Job Fit Scorecard:\n{job_fit.model_dump_json()}\n\n"
        f"Technical Screen Kit:\n{tech.model_dump_json()}\n\n"
        f"Culture Fit Kit:\n{culture.model_dump_json()}\n\nREQUIRED JSON FORMAT:\n{schema_skeleton}"
    )
    
    messages = [
        SystemMessage(content=ORCHESTRATOR_PROMPT),
        HumanMessage(content=payload)
    ]
    response = llm.invoke(messages)
    result = extract_and_parse(response.content, FinalCandidateDossier)
    
    alternative_matches = []
    if job_fit.score < 50:
        from database import SessionLocal
        from models import JobRequisition
        try:
            db = SessionLocal()
            user_id = "test-user-id"
            other_jobs = db.query(JobRequisition).filter(JobRequisition.user_id == user_id).all()
            candidate_skills = list(set(parsed.core_skills + parsed.frameworks))
            for job in other_jobs:
                salvage_output = calculate_competency_match(
                    candidate_skills, 
                    job.required_skills, 
                    job.nice_to_have_skills
                )
                if salvage_output["score"] > 70.0:
                    alternative_matches.append({
                        "job_title": job.title,
                        "job_id": job.id,
                        "match_score": salvage_output["score"]
                    })
        except Exception as e:
            import logging
            logging.error(f"Salvaging failed: {e}")
        finally:
            db.close()
            
    result.alternative_matches = alternative_matches
    
    result.parsed_resume = parsed
    result.job_fit = job_fit
    result.technical_screen = tech
    result.technical_interview_pack = tech
    result.culture_fit = culture
    result.behavioral_interview_pack = culture
    result.matched_skills = job_fit.matched_skills
    result.skills_matched = job_fit.matched_skills
    result.missing_skills = job_fit.missing_skills
    result.critical_skill_deficits = job_fit.missing_skills
    result.quantitative_match_score = job_fit.score
    result.score = job_fit.score
    result.hire_confidence_score = job_fit.score
    result.candidate_name = parsed.candidate_name
    
    state["final_dossier"] = result
    state["steps"].append("Orchestrator: Final Candidate Dossier compiled.")
    return state


workflow = StateGraph(AgentState)

workflow.add_node("resume_analyzer", resume_analyzer_node)
workflow.add_node("job_fit", job_fit_node)
workflow.add_node("technical_screener", technical_screener_node)
workflow.add_node("culture_fit", culture_fit_node)
workflow.add_node("orchestrator", orchestrator_node)

workflow.add_edge(START, "resume_analyzer")
workflow.add_edge("resume_analyzer", "job_fit")
workflow.add_edge("job_fit", "technical_screener")
workflow.add_edge("technical_screener", "culture_fit")
workflow.add_edge("culture_fit", "orchestrator")
workflow.add_edge("orchestrator", END)

app = workflow.compile()