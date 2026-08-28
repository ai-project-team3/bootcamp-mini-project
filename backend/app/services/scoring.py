"""얼음땡 기획안 §5~§9, §11 산출 로직. GET /rooms/{code}/report에서 한 번만
계산해 Report 테이블에 캐시한다.
"""

from collections import Counter, defaultdict
from typing import Optional

from sqlalchemy.orm import Session

from ..constants import DEFAULT_BADGE, TEAM_GRADES_BY_HIT_COUNT, TYPES
from ..content.comments import CLOSING_LINES, DEFAULT_CLOSING, DEFAULT_OPENING, OPENING_LINES, TEAM_REASON_LINES
from ..content.questions import DOM_QUESTIONS, EMP_QUESTIONS, EXP_QUESTIONS, IMPRESSION_QUESTIONS
from ..models.answer import Answer
from ..models.guess import Guess
from ..models.player import Player
from ..models.room import Room
from ..models.statement import Statement

SPD_FAST_MS = 3000
SPD_SLOW_MS = 12000
TYPE_THRESHOLD = 2.5
TYPE_TIE_MARGIN = 0.3

ROLE_DEFS = [
    ("총괄", "DOM", "주도력 1위. 판을 먼저 벌립니다"),
    ("발표", "EXP", "표현력 1위. 말이 제일 잘 붙습니다"),
    ("기록·문서", "OBS", "관찰력 1위. 남이 흘린 걸 다 봅니다"),
    ("조율", "EMP", "공감력 1위. 갈렸을 때 중간을 찾습니다"),
    ("실행", "SPD", "순발력 1위. 제일 먼저 손이 나갑니다"),
]

COMPAT_NOTES = {
    ("S", "보완"): "능력치가 정반대라 서로 없는 걸 채웁니다",
    ("A", "보완"): "서로 다른 걸 하나씩 갖고 있습니다",
    ("B", "보완"): "조금씩 다르지만 아직은 낯섭니다",
    ("S", "닮음"): "말이 안 통할 일이 없습니다",
    ("A", "닮음"): "비슷한 선택을 자주 했습니다",
    ("B", "닮음"): "닮았지만 아직 서로를 잘 모릅니다",
}


def _clamp(value: float, lo: float = 0.0, hi: float = 5.0) -> float:
    return max(lo, min(hi, value))


def compute_behavior_abilities(db: Session, room_id: str, players: list[Player]) -> dict[str, dict[str, float]]:
    """§5 DOM/EXP/EMP/SPD. OBS는 compute_half_obs/compute_full_obs에서 별도 계산."""
    answers = db.query(Answer).filter(Answer.room_id == room_id).all()
    by_player: dict[str, dict[int, Answer]] = defaultdict(dict)
    for a in answers:
        by_player[a.player_id][a.question_no] = a

    result: dict[str, dict[str, float]] = {}
    for player in players:
        pans = by_player.get(player.id, {})

        def ratio(question_nos: tuple[int, ...]) -> float:
            picked_a = sum(1 for n in question_nos if pans.get(n) and pans[n].choice == "A")
            return _clamp((picked_a / len(question_nos)) * 5)

        dom = ratio(DOM_QUESTIONS)
        exp = ratio(EXP_QUESTIONS)
        emp = ratio(EMP_QUESTIONS)

        elapsed = [a.elapsed_ms for a in pans.values()]
        if elapsed:
            avg_ms = sum(elapsed) / len(elapsed)
            if avg_ms <= SPD_FAST_MS:
                spd = 5.0
            elif avg_ms >= SPD_SLOW_MS:
                spd = 0.0
            else:
                spd = 5.0 * (SPD_SLOW_MS - avg_ms) / (SPD_SLOW_MS - SPD_FAST_MS)
        else:
            spd = 2.5

        result[player.id] = {"DOM": dom, "EXP": exp, "EMP": emp, "SPD": _clamp(spd)}
    return result


def compute_lie_correct_counts(db: Session, room_id: str) -> dict[str, int]:
    """플레이어별 '남의 거짓말을 맞힌 횟수' (0~4)."""
    guesses = db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == "LIE").all()
    correct: dict[str, int] = defaultdict(int)
    for g in guesses:
        if g.target_statement_id is None:
            continue
        stmt = db.get(Statement, g.target_statement_id)
        if stmt is not None and stmt.is_lie:
            correct[g.guesser_id] += 1
    return correct


def compute_type_guess_correct_counts(db: Session, room_id: str, players: list[Player]) -> dict[str, int]:
    """플레이어별 '남의 유형 카드를 맞힌 횟수' (0~4). round_no에 담긴 카드 실소유자의
    seat_no와 guess.target_player_id의 seat_no가 같으면 정답."""
    seat_by_player = {p.id: p.seat_no for p in players}
    guesses = (
        db.query(Guess)
        .filter(Guess.room_id == room_id, Guess.kind == "TYPE", Guess.round_no.isnot(None))
        .all()
    )
    correct: dict[str, int] = defaultdict(int)
    for g in guesses:
        target_seat = seat_by_player.get(g.target_player_id)
        if target_seat is not None and target_seat == g.round_no:
            correct[g.guesser_id] += 1
    return correct


def compute_half_obs(lie_correct: dict[str, int], player_id: str, player_count: int) -> float:
    """§4-4: 거짓 찾기 정답 수가 관찰력의 절반을 만든다 — 유형 카드 노출 시점 값.
    분모(기획안 원문 4)는 나 외 인원수(player_count - 1)로 일반화했다."""
    others = max(player_count - 1, 1)
    return _clamp((lie_correct.get(player_id, 0) / others) * 2.5, 0.0, 2.5)


def compute_full_obs(lie_correct: dict[str, int], type_correct: dict[str, int], player_id: str, player_count: int) -> float:
    """§5: 관찰력 = (거짓 찾기 정답 + 유형 맞히기 정답) / (2 × 나 외 인원수) × 5 — 최종
    리포트 값. 분모(기획안 원문 4+4)는 나 외 인원수 기준으로 일반화했다."""
    others = max(player_count - 1, 1)
    lie = lie_correct.get(player_id, 0)
    type_ = type_correct.get(player_id, 0)
    return _clamp((lie + type_) / (2 * others) * 5)


def _tiebreak_level(value: float, spd: float) -> str:
    if abs(value - TYPE_THRESHOLD) <= TYPE_TIE_MARGIN:
        return "H" if spd >= TYPE_THRESHOLD else "L"
    return "H" if value >= TYPE_THRESHOLD else "L"


def determine_type(dom: float, exp: float, obs: float, spd: float) -> str:
    """§6: DOM×EXP×OBS를 2.5 기준 H/L로 갈라 8종. 동점(±0.3)은 SPD로 타이브레이크."""
    dom_l = _tiebreak_level(dom, spd)
    exp_l = _tiebreak_level(exp, spd)
    obs_l = _tiebreak_level(obs, spd)
    for code, spec in TYPES.items():
        if spec["dom"] == dom_l and spec["exp"] == exp_l and spec["obs"] == obs_l:
            return code
    return "T8"


def compute_impression_totals(db: Session, room_id: str, kind: str) -> dict[str, int]:
    guesses = db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == kind).all()
    totals: dict[str, int] = defaultdict(int)
    for g in guesses:
        if g.target_player_id:
            totals[g.target_player_id] += 1
    return totals


def compute_impression_abilities(
    db: Session, room_id: str, kind: str, players: list[Player]
) -> dict[str, dict[str, float]]:
    """첫인상 투표 결과를 능력치 축으로 환산한 점선 레이더 값(§5 '두 종류의 선')."""
    guesses = db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == kind).all()
    counts: dict[str, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for g in guesses:
        if g.target_player_id and g.round_no:
            counts[g.target_player_id][g.round_no] += 1
    question_ability = {q["question_no"]: q["ability"] for q in IMPRESSION_QUESTIONS}
    max_votes = max(len(players) - 1, 1)  # 한 문항에서 받을 수 있는 최대 득표 = 나 외 인원수
    result: dict[str, dict[str, float]] = {}
    for p in players:
        abilities = {}
        for qn, ability in question_ability.items():
            votes = counts[p.id].get(qn, 0)
            abilities[ability] = _clamp((votes / max_votes) * 5)
        result[p.id] = abilities
    return result


def compute_avg_elapsed(db: Session, room_id: str, players: list[Player]) -> dict[str, float]:
    answers = db.query(Answer).filter(Answer.room_id == room_id).all()
    by_player: dict[str, list[int]] = defaultdict(list)
    for a in answers:
        by_player[a.player_id].append(a.elapsed_ms)
    return {p.id: (sum(by_player[p.id]) / len(by_player[p.id]) if by_player[p.id] else 0.0) for p in players}


def compute_minority_and_match_counts(
    db: Session, room_id: str, players: list[Player]
) -> tuple[dict[str, int], dict[str, int]]:
    answers = db.query(Answer).filter(Answer.room_id == room_id).all()
    by_question: dict[int, list[Answer]] = defaultdict(list)
    for a in answers:
        by_question[a.question_no].append(a)

    minority: dict[str, int] = defaultdict(int)
    matched: dict[str, int] = defaultdict(int)
    for alist in by_question.values():
        counts = Counter(a.choice for a in alist)
        if len(counts) < 2:
            for a in alist:
                matched[a.player_id] += 1
            continue
        majority_choice, _ = counts.most_common(1)[0]
        for a in alist:
            if a.choice == majority_choice:
                matched[a.player_id] += 1
            else:
                minority[a.player_id] += 1
    return minority, matched


def assign_badges(
    db: Session,
    room: Room,
    players: list[Player],
    lie_correct: dict[str, int],
    type_correct: dict[str, int],
    self_guess_by_player: dict[str, Optional[str]],
    provisional_type_by_player: dict[str, str],
) -> dict[str, list[str]]:
    """§7 칭호 10종. 모든 참가자는 최소 하나를 받는다(기본값 예측대로)."""
    badges: dict[str, list[str]] = {p.id: [] for p in players}

    # 관찰왕
    totals = {p.id: lie_correct.get(p.id, 0) + type_correct.get(p.id, 0) for p in players}
    best = max(totals.values(), default=0)
    if best > 0:
        for pid, v in totals.items():
            if v == best:
                badges[pid].append("관찰왕")

    # 완벽한 거짓말쟁이
    for p in players:
        lie_stmt = (
            db.query(Statement)
            .filter(Statement.room_id == room.id, Statement.player_id == p.id, Statement.is_lie.is_(True))
            .first()
        )
        if lie_stmt is None:
            continue
        catches = (
            db.query(Guess)
            .filter(Guess.room_id == room.id, Guess.kind == "LIE", Guess.target_statement_id == lie_stmt.id)
            .count()
        )
        if catches == 0:
            badges[p.id].append("완벽한 거짓말쟁이")

    # 첫인상 배신자 / 예측대로
    pre_totals = compute_impression_totals(db, room.id, "IMPRESSION_PRE")
    post_totals = compute_impression_totals(db, room.id, "IMPRESSION_POST")
    deltas = {p.id: abs(post_totals.get(p.id, 0) - pre_totals.get(p.id, 0)) for p in players}
    if deltas:
        max_delta = max(deltas.values())
        min_delta = min(deltas.values())
        for pid, d in deltas.items():
            if d == max_delta and max_delta > 0:
                badges[pid].append("첫인상 배신자")
            if d == min_delta:
                badges[pid].append("예측대로")

    # 최다 지목
    grand_totals = {p.id: pre_totals.get(p.id, 0) + post_totals.get(p.id, 0) for p in players}
    if grand_totals and max(grand_totals.values()) > 0:
        top = max(grand_totals.values())
        for pid, v in grand_totals.items():
            if v == top:
                badges[pid].append("최다 지목")

    # 번개손 / 제일 오래 고민한 사람
    avg_elapsed = {pid: v for pid, v in compute_avg_elapsed(db, room.id, players).items() if v > 0}
    if avg_elapsed:
        fastest = min(avg_elapsed.values())
        slowest = max(avg_elapsed.values())
        for pid, v in avg_elapsed.items():
            if v == fastest:
                badges[pid].append("번개손")
            if v == slowest:
                badges[pid].append("제일 오래 고민한 사람")

    # 소수파 / 만장일치
    minority, matched = compute_minority_and_match_counts(db, room.id, players)
    if minority and max(minority.values()) > 0:
        max_minor = max(minority.values())
        for pid, v in minority.items():
            if v == max_minor:
                badges[pid].append("소수파")
    if matched and max(matched.values()) > 0:
        max_match = max(matched.values())
        for pid, v in matched.items():
            if v == max_match:
                badges[pid].append("만장일치")

    # 자기 예언자
    for p in players:
        self_guess = self_guess_by_player.get(p.id)
        if self_guess and self_guess == provisional_type_by_player.get(p.id):
            badges[p.id].append("자기 예언자")

    for p in players:
        if not badges[p.id]:
            badges[p.id].append(DEFAULT_BADGE)

    return badges


def compute_compat(abilities_a: dict[str, float], abilities_b: dict[str, float]) -> tuple[str, str]:
    """§8: 5개 능력치 절대차 합(0~25)으로 S/A/B 등급과 보완/닮음 태그.

    등급 컷오프는 기획안에 수치가 없어 거리의 중심(12.5)에서 얼마나 먼지를
    기준으로 임의 배정했다(중심에서 먼 1/3=S, 다음 1/3=A, 중심 1/3=B).
    """
    distance = sum(abs(abilities_a[c] - abilities_b[c]) for c in ("DOM", "SPD", "EXP", "EMP", "OBS"))
    tag = "보완" if distance >= 12.5 else "닮음"
    extremity = abs(distance - 12.5)  # 0~12.5
    if extremity >= 8.33:
        grade = "S"
    elif extremity >= 4.17:
        grade = "A"
    else:
        grade = "B"
    return grade, tag


def _tally_by_question(db: Session, room_id: str, kind: str) -> dict[int, dict[str, int]]:
    guesses = db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == kind).all()
    by_q: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for g in guesses:
        if g.round_no and g.target_player_id:
            by_q[g.round_no][g.target_player_id] += 1
    return by_q


def _top_target(tally: dict[str, int]) -> Optional[str]:
    if not tally:
        return None
    return max(tally.items(), key=lambda kv: kv[1])[0]


def compute_team_grade(db: Session, room: Room, players: list[Player], abilities: dict[str, dict[str, float]]) -> dict:
    """§9: 4지표 각각 '상위' 판정 개수로 SSS~S. 컷오프는 기획안에 수치가
    없어 아래 값으로 임의 배정했다(코드 주석 참고)."""
    # 분산도: 5개 능력치 1위가 서로 다른 사람에게 몇 명이나 흩어졌는지(상위=4명 이상)
    leaders: set[str] = set()
    for code in ("DOM", "SPD", "EXP", "EMP", "OBS"):
        best_val = max(abilities[p.id][code] for p in players)
        for p in players:
            if abilities[p.id][code] == best_val:
                leaders.add(p.id)
                break
    # 컷오프(기획안 원문 4명, 5인 기준)는 인원수 - 1로 일반화했다.
    dispersion_hit = len(leaders) >= max(len(players) - 1, 1)

    # 상호 이해도: 거짓 찾기 전체 정답률(상위=50% 이상)
    lie_guesses = db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == "LIE").all()
    total_lie = len(lie_guesses)
    correct_lie = sum(
        1 for g in lie_guesses if g.target_statement_id and (db.get(Statement, g.target_statement_id) or Statement(is_lie=False)).is_lie
    )
    understanding_hit = (correct_lie / total_lie if total_lie else 0) >= 0.5

    # 인상 변화량: 최다 득표자가 바뀐 문항 수(상위=5문항 중 3개 이상)
    pre_by_q = _tally_by_question(db, room.id, "IMPRESSION_PRE")
    post_by_q = _tally_by_question(db, room.id, "IMPRESSION_POST")
    changed = sum(1 for q in range(1, 6) if _top_target(pre_by_q.get(q, {})) != _top_target(post_by_q.get(q, {})))
    impression_hit = changed >= 3

    # 의견 다양성: 이지선다에서 편이 갈린 문항 수(상위=8문항 중 5개 이상)
    answers = db.query(Answer).filter(Answer.room_id == room.id).all()
    by_q: dict[int, list[str]] = defaultdict(list)
    for a in answers:
        by_q[a.question_no].append(a.choice)
    split_count = sum(1 for choices in by_q.values() if len(set(choices)) > 1)
    diversity_hit = split_count >= 5
    # §5-7 사후 점검: 8문항 중 5개 이상에서 전원이 같은 답을 골랐다면 생성 실패일
    # 가능성이 높다. 오류로 처리하지 않고 팀 요약 문구만 이 경우로 바꾼다.
    unanimous_hit = (8 - split_count) >= 5

    hits = sum([dispersion_hit, understanding_hit, impression_hit, diversity_hit])
    rank = TEAM_GRADES_BY_HIT_COUNT[hits]

    reasons = [
        TEAM_REASON_LINES["dispersion"][dispersion_hit],
        TEAM_REASON_LINES["understanding"][understanding_hit],
        TEAM_REASON_LINES["impression_shift"][impression_hit],
        TEAM_REASON_LINES["opinion_diversity"][diversity_hit],
    ]
    if dispersion_hit and diversity_hit:
        summary = "말은 적은데 결론은 빨리 나는 팀"
    elif understanding_hit and impression_hit:
        summary = "짧은 시간에 서로를 빠르게 파악한 팀"
    elif dispersion_hit:
        summary = "역할이 자연스럽게 나뉘는 팀"
    else:
        summary = "합이 잘 맞는 팀"

    if unanimous_hit:
        summary = "이례적으로 합이 맞은 팀"

    return {"rank": rank, "reasons": reasons, "summary": summary}


def compute_roles(players: list[Player], abilities: dict[str, dict[str, float]]) -> list[dict]:
    """§10-2: 능력치 1위끼리 한 자리씩. 한 사람이 두 축 1위면 두 번째 자리는 2위에게."""
    assigned: set[str] = set()
    roles = []
    for role, code, why in ROLE_DEFS:
        ranking = sorted(players, key=lambda p: -abilities[p.id][code])
        for p in ranking:
            if p.id not in assigned:
                roles.append({"role": role, "nickname": p.nickname, "why": why})
                assigned.add(p.id)
                break
    return roles


def build_highlights(db: Session, room: Room, players: list[Player], badges: dict[str, list[str]]) -> list[str]:
    highlights = []

    pre_totals = compute_impression_totals(db, room.id, "IMPRESSION_PRE")
    post_totals = compute_impression_totals(db, room.id, "IMPRESSION_POST")
    deltas = {p.id: abs(post_totals.get(p.id, 0) - pre_totals.get(p.id, 0)) for p in players}
    if deltas and max(deltas.values()) > 0:
        top_pid = max(deltas, key=lambda pid: deltas[pid])
        player = next(p for p in players if p.id == top_pid)
        highlights.append(f"인상이 제일 많이 바뀐 사람 — {player.nickname}")

    for pid, blist in badges.items():
        if "완벽한 거짓말쟁이" in blist:
            player = next(p for p in players if p.id == pid)
            lie_stmt = (
                db.query(Statement)
                .filter(Statement.room_id == room.id, Statement.player_id == pid, Statement.is_lie.is_(True))
                .first()
            )
            if lie_stmt:
                highlights.append(f'아무도 못 잡은 거짓말 — {player.nickname}: "{lie_stmt.text}"')
            break

    answers = db.query(Answer).filter(Answer.room_id == room.id).all()
    by_q: dict[int, list[str]] = defaultdict(list)
    for a in answers:
        by_q[a.question_no].append(a.choice)
    best_q, best_margin = None, 99
    for q, choices in by_q.items():
        a_count = choices.count("A")
        b_count = len(choices) - a_count
        if a_count and b_count and abs(a_count - b_count) < best_margin:
            best_margin, best_q = abs(a_count - b_count), q
    if best_q:
        highlights.append(f"제일 크게 갈린 문항 — {best_q}번, {by_q[best_q].count('A')} 대 {by_q[best_q].count('B')}")

    return highlights


def build_comments(abilities: dict[str, float], impression_pre: dict[str, float]) -> list[str]:
    """§11: 첫 줄(어긋난 지점) + 마지막 줄(뒤집어 칭찬)을 사전에서 그대로 조합."""
    axes = ("DOM", "EXP", "EMP", "SPD")
    best_axis, best_gap, best_key = None, 0.0, None
    for axis in axes:
        expected = impression_pre.get(axis, 2.5)
        actual = abilities.get(axis, 2.5)
        if expected < TYPE_THRESHOLD <= actual and (actual - expected) > best_gap:
            best_gap, best_axis, best_key = actual - expected, axis, f"{axis}_LOW_TO_HIGH"
        elif expected >= TYPE_THRESHOLD > actual and (expected - actual) > best_gap:
            best_gap, best_axis, best_key = expected - actual, axis, f"{axis}_HIGH_TO_LOW"
    if best_key is None:
        return [DEFAULT_OPENING, DEFAULT_CLOSING]
    return [OPENING_LINES.get(best_key, DEFAULT_OPENING), CLOSING_LINES.get(best_key, DEFAULT_CLOSING)]
