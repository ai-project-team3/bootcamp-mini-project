import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..constants import TYPES
from ..content.game_content import trait_options, type_subtitles
from ..database import get_db
from ..models.ability import Ability
from ..models.guess import Guess
from ..content.questions import IMPRESSION_QUESTIONS
from ..models.player import Player
from ..models.question import Question
from ..models.report import Report
from ..models.room import Room
from ..schemas.report import (
    CompatEntry,
    ImpressionShift,
    PlayerReport,
    RoomReportResponse,
    TeamReport,
    TeamRole,
)
from ..services import report_gen
from ..services.scoring import (
    COMPAT_NOTES,
    assign_badges,
    build_comments,
    build_scene_line,
    build_highlights,
    DOM_ANSWER_WEIGHT,
    DOM_NUNCHI_WEIGHT,
    compute_behavior_abilities,
    compute_compat,
    compute_guess_hits,
    compute_impression_abilities,
    compute_impression_totals,
    compute_nunchi_scores,
    compute_roles,
    compute_team_grade,
    determine_type,
    obs_from_hits,
)

router = APIRouter(prefix="/rooms/{code}/report", tags=["report"])

# 관찰력을 잴 수 없을 때 쓰는 중립값 (0~5 스케일의 한가운데)
NEUTRAL_OBS = 2.5

# 한 사람이 달 수 있는 칭호 수 (기획안 §11-1 개인 카드 "칭호 1~2개")
MAX_BADGES = 2


def _three_lines(pair: list[str], scene: str | None) -> list[str]:
    """첫 줄 · 오늘의 장면 · 뒤집어 칭찬. 장면이 없으면 두 줄로 둔다 —
    없는 장면을 지어내면 앞뒤 줄과 어긋나는 게 바로 보인다."""
    if scene is None:
        return pair
    return [pair[0], scene, pair[1]]


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

    subtitles = type_subtitles(db, room.id)
    behavior = compute_behavior_abilities(db, room.id, players)
    nunchi = compute_nunchi_scores(db, room.id, players)
    hits = compute_guess_hits(db, room.id, players)
    impression_pre = compute_impression_abilities(db, room.id, "IMPRESSION_PRE", players)
    impression_post = compute_impression_abilities(db, room.id, "IMPRESSION_POST", players)

    abilities: dict[str, dict[str, float]] = {}
    provisional_types: dict[str, str] = {}
    final_types: dict[str, str] = {}
    for p in players:
        a = dict(behavior[p.id])
        # §6 — 주도력은 문항 둘과 눈치 게임이 나눠 만든다.
        a["DOM"] = a["DOM"] * DOM_ANSWER_WEIGHT + nunchi[p.id] * DOM_NUNCHI_WEIGHT
        # §2 — 혼자면 남을 맞힐 기회가 없다. 0점이 아니라 중립으로 두고 카드에서
        # "잴 수 없었다"고 밝힌다.
        got, tried = hits[p.id]
        obs = NEUTRAL_OBS if len(players) < 2 else obs_from_hits(got, tried)
        a["OBS"] = obs
        abilities[p.id] = a
        provisional_types[p.id] = determine_type(a["DOM"], a["EXP"], obs, a["SPD"])
        final_types[p.id] = provisional_types[p.id]

    self_guess_by_player: dict[str, str] = {}
    for g in db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == "TYPE").all():
        if g.guesser_id == g.target_player_id and g.target_type_code:
            self_guess_by_player[g.guesser_id] = g.target_type_code

    badges = assign_badges(db, room, players, hits, self_guess_by_player, final_types)
    # §8 — 칭호는 한두 개일 때 의미가 있다. 작은 방에서는 조건이 여럿 걸려서
    # 여섯 개가 붙기도 하는데, 그러면 아무것도 특별하지 않다.
    badges = {pid: blist[:MAX_BADGES] for pid, blist in badges.items()}

    compat_by_player: dict[str, list[CompatEntry]] = {p.id: [] for p in players}
    for i, a_player in enumerate(players):
        for b_player in players[i + 1 :]:
            grade, tag = compute_compat(abilities[a_player.id], abilities[b_player.id])
            note = COMPAT_NOTES.get((grade, tag), "")
            compat_by_player[a_player.id].append(CompatEntry(nickname=b_player.nickname, grade=grade, tag=tag, note=note))
            compat_by_player[b_player.id].append(CompatEntry(nickname=a_player.nickname, grade=grade, tag=tag, note=note))

    player_reports = []
    for p in players:
        # §11 인용 — 자유 서술이 없어졌으므로 본인이 자기를 어떻게 골랐는지를
        # 그 자리에 놓는다. 남들이 그걸 맞혔는지가 바로 옆에 붙는다.
        own_trait = (
            db.query(Guess)
            .filter(Guess.room_id == room.id, Guess.kind == "TRAIT_SELF", Guess.guesser_id == p.id)
            .first()
        )
        quote = quote_note = None
        if own_trait is not None and own_trait.target_choice is not None:
            options = trait_options(db, room.id)
            idx = int(own_trait.target_choice)
            if 0 <= idx < len(options):
                quote = options[idx]
                guessers = (
                    db.query(Guess)
                    .filter(Guess.room_id == room.id, Guess.kind == "TRAIT", Guess.target_player_id == p.id)
                    .all()
                )
                right = sum(1 for g in guessers if g.target_choice == own_trait.target_choice)
                if guessers:
                    quote_note = (
                        f"{len(guessers)}명 중 {right}명이 맞혔습니다"
                        if right
                        else f"{len(guessers)}명 전원이 못 맞혔습니다"
                    )

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
                # §7 — 이름은 고정, 부제만 프로젝트 맥락을 탄다
                type_subtitle=subtitles.get(final_types[p.id]) or TYPES[final_types[p.id]]["subtitle"],
                impression_shift=_shift(db, room, p),
                self_guess=self_guess_by_player.get(p.id),
                badges=badges[p.id],
                quote=quote,
                quote_note=quote_note,
                compat=compat_by_player[p.id],
                comment_lines=_three_lines(
                    build_comments(abilities[p.id], impression_pre[p.id]),
                    build_scene_line(db, room, p, players),
                ),
            )
        )

    team = compute_team_grade(db, room, players, abilities)
    roles = compute_roles(players, abilities)
    highlights = build_highlights(db, room, players, badges)

    # §5-2 나올 때 호출 — 세션당 한 번. 이미 쓰인 리포트가 있으면 그걸 그대로
    # 쓴다. 다시 열 때마다 문장이 바뀌면 캡처해서 공유한 것과 달라진다.
    cached = _cached_lines(db, room, players)
    if cached is not None:
        for pr in player_reports:
            if pr.player_id in cached:
                pr.comment_lines = cached[pr.player_id]
        if room.report_summary:
            team["summary"] = room.report_summary
        if room.report_reasons:
            team["reasons"] = json.loads(room.report_reasons)
        if room.report_highlights:
            highlights = json.loads(room.report_highlights)
    else:
        written = _write_report_text(db, room, players, player_reports, hits, team, highlights)
        if written:
            highlights = written

    _upsert_cache(db, room, players, final_types, badges, player_reports)
    _persist_abilities(db, room, abilities, impression_pre, impression_post)

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


def _shift(db: Session, room: Room, player: Player) -> ImpressionShift | None:
    """§11-1 — 처음과 나중에 이 사람이 제일 많이 받은 문항이 무엇이었나.

    득표 수가 아니라 **어떤 문항으로 불렸는지**가 바뀌는 게 이야기가 된다.
    잠수 탈 것 같다던 사람이 제일 먼저 눈치챌 것 같은 사람이 되는 식.
    """
    labels = {q["question_no"]: q["text"] for q in IMPRESSION_QUESTIONS}
    rows = (
        db.query(Question)
        .filter(Question.room_id == room.id, Question.kind == "IMPRESSION")
        .all()
    )
    for r in rows:  # 생성된 문항이 있으면 그 문장을 쓴다
        try:
            labels[int(r.slot[1:])] = r.text or labels.get(int(r.slot[1:]), "")
        except (ValueError, IndexError):
            continue

    def top(kind: str) -> tuple[str, int] | None:
        counts: dict[int, int] = {}
        for g in (
            db.query(Guess)
            .filter(Guess.room_id == room.id, Guess.kind == kind, Guess.target_player_id == player.id)
            .all()
        ):
            if g.round_no:
                counts[g.round_no] = counts.get(g.round_no, 0) + 1
        if not counts:
            return None
        qn = max(counts, key=lambda k: (counts[k], -k))
        return labels.get(qn, ""), counts[qn]

    pre, post = top("IMPRESSION_PRE"), top("IMPRESSION_POST")
    if pre is None or post is None:
        return None
    return ImpressionShift(pre_label=pre[0], pre_votes=pre[1], post_label=post[0], post_votes=post[1])


def _cached_lines(db: Session, room: Room, players: list[Player]) -> dict[str, list[str]] | None:
    """이미 문장이 쓰인 리포트가 있으면 꺼낸다. 전원 몫이 다 있어야 유효하다."""
    rows = db.query(Report).filter(Report.room_id == room.id).all()
    by_player = {r.player_id: r.comment_lines for r in rows if r.comment_lines}
    if len(by_player) < len(players):
        return None
    return by_player


def _write_report_text(
    db: Session,
    room: Room,
    players: list[Player],
    player_reports: list[PlayerReport],
    hits: dict,
    team: dict,
    highlights: list[str],
) -> list[str] | None:
    """LLM이 코멘트와 팀 문장을 쓴다. 실패하면 사전 문장 그대로 두고 None."""
    pre_totals = compute_impression_totals(db, room.id, "IMPRESSION_PRE")
    post_totals = compute_impression_totals(db, room.id, "IMPRESSION_POST")
    payload = []
    by_id = {pr.player_id: pr for pr in player_reports}
    for p in players:
        pr = by_id[p.id]
        got, tried = hits.get(p.id, (0, 0))
        payload.append(
            {
                "nickname": p.nickname,
                "mbti": p.mbti,
                "type_name": TYPES[pr.type_code]["name"],
                "abilities": pr.abilities,
                "pre_votes": pre_totals.get(p.id, 0),
                "post_votes": post_totals.get(p.id, 0),
                "trait": pr.quote,
                "trait_note": pr.quote_note,
                "hits": got,
                "tries": tried,
                "badges": pr.badges,
                "compat": [
                    {"nickname": c.nickname, "grade": c.grade, "tag": c.tag, "note": c.note}
                    for c in pr.compat
                ],
            }
        )
    context = report_gen.build_context(room.context_line, payload, team["rank"])
    result = report_gen.generate(context, {p.nickname for p in players})
    if result is None:
        return None

    by_nick = {c.nickname: c.paragraphs for c in result.players}
    for pr in player_reports:
        if pr.nickname in by_nick:
            pr.comment_lines = by_nick[pr.nickname]
    team["summary"] = result.team_summary
    team["reasons"] = result.team_reasons
    room.report_summary = result.team_summary
    room.report_reasons = json.dumps(result.team_reasons, ensure_ascii=False)
    room.report_highlights = json.dumps(result.highlights, ensure_ascii=False)
    db.commit()
    return result.highlights


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


def _persist_abilities(
    db: Session,
    room: Room,
    behavior: dict[str, dict[str, float]],
    impression_pre: dict[str, dict[str, float]],
    impression_post: dict[str, dict[str, float]],
) -> None:
    """능력치를 남긴다. 리포트 응답만으로는 게임 파트에 넘길 값이 없다.

    출처별로 따로 저장한다 — BEHAVIOR만 진짜 능력치이고 IMPRESSION_*는 레이더
    점선 전용이라, 넘길 때 섞이면 안 된다 (기획안 §6, §14).
    """
    by_source = {
        "BEHAVIOR": behavior,
        "IMPRESSION_PRE": impression_pre,
        "IMPRESSION_POST": impression_post,
    }
    for source, table in by_source.items():
        for player_id, scores in table.items():
            for code, value in scores.items():
                row = (
                    db.query(Ability)
                    .filter(
                        Ability.room_id == room.id,
                        Ability.player_id == player_id,
                        Ability.code == code,
                        Ability.source == source,
                    )
                    .first()
                )
                if row is None:
                    db.add(
                        Ability(
                            room_id=room.id,
                            player_id=player_id,
                            code=code,
                            source=source,
                            value=value,
                        )
                    )
                else:
                    row.value = value
    db.commit()
