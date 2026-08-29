from typing import Optional

from pydantic import BaseModel


class QuestionOut(BaseModel):
    slot: str  # Q1..Q8 | P1..P5
    kind: str  # BINARY | IMPRESSION
    situation: Optional[str] = None
    choice_a: Optional[str] = None
    choice_b: Optional[str] = None
    text: Optional[str] = None

    class Config:
        from_attributes = True
