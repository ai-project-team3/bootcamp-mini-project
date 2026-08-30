from typing import Literal

from pydantic import BaseModel


class VoteRequest(BaseModel):
    voter_id: str
    target_id: str


class ExecutionVoteRequest(BaseModel):
    voter_id: str
    verdict: Literal["guilty", "innocent"]


class NightActionRequest(BaseModel):
    actor_id: str
    action_type: Literal["kill", "investigate", "protect"]
    target_id: str
