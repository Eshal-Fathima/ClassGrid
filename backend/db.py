import os

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from models import Base


db_user = os.getenv("DB_USER", "root")
db_password = os.getenv("DB_PASSWORD", "")
db_host = os.getenv("DB_HOST", "localhost")
db_name = os.getenv("DB_NAME", "classgrid")

db_url = f"mysql://{db_user}:{db_password}@{db_host}/{db_name}"

engine = create_engine(db_url, echo=False, future=True)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False))


def init_db() -> None:
  """Create all tables if they do not exist."""
  Base.metadata.create_all(engine)

