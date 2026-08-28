from pydantic import BaseModel


class SelfGuessRequest(BaseModel):
    player_id: str
    type_code: str


class SelfStatusResponse(BaseModel):
    submitted: int
    total: int
    revealed: bool


class CardOut(BaseModel):
    card_id: str
    type_code: str
    name: str
    subtitle: str
    color: str
    symbol: str


class AssignmentIn(BaseModel):
    card_id: str
    target_player_id: str


class AssignRequest(BaseModel):
    player_id: str
    assignments: list[AssignmentIn]


class AssignResultEntry(BaseModel):
    guesser_nickname: str
    target_player_id: str
    correct: bool


class TypeGuessStatusResponse(BaseModel):
    submitted: int
    total: int
    revealed: bool
    results: list[AssignResultEntry] = []
