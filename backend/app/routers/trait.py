"""Plan doc §4-5 — ○○님은 ___한 사람이다.

전원이 먼저 자기 답을 고르고, 그다음 한 명씩 돌아가며 나머지가 그 사람의
답을 맞힌다. 맞힌 횟수가 관찰력으로 간다.

타이핑이 없다. 다섯 명이 각자 세 줄을 쓰는 동안 판 전체가 제일 느린 사람을
기다리던 것이 이 단계를 갈아치운 이유다.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..content.game_content import trait_options
from ..database import get_db
from ..models.guess import Guess
from ..models.player import Player
from ..models.room import Room
from ..schemas.trait import (
    TraitGuessRequest,
    TraitOptionsResponse,
    TraitSelfRequest,
    TraitTurnResponse,
)
from ..services.flow import next_phase
from ..utils.room_ctx import get_players, get_room

router = APIRouter(prefix="/rooms/{code}/trait", tags=["trait"])

SELF = "TRAIT_SELF"
GUESS = "TRAIT"


def _self_count(room: Room, db: Session) -> int:
    return db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == SELF).count()


@router.get("/options", response_model=TraitOptionsResponse)
def get_options(code: str, db: Session = Depends(get_db)) -> TraitOptionsResponse:
    room = get_room(code, db)
    return TraitOptionsResponse(
        options=trait_options(db, room.id),
        submitted=_self_count(room, db),
        total=room.player_limit,
    )


@router.post("/self", response_model=TraitOptionsResponse)
def submit_self(code: str, payload: TraitSelfRequest, db: Session = Depends(get_db)) -> TraitOptionsResponse:
    room = get_room(code, db)
    options = trait_options(db, room.id)
    if not 0 <= payload.option_index < len(options):
        raise HTTPException(status_code=400, detail="없는 보기입니다")

    db.query(Guess).filter(
        Guess.room_id == room.id, Guess.kind == SELF, Guess.guesser_id == payload.player_id
    ).delete()
    db.add(
        Guess(
            room_id=room.id,
            kind=SELF,
            guesser_id=payload.player_id,
            target_player_id=payload.player_id,
            target_choice=str(payload.option_index),
        )
    )
    db.commit()
    return TraitOptionsResponse(
        options=options, submitted=_self_count(room, db), total=room.player_limit
    )


@router.get("/turn", response_model=TraitTurnResponse)
def get_turn(code: str, db: Session = Depends(get_db)) -> TraitTurnResponse:
    room = get_room(code, db)
    options = trait_options(db, room.id)
    if _self_count(room, db) < room.player_limit:
        return TraitTurnResponse(done=False, options=options, total=room.player_limit)

    players = get_players(room.id, db)
    others_count = max(room.player_limit - 1, 0)
    previous = None
    for target in players:
        done_for_target = _guess_count(room, target.id, db)
        if done_for_target < others_count:
            # 앞사람이 방금 끝났고 이 사람에게는 아직 아무도 안 냈으면, 앞사람의
            # 정답을 계속 보여준다. 안 그러면 답이 공개되는 화면이 낸 사람에게만
            # 잠깐 스쳤다가 다음 차례로 넘어가서 아무도 못 읽는다.
            pending = TraitTurnResponse(
                done=False,
                options=options,
                target_player_id=target.id,
                nickname=target.nickname,
                submitted=done_for_target,
                total=others_count,
                revealed=False,
            )
            if previous is not None and done_for_target == 0:
                # 앞사람이 방금 끝났고 이 사람에게는 아직 아무도 안 냈다. 앞사람의
                # 정답을 다음 차례 정보와 함께 실어 보낸다 — 화면이 몇 초 보여준
                # 뒤 스스로 넘어간다.
                done_reveal = _revealed(room, previous, options, db, done=False)
                pending.reveal_nickname = done_reveal.nickname
                pending.reveal_index = done_reveal.correct_index
                pending.reveal_correct_guessers = done_reveal.correct_guessers
            return pending
        previous = target
    last = players[-1] if players else None
    if last is None:
        return TraitTurnResponse(done=True, options=options)
    return _revealed(room, last, options, db, done=True)


def _guess_count(room: Room, target_id: str, db: Session) -> int:
    return (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == GUESS, Guess.target_player_id == target_id)
        .count()
    )


@router.post("/{target_player_id}/guess", response_model=TraitTurnResponse)
def submit_guess(
    code: str, target_player_id: str, payload: TraitGuessRequest, db: Session = Depends(get_db)
) -> TraitTurnResponse:
    room = get_room(code, db)
    options = trait_options(db, room.id)
    if payload.guesser_id == target_player_id:
        raise HTTPException(status_code=400, detail="자기 차례에는 맞힐 수 없습니다")
    if not 0 <= payload.option_index < len(options):
        raise HTTPException(status_code=400, detail="없는 보기입니다")

    db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == GUESS,
        Guess.guesser_id == payload.guesser_id,
        Guess.target_player_id == target_player_id,
    ).delete()
    db.add(
        Guess(
            room_id=room.id,
            kind=GUESS,
            guesser_id=payload.guesser_id,
            target_player_id=target_player_id,
            target_choice=str(payload.option_index),
        )
    )
    db.commit()

    target = db.get(Player, target_player_id)
    others_count = max(room.player_limit - 1, 0)
    done_for_target = (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == GUESS, Guess.target_player_id == target_player_id)
        .count()
    )
    if done_for_target < others_count:
        return TraitTurnResponse(
            done=False,
            options=options,
            target_player_id=target_player_id,
            nickname=target.nickname if target else None,
            submitted=done_for_target,
            total=others_count,
        )

    # 이 대상자의 턴이 끝났다. 전원 턴이 끝났으면 다음 단계로.
    players = get_players(room.id, db)
    all_done = all(
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == GUESS, Guess.target_player_id == p.id)
        .count()
        >= others_count
        for p in players
    )
    if all_done and room.phase == "TRAIT":
        room.phase = next_phase("TRAIT", room.player_limit)
        db.commit()
    return _revealed(room, target, options, db, done=all_done)


def _revealed(room: Room, target: Player, options: list[str], db: Session, done: bool) -> TraitTurnResponse:
    own = (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == SELF, Guess.guesser_id == target.id)
        .first()
    )
    correct_index = int(own.target_choice) if own and own.target_choice is not None else None
    guesses = (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == GUESS, Guess.target_player_id == target.id)
        .all()
    )
    nickname = {p.id: p.nickname for p in get_players(room.id, db)}
    hits = [
        nickname[g.guesser_id]
        for g in guesses
        if correct_index is not None
        and g.target_choice == str(correct_index)
        and g.guesser_id in nickname
    ]
    return TraitTurnResponse(
        done=done,
        options=options,
        target_player_id=target.id,
        nickname=target.nickname,
        submitted=len(guesses),
        total=max(room.player_limit - 1, 0),
        revealed=True,
        correct_index=correct_index,
        correct_guessers=hits,
    )
