import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

SQLITE_URL = f"sqlite:///{(BACKEND_DIR / 'talentgraph.db').as_posix()}"
_raw_url = (os.environ.get("DATABASE_URL") or "").strip()

# Remote Supabase host is currently unresolvable in this environment.
# Persist locally so requisitions actually render for the presentation.
if (not _raw_url) or _raw_url.startswith("sqlite") or "supabase.co" in _raw_url:
    DATABASE_URL = SQLITE_URL
else:
    DATABASE_URL = _raw_url

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {"connect_timeout": 3}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=not DATABASE_URL.startswith("sqlite"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
