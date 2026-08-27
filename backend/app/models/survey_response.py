from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class SurveyResponse(Base):
    """One raw answer. Plan doc §9.

    Scoring reads from here rather than storing only the derived axis value, so
    a change to the scoring rules can be replayed over answers already given
    instead of forcing everyone to retake the survey.
    """

    __tablename__ = "survey_responses"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    item_id: Mapped[str] = mapped_column(String(16), primary_key=True)  # e.g. "DOM-1"
    choice: Mapped[str] = mapped_column(String(1))  # A | B | C | D
