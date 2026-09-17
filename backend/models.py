from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base

class JobRequisition(Base):
    __tablename__ = "job_requisitions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)
    nice_to_have_skills = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Evaluation(Base):
    __tablename__ = "evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    job_requisition_id = Column(Integer, ForeignKey("job_requisitions.id"), nullable=True)
    
    anonymized_id = Column(String, index=True)
    candidate_name = Column(String)
    
    status = Column(String, default="completed")
    score = Column(Float, default=0.0)
    verdict = Column(String)
    
    forensic_confidence_score = Column(Float, nullable=True)
    alternative_matches = Column(JSON, default=list)
    
    full_dossier = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    job_requisition_id = Column(Integer, ForeignKey("job_requisitions.id"), nullable=False)
    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, nullable=False)
    resume_text = Column(Text, nullable=False)
    status = Column(String, default="Pending")
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
