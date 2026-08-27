"""Dev-only table bootstrap. Replace with Alembic migrations once the schema stabilizes."""

from .database import engine
from .models import Base


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("tables created")
