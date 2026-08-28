from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings

# echo/pool_pre_ping tuning happens once real MariaDB traffic shows up.
engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
