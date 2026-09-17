import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import sqlalchemy.exc

load_dotenv(BACKEND_DIR / ".env")

from pydantic import BaseModel
class OverrideRequest(BaseModel):
    verdict: str
    justification: str

from sqlalchemy.orm import Session
from schemas import EvaluateRequest, JobRequisitionCreate, JobRequisitionResponse, ApplicationCreate, ApplicationResponse
from graph import app as graph_app
import jwt
from database import SessionLocal, get_db, engine, Base
from models import Evaluation, JobRequisition, Application

app = FastAPI(title="TalentGraph AI Backend")

Base.metadata.create_all(bind=engine)


# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://talentgraph-ai-phi.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth helper ───────────────────────────────────────────────────────────────
def get_current_user_id(authorization: str = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("bad scheme")
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        role = payload.get("user_metadata", {}).get("role", "candidate")
        if not user_id:
            raise ValueError("No sub in token")
        return {"user_id": user_id, "role": role}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Authorization token")


def get_evaluate_user(authorization: str = Header(None)) -> dict:
    """Auth for evaluate: prefer a real user, but never 401-mask LangGraph failures."""
    if not authorization:
        return {"user_id": "anonymous", "role": "hr"}
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return {"user_id": "anonymous", "role": "hr"}
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub") or "anonymous"
        role = payload.get("user_metadata", {}).get("role", "hr")
        return {"user_id": user_id, "role": role}
    except Exception:
        return {"user_id": "anonymous", "role": "hr"}


# ── Requisitions ──────────────────────────────────────────────────────────────

@app.post("/api/v1/requisitions", status_code=status.HTTP_201_CREATED)
async def create_requisition(
    requisition: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user_id),
):
    try:
        rec = JobRequisition(
            user_id=user["user_id"],
            title=(requisition.get("title") or "").strip(),
            description=(requisition.get("description") or "").strip(),
            required_skills=requisition.get("required_skills") or [],
            nice_to_have_skills=requisition.get("nice_to_have_skills") or [],
        )
        if not rec.title or not rec.description:
            raise HTTPException(status_code=400, detail="title and description are required")
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return {
            "status": "success",
            "message": "Requisition created",
            "data": {
                "id": rec.id,
                "user_id": rec.user_id,
                "title": rec.title,
                "description": rec.description,
                "required_skills": rec.required_skills or [],
                "nice_to_have_skills": rec.nice_to_have_skills or [],
                "created_at": rec.created_at.isoformat() if rec.created_at else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/requisitions/{id}")
def delete_requisition(id: int, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        req = db.query(JobRequisition).filter(JobRequisition.id == id, JobRequisition.user_id == user["user_id"]).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requisition not found")
        db.delete(req)
        db.commit()
        return {"status": "success", "message": "Requisition deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.put("/api/v1/requisitions/{id}")
def update_requisition(id: int, requisition: dict, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        req = db.query(JobRequisition).filter(JobRequisition.id == id, JobRequisition.user_id == user["user_id"]).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requisition not found")
        if "title" in requisition:
            req.title = requisition["title"].strip()
        if "description" in requisition:
            req.description = requisition["description"].strip()
        if "required_skills" in requisition:
            req.required_skills = requisition["required_skills"]
        if "nice_to_have_skills" in requisition:
            req.nice_to_have_skills = requisition["nice_to_have_skills"]
        db.commit()
        return {"status": "success", "message": "Requisition updated"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.get("/api/v1/requisitions", response_model=list[JobRequisitionResponse])
def get_requisitions(db: Session = Depends(get_db)):
    try:
        return (
            db.query(JobRequisition)
            .order_by(JobRequisition.created_at.desc())
            .all()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/requisitions/me", response_model=list[JobRequisitionResponse])
def get_my_requisitions(user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        return db.query(JobRequisition).filter(JobRequisition.user_id == user["user_id"]).order_by(JobRequisition.created_at.desc()).all()
    except Exception as e:
        import logging
        logging.error(f"get_my_requisitions error: {e}")
        return []
    finally:
        db.close()


# ── Evaluations ───────────────────────────────────────────────────────────────

@app.get("/api/v1/evaluations")
def get_evaluations(
    job_requisition_id: int = None,
    user: dict = Depends(get_current_user_id),
):
    db = SessionLocal()
    try:
        query = db.query(Evaluation).join(
            JobRequisition, Evaluation.job_requisition_id == JobRequisition.id
        ).filter(JobRequisition.user_id == user["user_id"])
        if job_requisition_id:
            query = query.filter(Evaluation.job_requisition_id == job_requisition_id)
        evals = query.order_by(Evaluation.created_at.desc()).all()
        return [
            {
                "id": e.id,
                "candidate_name": e.candidate_name,
                "score": e.score,
                "verdict": e.verdict,
                "job_requisition_id": e.job_requisition_id,
                "full_dossier": e.full_dossier,
            }
            for e in evals
        ]
    except Exception as e:
        import logging
        logging.error(f"get_evaluations error: {e}")
        return []
    finally:
        db.close()


@app.get("/api/v1/evaluations/candidate")
def get_candidate_evaluations(user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        evals = (
            db.query(Evaluation)
            .filter(Evaluation.user_id == user["user_id"])
            .order_by(Evaluation.created_at.desc())
            .all()
        )
        return [
            {
                "id": e.id,
                "candidate_name": e.candidate_name,
                "score": e.score,
                "verdict": e.verdict,
                "full_dossier": e.full_dossier,
            }
            for e in evals
        ]
    except Exception as e:
        import logging
        logging.error(f"get_candidate_evaluations error: {e}")
        return []
    finally:
        db.close()


@app.get("/api/v1/evaluations/{id}")
def get_evaluation(id: int, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        e = db.query(Evaluation).join(
            JobRequisition, Evaluation.job_requisition_id == JobRequisition.id
        ).filter(Evaluation.id == id, JobRequisition.user_id == user["user_id"]).first()
        if not e:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return {
            "id": e.id,
            "candidate_name": e.candidate_name,
            "score": e.score,
            "verdict": e.verdict,
            "job_requisition_id": e.job_requisition_id,
            "full_dossier": e.full_dossier,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.put("/api/v1/evaluations/{id}/override")
def override_evaluation(id: int, request: OverrideRequest, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        e = db.query(Evaluation).join(
            JobRequisition, Evaluation.job_requisition_id == JobRequisition.id
        ).filter(Evaluation.id == id, JobRequisition.user_id == user["user_id"]).first()
        if not e:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        e.verdict = request.verdict
        
        if isinstance(e.full_dossier, dict):
            dossier_data = dict(e.full_dossier)
            dossier_data["verdict"] = request.verdict
            dossier_data["human_override_justification"] = request.justification
            e.full_dossier = dossier_data
            
        db.commit()
        db.refresh(e)
        return {
            "status": "success", 
            "message": "Evaluation verdict overruled", 
            "verdict": e.verdict,
            "data": {
                "id": e.id,
                "candidate_name": e.candidate_name,
                "score": e.score,
                "verdict": e.verdict,
                "job_requisition_id": e.job_requisition_id,
                "full_dossier": e.full_dossier,
            }
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        db.close()



# ── Resume upload ─────────────────────────────────────────────────────────────

@app.post("/api/v1/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        content = await file.read()
        import io
        import pdfplumber

        pdf_file = io.BytesIO(content)
        extracted_text = ""
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"

        if not extracted_text.strip():
            raise ValueError("No readable text found in the PDF.")

        return {"status": "success", "text": extracted_text.strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": "TalentGraph AI", "db": "postgresql"}


# ── Evaluate ──────────────────────────────────────────────────────────────────

@app.post("/api/v1/evaluate")
def evaluate(request: EvaluateRequest, user: dict = Depends(get_evaluate_user)):
    try:
        if not (request.resume_text or "").strip():
            raise HTTPException(status_code=400, detail="resume_text is required")

        # No anonymization — pass the resume through as-is with real candidate data
        initial_state = {
            "request": request,
            "steps": ["Pipeline initialized with real candidate data."],
        }

        try:
            result = graph_app.invoke(initial_state)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=str(e),
            )

        dossier = result.get("final_dossier") if isinstance(result, dict) else None
        if dossier is None:
            raise HTTPException(
                status_code=500,
                detail="LangGraph invocation failed: no final_dossier was returned",
            )

        db = SessionLocal()
        try:
            evaluation = Evaluation(
                user_id=user["user_id"],
                job_requisition_id=request.job_requisition_id,
                anonymized_id=None,
                candidate_name=getattr(dossier, "candidate_name", "Unknown"),
                score=getattr(dossier, "score", 0) or 0,
                verdict=getattr(dossier, "verdict", "Pending"),
                forensic_confidence_score=getattr(dossier, "hire_confidence_score", None),
                alternative_matches=getattr(dossier, "alternative_matches", []) or [],
                full_dossier=dossier.model_dump() if hasattr(dossier, "model_dump") else dossier,
            )
            db.add(evaluation)
            db.commit()
            db.refresh(evaluation)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Evaluation DB insert failed: {e}")
        finally:
            db.close()

        return {
            "status": "success",
            "id": evaluation.id,
            "dossier": dossier,
            "data": dossier,
            "audit_trail": result.get("steps", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Applications ──────────────────────────────────────────────────────────────

@app.post("/api/v1/applications", status_code=status.HTTP_201_CREATED)
def create_application(request: ApplicationCreate, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        existing = db.query(Application).filter_by(
            user_id=user["user_id"],
            job_requisition_id=request.job_requisition_id, 
            candidate_email=request.candidate_email
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="An application with this email already exists for this position.")

        app_record = Application(
            user_id=user["user_id"],
            job_requisition_id=request.job_requisition_id,
            candidate_name=request.candidate_name,
            candidate_email=request.candidate_email,
            resume_text=request.resume_text,
            status="Pending"
        )
        db.add(app_record)
        try:
            db.commit()
            db.refresh(app_record)
        except sqlalchemy.exc.IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="You already have submitted your application for this requisition.")
        # Eagerly load the linked JobRequisition so the serialized response
        # is fully self-contained — no follow-up GET is needed by the client.
        job_req = db.query(JobRequisition).filter(
            JobRequisition.id == app_record.job_requisition_id
        ).first()

        return {
            "status": "success",
            "application": {
                "id": app_record.id,
                "job_requisition_id": app_record.job_requisition_id,
                "candidate_name": app_record.candidate_name,
                "candidate_email": app_record.candidate_email,
                "status": app_record.status,
                "evaluation_id": app_record.evaluation_id,
                "created_at": app_record.created_at.isoformat() if app_record.created_at else None,
            },
            "job_requisition": {
                "id": job_req.id,
                "title": job_req.title,
            } if job_req else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import logging
        logging.error(f"create_application failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit application")
    finally:
        db.close()

@app.get("/api/v1/requisitions/{id}/applications")
def get_requisition_applications(id: int, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        apps = db.query(Application).join(
            JobRequisition, Application.job_requisition_id == JobRequisition.id
        ).filter(
            JobRequisition.id == id, JobRequisition.user_id == user["user_id"]
        ).order_by(Application.created_at.desc()).all()
        return [
            {
                "id": a.id,
                "job_requisition_id": a.job_requisition_id,
                "candidate_name": a.candidate_name,
                "candidate_email": a.candidate_email,
                "status": a.status,
                "evaluation_id": a.evaluation_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in apps
        ]
    except Exception as e:
        import logging
        logging.error(f"get_requisition_applications failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch applications")
    finally:
        db.close()


@app.get("/api/v1/applications/candidate")
def get_candidate_applications(email: str = None, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        query = db.query(Application).filter(Application.user_id == user["user_id"])
        if email:
            query = query.filter(Application.candidate_email == email)
        apps = query.order_by(Application.created_at.desc()).all()
        return [
            {
                "id": a.id,
                "job_requisition_id": a.job_requisition_id,
                "candidate_name": a.candidate_name,
                "candidate_email": a.candidate_email,
                "status": a.status,
                "evaluation_id": a.evaluation_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in apps
        ]
    except Exception as e:
        import logging
        logging.error(f"get_candidate_applications failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch applications")
    finally:
        db.close()


@app.get("/api/v1/applications/{id}")
def get_application(id: int, user: dict = Depends(get_current_user_id)):
    db = SessionLocal()
    try:
        app_record = db.query(Application).filter(
            Application.id == id, Application.user_id == user["user_id"]
        ).first()
        if not app_record:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {
            "id": app_record.id,
            "job_requisition_id": app_record.job_requisition_id,
            "candidate_name": app_record.candidate_name,
            "candidate_email": app_record.candidate_email,
            "status": app_record.status,
            "evaluation_id": app_record.evaluation_id,
            "resume_text": app_record.resume_text,
            "created_at": app_record.created_at.isoformat() if app_record.created_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.error(f"get_application failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch application")
    finally:
        db.close()


@app.post("/api/v1/applications/{id}/evaluate")
def evaluate_application(id: int, user: dict = Depends(get_evaluate_user)):
    db = SessionLocal()
    try:
        app_record = db.query(Application).join(JobRequisition).filter(
            Application.id == id,
            JobRequisition.user_id == user["user_id"]
        ).first()
        if not app_record:
            raise HTTPException(status_code=404, detail="Application not found")

        req_record = db.query(JobRequisition).filter(
            JobRequisition.id == app_record.job_requisition_id
        ).first()
        if not req_record:
            raise HTTPException(status_code=404, detail="Job Requisition not found")

        job_desc = f"{req_record.title}\n\n{req_record.description}\n\nRequired Skills: {', '.join(req_record.required_skills)}"
        
        request = EvaluateRequest(
            resume_text=app_record.resume_text,
            job_description=job_desc,
            job_requisition_id=req_record.id,
            required_skills=req_record.required_skills,
            nice_to_have_skills=req_record.nice_to_have_skills
        )

        # No anonymization — pass real resume text directly into the pipeline
        initial_state = {
            "request": request,
            "steps": ["Pipeline initialized with real candidate data."],
        }

        try:
            result = graph_app.invoke(initial_state)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=str(e),
            )

        dossier = result.get("final_dossier") if isinstance(result, dict) else None
        if dossier is None:
            raise HTTPException(
                status_code=500,
                detail="LangGraph invocation failed: no final_dossier was returned",
            )

        dossier_data = dossier.model_dump() if hasattr(dossier, "model_dump") else dossier
        if isinstance(dossier_data, dict):
            dossier_data["candidate_email"] = app_record.candidate_email

        evaluation = Evaluation(
            user_id=user["user_id"],
            job_requisition_id=request.job_requisition_id,
            anonymized_id=None,
            candidate_name=app_record.candidate_name,
            score=getattr(dossier, "score", 0) or 0,
            verdict=getattr(dossier, "verdict", "Pending"),
            forensic_confidence_score=getattr(dossier, "hire_confidence_score", None),
            alternative_matches=getattr(dossier, "alternative_matches", []) or [],
            full_dossier=dossier_data,
        )
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)

        app_record.status = "Evaluated"
        app_record.evaluation_id = evaluation.id
        db.commit()

        return {
            "status": "success",
            "evaluation_id": evaluation.id,
            "dossier": dossier,
            "data": dossier,
            "audit_trail": result.get("steps", []),
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()