from pydantic import BaseModel


class AnswerSubmitRequest(BaseModel):
    player_id: str
    choice: str  # A | B
    elapsed_ms: int


class AnswerStatusResponse(BaseModel):
    """Plan doc §3-4 — only the tally goes back, never who picked what.

    Once players know their answer will be shown next to their name they pick
    what looks good rather than what is true, and the abilities end up
    measuring the impression they wanted to leave. The split still shows, so
    the table still argues about it; nobody is identified.
    """

    question_no: int
    submitted: int
    total: int
    revealed: bool
    count_a: int = 0
    count_b: int = 0
