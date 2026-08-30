"""Plan doc §4-7 — 라이어 게임.

넷은 "치킨", 한 명만 "피자"를 받는다. 시계 방향으로 한 마디씩 하고, 한 바퀴가
끝나면 **한 바퀴 더 돌지 지금 지목할지**를 다수결로 정한다. 그 투표가 이
게임의 핵심이다 — 더 돌면 정보가 늘지만 라이어에게도 시간을 준다. 단 마지막
바퀴(MAX_LAPS)를 돌고 나면 묻지 않는다. 고를 수 없는 것을 고르게 하면 표가
무시된 것처럼 보인다.

음성은 어디에서도 다루지 않는다. 말은 입으로 하고 화면은 차례만 넘긴다.
"""

import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..content.game_content import LIAR_ROUNDS, liar_words
from ..database import get_db
from ..models.game_result import GameResult
from ..models.guess import Guess
from ..models.liar_round import LiarRound
from ..models.player import Player
from ..models.room import Room
from ..schemas.liar import (
    LiarAccuseRequest,
    LiarContinueRequest,
    LiarNextRequest,
    LiarSeenRequest,
    LiarStateResponse,
    LiarWordGuessRequest,
)
from ..services.flow import next_phase
from ..utils.room_ctx import get_players, get_room

router = APIRouter(prefix="/rooms/{code}/liar", tags=["liar"])

MAX_LAPS = 2  # 상한 3:30을 지키려면 "한 바퀴 더"는 한 번까지
SEEN = "LIAR_SEEN"
ROLE = "LIAR_ROLE"
SURVIVED = "LIAR_SURVIVED"
READY = "LIAR_READY"


def _round(room: Room, db: Session, create: bool = True) -> LiarRound | None:
    rounds = (
        db.query(LiarRound)
        .filter(LiarRound.room_id == room.id)
        .order_by(LiarRound.round_no)
        .all()
    )
    if rounds:
        last = rounds[-1]
        if last.stage != "REVEAL" or last.round_no >= LIAR_ROUNDS:
            return last
        return last  # REVEAL 상태는 /next 를 눌러야 다음 판이 열린다
    if not create:
        return None
    return _open(room, db, 1)


def _open(room: Room, db: Session, round_no: int) -> LiarRound:
    players = get_players(room.id, db)
    words = liar_words(db, room.id)
    pair = words[(round_no - 1) % len(words)]
    # 방과 판 번호로 씨앗을 고정한다. 같은 판을 몇 번 조회해도 라이어가
    # 바뀌지 않고, 판이 바뀌면 다른 사람이 걸린다.
    rng = random.Random(f"{room.id}:liar:{round_no}")
    liar = rng.choice(players)
    row = LiarRound(
        room_id=room.id,
        round_no=round_no,
        stage="WORD",
        lap=1,
        speaker_seat=players[0].seat_no if players else 1,
        liar_player_id=liar.id,
        major_word=pair["major"],
        minor_word=pair["minor"],
    )
    db.add(row)
    db.add(
        GameResult(room_id=room.id, player_id=liar.id, kind=ROLE, round_no=round_no, value=1.0)
    )
    db.commit()
    db.refresh(row)
    return row


@router.get("/state", response_model=LiarStateResponse)
def get_state(code: str, player_id: str = "", db: Session = Depends(get_db)) -> LiarStateResponse:
    room = get_room(code, db)
    return _state(room, _round(room, db), db, player_id)


@router.post("/seen", response_model=LiarStateResponse)
def mark_seen(code: str, payload: LiarSeenRequest, db: Session = Depends(get_db)) -> LiarStateResponse:
    room = get_room(code, db)
    rnd = _round(room, db)
    if rnd.stage != "WORD":
        return _state(room, rnd, db, payload.player_id)

    already = (
        db.query(GameResult)
        .filter(
            GameResult.room_id == room.id,
            GameResult.kind == SEEN,
            GameResult.round_no == rnd.round_no,
            GameResult.player_id == payload.player_id,
        )
        .first()
    )
    if already is None:
        db.add(
            GameResult(
                room_id=room.id, player_id=payload.player_id, kind=SEEN, round_no=rnd.round_no, value=1.0
            )
        )
        db.commit()

    if _seen_count(room, rnd, db) >= room.player_limit:
        rnd.stage = "SPEAK"
        db.commit()
    return _state(room, rnd, db, payload.player_id)


@router.post("/next-speaker", response_model=LiarStateResponse)
def next_speaker(code: str, db: Session = Depends(get_db)) -> LiarStateResponse:
    room = get_room(code, db)
    rnd = _round(room, db)
    if rnd.stage != "SPEAK":
        return _state(room, rnd, db, "")

    players = get_players(room.id, db)
    seats = [p.seat_no for p in players]
    idx = seats.index(rnd.speaker_seat) if rnd.speaker_seat in seats else 0
    if idx + 1 < len(seats):
        rnd.speaker_seat = seats[idx + 1]
    else:
        # 마지막 바퀴였으면 "한 바퀴 더"가 이미 불가능하다. 그런데도 투표를
        # 물으면 전원이 더 돌자고 해도 지목으로 넘어가서, 표가 무시된 것처럼
        # 보인다. 물을 수 없는 것은 묻지 않는다.
        rnd.stage = "ACCUSE" if rnd.lap >= MAX_LAPS else "VOTE"
        rnd.speaker_seat = seats[0] if seats else 1
    db.commit()
    return _state(room, rnd, db, "")


@router.post("/continue-vote", response_model=LiarStateResponse)
def continue_vote(code: str, payload: LiarContinueRequest, db: Session = Depends(get_db)) -> LiarStateResponse:
    room = get_room(code, db)
    rnd = _round(room, db)
    if rnd.stage != "VOTE":
        return _state(room, rnd, db, payload.player_id)

    db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == "LIAR_CONTINUE",
        Guess.guesser_id == payload.player_id,
        Guess.round_no == rnd.round_no,
    ).delete()
    db.add(
        Guess(
            room_id=room.id,
            kind="LIAR_CONTINUE",
            guesser_id=payload.player_id,
            round_no=rnd.round_no,
            target_choice="MORE" if payload.more else "NOW",
        )
    )
    db.commit()

    votes = _continue_votes(room, rnd, db)
    if sum(votes.values()) >= room.player_limit:
        # 동수면 지목으로 간다. 시간이 정해져 있어서 늘리는 쪽에 이점을 주지 않는다.
        if votes["MORE"] > votes["NOW"] and rnd.lap < MAX_LAPS:
            rnd.lap += 1
            rnd.stage = "SPEAK"
            players = get_players(room.id, db)
            rnd.speaker_seat = players[0].seat_no if players else 1
            db.query(Guess).filter(
                Guess.room_id == room.id,
                Guess.kind == "LIAR_CONTINUE",
                Guess.round_no == rnd.round_no,
            ).delete()
        else:
            rnd.stage = "ACCUSE"
        db.commit()
    return _state(room, rnd, db, payload.player_id)


@router.post("/accuse", response_model=LiarStateResponse)
def accuse(code: str, payload: LiarAccuseRequest, db: Session = Depends(get_db)) -> LiarStateResponse:
    room = get_room(code, db)
    rnd = _round(room, db)
    if rnd.stage != "ACCUSE":
        return _state(room, rnd, db, payload.player_id)
    if payload.target_player_id == payload.player_id:
        raise HTTPException(status_code=400, detail="자기 자신은 지목할 수 없습니다")

    db.query(Guess).filter(
        Guess.room_id == room.id,
        Guess.kind == "LIAR_ACCUSE",
        Guess.guesser_id == payload.player_id,
        Guess.round_no == rnd.round_no,
    ).delete()
    db.add(
        Guess(
            room_id=room.id,
            kind="LIAR_ACCUSE",
            guesser_id=payload.player_id,
            target_player_id=payload.target_player_id,
            round_no=rnd.round_no,
        )
    )
    db.commit()

    accusations = _accusations(room, rnd, db)
    if len(accusations) >= room.player_limit:
        tally: dict[str, int] = {}
        for g in accusations:
            tally[g.target_player_id] = tally.get(g.target_player_id, 0) + 1
        rnd.accused_player_id = max(tally, key=lambda pid: (tally[pid], pid))
        rnd.stage = "REVEAL"
        if rnd.accused_player_id != rnd.liar_player_id:
            # 안 걸렸다 — 제시어 맞히기 없이 라이어 승
            db.add(
                GameResult(
                    room_id=room.id,
                    player_id=rnd.liar_player_id,
                    kind=SURVIVED,
                    round_no=rnd.round_no,
                    value=1.0,
                )
            )
        db.commit()
    return _state(room, rnd, db, payload.player_id)


@router.post("/word-guess", response_model=LiarStateResponse)
def word_guess(code: str, payload: LiarWordGuessRequest, db: Session = Depends(get_db)) -> LiarStateResponse:
    """걸린 라이어에게 주는 마지막 기회. 제시어를 맞히면 라이어 승."""
    room = get_room(code, db)
    rnd = _round(room, db)
    if rnd.stage != "REVEAL" or payload.player_id != rnd.liar_player_id:
        raise HTTPException(status_code=409, detail="지금 할 수 없습니다")
    if rnd.liar_guessed_word is not None:
        raise HTTPException(status_code=409, detail="이미 한 번 답했습니다")

    rnd.liar_guessed_word = payload.word.strip()
    if rnd.liar_guessed_word == rnd.major_word:
        db.add(
            GameResult(
                room_id=room.id,
                player_id=rnd.liar_player_id,
                kind=SURVIVED,
                round_no=rnd.round_no,
                value=1.0,
            )
        )
    db.commit()
    return _state(room, rnd, db, payload.player_id)


@router.post("/next", response_model=LiarStateResponse)
def next_round(code: str, payload: LiarNextRequest, db: Session = Depends(get_db)) -> LiarStateResponse:
    """넘어갈 준비가 됐다고 표시한다. 판은 전원이 표시해야 넘어간다.

    예전에는 아무나 한 번 누르면 방 전체가 넘어갔다. 결과와 제시어가 뜨는
    화면인데, 먼저 누른 한 사람 때문에 나머지가 그걸 못 보고 지나갔다.
    """
    room = get_room(code, db)
    rnd = _round(room, db)
    if rnd.stage != "REVEAL":
        return _state(room, rnd, db, payload.player_id)

    already = (
        db.query(GameResult)
        .filter(
            GameResult.room_id == room.id,
            GameResult.kind == READY,
            GameResult.round_no == rnd.round_no,
            GameResult.player_id == payload.player_id,
        )
        .first()
    )
    if already is None:
        db.add(
            GameResult(
                room_id=room.id, player_id=payload.player_id, kind=READY, round_no=rnd.round_no, value=1.0
            )
        )
        db.commit()

    if _ready_count(room, rnd, db) < room.player_limit:
        return _state(room, rnd, db, payload.player_id)

    if rnd.round_no >= LIAR_ROUNDS:
        if room.phase == "LIAR":
            room.phase = next_phase("LIAR", room.player_limit)
            db.commit()
        return _state(room, rnd, db, payload.player_id)
    return _state(room, _open(room, db, rnd.round_no + 1), db, payload.player_id)


def _ready_count(room: Room, rnd: LiarRound, db: Session) -> int:
    return (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == READY, GameResult.round_no == rnd.round_no)
        .count()
    )


def _seen_count(room: Room, rnd: LiarRound, db: Session) -> int:
    return (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == SEEN, GameResult.round_no == rnd.round_no)
        .count()
    )


def _continue_votes(room: Room, rnd: LiarRound, db: Session) -> dict[str, int]:
    rows = (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == "LIAR_CONTINUE", Guess.round_no == rnd.round_no)
        .all()
    )
    return {
        "MORE": sum(1 for g in rows if g.target_choice == "MORE"),
        "NOW": sum(1 for g in rows if g.target_choice == "NOW"),
    }


def _accusations(room: Room, rnd: LiarRound, db: Session) -> list[Guess]:
    return (
        db.query(Guess)
        .filter(Guess.room_id == room.id, Guess.kind == "LIAR_ACCUSE", Guess.round_no == rnd.round_no)
        .all()
    )


def _state(room: Room, rnd: LiarRound | None, db: Session, player_id: str) -> LiarStateResponse:
    if rnd is None:
        return LiarStateResponse(round_no=0, total_rounds=LIAR_ROUNDS, stage="DONE", total=room.player_limit)

    players = get_players(room.id, db)
    nickname = {p.id: p.nickname for p in players}
    seats = [p.seat_no for p in players]
    am_liar = player_id == rnd.liar_player_id
    speaker = next((p for p in players if p.seat_no == rnd.speaker_seat), None)
    votes = _continue_votes(room, rnd, db)

    caught = rnd.accused_player_id == rnd.liar_player_id if rnd.accused_player_id else False
    # 걸린 라이어에게는 아직 한 번의 기회가 남아 있다. 그 기회가 끝나기 전에는
    # 제시어도 승패도 확정하지 않는다 — 답을 보여주고 맞히라고 할 수는 없다.
    pending = rnd.stage == "REVEAL" and caught and rnd.liar_guessed_word is None
    liar_won = False
    if rnd.stage == "REVEAL" and not pending:
        liar_won = (not caught) or (rnd.liar_guessed_word == rnd.major_word)

    return LiarStateResponse(
        round_no=rnd.round_no,
        total_rounds=LIAR_ROUNDS,
        stage=rnd.stage,
        lap=rnd.lap,
        last_lap=rnd.lap >= MAX_LAPS,
        my_word=(rnd.minor_word if am_liar else rnd.major_word) if player_id else None,
        am_i_liar=am_liar,
        seen=_seen_count(room, rnd, db),
        total=room.player_limit,
        speaker_player_id=speaker.id if speaker else None,
        speaker_nickname=speaker.nickname if speaker else None,
        speaker_index=(seats.index(rnd.speaker_seat) + 1) if rnd.speaker_seat in seats else 0,
        votes_more=votes["MORE"],
        votes_now=votes["NOW"],
        voted=votes["MORE"] + votes["NOW"],
        accused=len(_accusations(room, rnd, db)),
        accused_nickname=nickname.get(rnd.accused_player_id) if rnd.accused_player_id else None,
        liar_nickname=nickname.get(rnd.liar_player_id) if rnd.stage == "REVEAL" else None,
        liar_caught=caught,
        major_word=rnd.major_word if rnd.stage == "REVEAL" and not pending else None,
        word_pending=pending,
        liar_won=liar_won,
        ready=_ready_count(room, rnd, db),
        i_am_ready=bool(player_id)
        and db.query(GameResult)
        .filter(
            GameResult.room_id == room.id,
            GameResult.kind == READY,
            GameResult.round_no == rnd.round_no,
            GameResult.player_id == player_id,
        )
        .first()
        is not None,
    )
