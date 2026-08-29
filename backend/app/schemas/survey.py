from pydantic import BaseModel


class SurveyChoice(BaseModel):
    key: str
    text: str


class SurveyItem(BaseModel):
    """Note what is absent: axis id and choice values.

    The client renders this and must not be able to work out which axis an item
    feeds or which direction a choice pushes. Plan doc §10-2: showing the axis
    lets people game their answers.
    """

    id: str
    text: str
    choices: list[SurveyChoice]


class SurveyItemsResponse(BaseModel):
    category: str
    total: int
    items: list[SurveyItem]


class SurveySubmitRequest(BaseModel):
    user_id: str
    answers: dict[str, str]  # item_id -> "A" | "B" | "C" | "D"


class SurveySubmitResponse(BaseModel):
    accepted: int
    complete: bool


class SurveyStateResponse(BaseModel):
    submitted: int
    total: int
    revealed: bool
