from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.guess import Guess
from ..models.player import Player
from ..models.report import Report
from ..models.room import Room
from ..models.statement import Statement
from ..schemas.report import CompatEntry, PlayerReport, RoomReportResponse, TeamReport, TeamRole
from ..services.scoring import (
    COMPAT_NOTES,
    assign_badges,
    build_comments,
    build_highlights,
    compute_behavior_abilities,
    compute_compat,
    compute_full_obs,
    compute_half_obs,
    compute_impression_abilities,
    compute_lie_correct_counts,
    compute_roles,
    compute_team_grade,
    compute_type_guess_correct_counts,
    determine_type,
)

router = APIRouter(prefix="/rooms/{code}/report", tags=["report"])


@router.get("", response_model=RoomReportResponse)
def get_report(code: str, db: Session = Depends(get_db)) -> RoomReportResponse:
    room = db.query(Room).filter(Room.code == code).first()
    if room is None:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다")
    if room.status != "DONE":
        raise HTTPException(status_code=400, detail="아직 게임이 끝나지 않았습니다")

    players = db.query(Player).filter(Player.room_id == room.id).order_by(Player.seat_no).all()
    if len(players) != room.player_limit:
        raise HTTPException(status_code=400, detail="플레이어 수가 올바르지 않습니다")

    behavior = compute_behavior_abilities(db, room.id, players)
    lie_correct = compute_lie_correct_counts(db, room.id)
    type_correct = compute_type_guess_correct_counts(db, room.id, players)
    impression_pre = compute_impression_abilities(db, room.id, "IMPRESSION_PRE", players)
    impression_post = compute_impression_abilities(db, room.id, "IMPRESSION_POST", players)

    abilities: dict[str, dict[str, float]] = {}
    provisional_types: dict[str, str] = {}
    final_types: dict[str, str] = {}
    for p in players:
        a = dict(behavior[p.id])
        obs_half = compute_half_obs(lie_correct, p.id, len(players))
        obs_full = compute_full_obs(lie_correct, type_correct, p.id, len(players))
        provisional_types[p.id] = determine_type(a["DOM"], a["EXP"], obs_half, a["SPD"])
        a["OBS"] = obs_full
        abilities[p.id] = a
        final_types[p.id] = determine_type(a["DOM"], a["EXP"], obs_full, a["SPD"])

    self_guess_by_player: dict[str, str] = {}
    for g in db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == "TYPE").all():
        if g.guesser_id == g.target_player_id and g.target_type_code:
            self_guess_by_player[g.guesser_id] = g.target_type_code

    badges = assign_badges(db, room, players, lie_correct, type_correct, self_guess_by_player, provisional_types)

    compat_by_player: dict[str, list[CompatEntry]] = {p.id: [] for p in players}
    for i, a_player in enumerate(players):
        for b_player in players[i + 1 :]:
            grade, tag = compute_compat(abilities[a_player.id], abilities[b_player.id])
            note = COMPAT_NOTES.get((grade, tag), "")
            compat_by_player[a_player.id].append(CompatEntry(nickname=b_player.nickname, grade=grade, tag=tag, note=note))
            compat_by_player[b_player.id].append(CompatEntry(nickname=a_player.nickname, grade=grade, tag=tag, note=note))

    player_reports = []
    for p in players:
        lie_stmt = (
            db.query(Statement)
            .filter(Statement.room_id == room.id, Statement.player_id == p.id, Statement.is_lie.is_(True))
            .first()
        )
        quote = lie_stmt.text if lie_stmt else None
        catches = (
            db.query(Guess)
            .filter(Guess.room_id == room.id, Guess.kind == "LIE", Guess.target_statement_id == lie_stmt.id)
            .count()
            if lie_stmt
            else 0
        )
        fooled = len(players) - 1 - catches
        quote_note = f"{fooled}명이 속았습니다" if lie_stmt else None

        player_reports.append(
            PlayerReport(
                player_id=p.id,
                nickname=p.nickname,
                gender=p.gender,
                mbti=p.mbti,
                abilities=abilities[p.id],
                impression_pre=impression_pre[p.id],
                impression_post=impression_post[p.id],
                type_code=final_types[p.id],
                self_guess=self_guess_by_player.get(p.id),
                badges=badges[p.id],
                quote=quote,
                quote_note=quote_note,
                compat=compat_by_player[p.id],
                comment_lines=build_comments(abilities[p.id], impression_pre[p.id]),
            )
        )

    team = compute_team_grade(db, room, players, abilities)
    roles = compute_roles(players, abilities)
    highlights = build_highlights(db, room, players, badges)

    _upsert_cache(db, room, players, final_types, badges, player_reports)

    return RoomReportResponse(
        session_id=room.id,
        players=player_reports,
        team=TeamReport(
            rank=team["rank"],
            summary=team["summary"],
            reasons=team["reasons"],
            roles=[TeamRole(**r) for r in roles],
            highlights=highlights,
        ),
    )


def _upsert_cache(
    db: Session,
    room: Room,
    players: list[Player],
    final_types: dict[str, str],
    badges: dict[str, list[str]],
    player_reports: list[PlayerReport],
) -> None:
    by_player = {pr.player_id: pr for pr in player_reports}
    for p in players:
        pr = by_player[p.id]
        row = db.query(Report).filter(Report.room_id == room.id, Report.player_id == p.id).first()
        if row is None:
            db.add(
                Report(
                    room_id=room.id,
                    player_id=p.id,
                    type_code=final_types[p.id],
                    comment_lines=pr.comment_lines,
                    badges=badges[p.id],
                    quote=pr.quote,
                )
            )
        else:
            row.type_code = final_types[p.id]
            row.comment_lines = pr.comment_lines
            row.badges = badges[p.id]
            row.quote = pr.quote
    db.commit()
