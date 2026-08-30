from pydantic import BaseModel, Field


class PersonaEntry(BaseModel):
    player_id: str = Field(alias="playerId")
    persona_scores: dict[str, int] = Field(alias="personaScores")

    model_config = {"populate_by_name": True}


class SubmitPersonaRequest(BaseModel):
    players: list[PersonaEntry]
