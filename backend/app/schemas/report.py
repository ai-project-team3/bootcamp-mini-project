from pydantic import BaseModel


class TypeInfo(BaseModel):
    name: str
    quote: str
    quote_sub: str
    strength: str


class CompatEntry(BaseModel):
    with_nickname: str
    grade: str
    total: float


class ReportResponse(BaseModel):
    """Skeleton of the §11 report response contract. No scoring/LLM logic yet."""

    name: str
    type: TypeInfo
    badges: list[str]
    compat: list[CompatEntry]
    narrative: str
