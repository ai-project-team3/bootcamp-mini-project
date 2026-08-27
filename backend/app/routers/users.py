from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreateResponse, UserProfileRequest

router = APIRouter(prefix="/users", tags=["users"])

_VALID_GENDERS = {"FEMALE", "MALE", "UNSET"}


@router.post("", response_model=UserCreateResponse)
def create_user(db: Session = Depends(get_db)) -> User:
    """Issue an anonymous identity. Plan doc §4-1.

    No login. The client stores the returned user_id in localStorage and sends it
    with everything afterwards.
    """
    user = User()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserCreateResponse)
def get_user(user_id: str, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if user is None:
        # The browser is holding an id the server no longer knows — cleared data,
        # a different machine, a wiped dev database. The client treats 404 as
        # "start over" and requests a fresh id. Plan doc §4-4.
        raise HTTPException(status_code=404, detail="계정을 찾을 수 없습니다")
    return user


@router.patch("/{user_id}", response_model=UserCreateResponse)
def update_profile(
    user_id: str, payload: UserProfileRequest, db: Session = Depends(get_db)
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="계정을 찾을 수 없습니다")
    if payload.gender not in _VALID_GENDERS:
        raise HTTPException(status_code=400, detail="지원하지 않는 성별 값입니다")

    user.nickname = payload.nickname
    user.gender = payload.gender
    db.commit()
    db.refresh(user)
    return user
