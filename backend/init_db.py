import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import engine, Base, SessionLocal
from models import JobRequisition, Evaluation

def init():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    if db.query(JobRequisition).count() == 0:
        print("Populating initial data...")
        req1 = JobRequisition(
            user_id="test-user-id",
            title="Senior Backend Engineer",
            description="Looking for an experienced backend developer with Python and distributed systems knowledge.",
            required_skills=["Python", "FastAPI", "PostgreSQL", "Docker", "System Design"],
            nice_to_have_skills=["Kubernetes", "GraphQL"]
        )
        req2 = JobRequisition(
            user_id="test-user-id",
            title="Frontend Developer",
            description="Looking for a React expert to build our UI.",
            required_skills=["React", "TypeScript", "Next.js", "TailwindCSS"],
            nice_to_have_skills=["Redux", "Framer Motion"]
        )
        req3 = JobRequisition(
            user_id="test-user-id",
            title="Technical Product Manager",
            description="PM with technical chops.",
            required_skills=["Product Strategy", "Agile", "Jira", "API Design", "Python"],
            nice_to_have_skills=["SQL", "Figma"]
        )
        db.add_all([req1, req2, req3])
        db.commit()
        print("Database initialized.")
    else:
        print("Database already has records.")
    db.close()

if __name__ == "__main__":
    init()
