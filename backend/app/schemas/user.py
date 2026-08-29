from pydantic import BaseModel, Field


class UserCreateResponse(BaseModel):
    user_id: str
    nickname: str
    gender: str

    class Config:
        from_attributes = True


class UserProfileRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=20)
    gender: str = "UNSET"  # FEMALE | MALE | UNSET
