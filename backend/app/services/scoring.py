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
from ..models.game_result import GameResult
from ..models.liar_round import LiarRound

SPD_FAST_MS = 3000
SPD_SLOW_MS = 12000
# §6 — 주도력은 문항 둘과 눈치 게임이 나눠 만든다. 문항 쪽이 자기 선택이라
# 더 무겁고, 눈치 게임은 실제로 나섰는지를 본다.
DOM_ANSWER_WEIGHT = 0.6
DOM_NUNCHI_WEIGHT = 0.4

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


def compute_nunchi_scores(db: Session, room_id: str, players: list[Player]) -> dict[str, float]:
    """§4-6 눈치 게임 등수를 0~5로. 먼저 누를수록 높다.

    동시에 눌러 판을 깬 사람은 그 판에서 등수를 못 받는다. 남을 안 보고 눌렀다는
    뜻이라 주도력이 아니라 성급함이다.
    """
    ranks = (
        db.query(GameResult)
        .filter(GameResult.room_id == room_id, GameResult.kind == "NUNCHI_RANK")
        .all()
    )
    clashes = {
        (r.player_id, r.round_no)
        for r in db.query(GameResult)
        .filter(GameResult.room_id == room_id, GameResult.kind == "NUNCHI_CLASH")
        .all()
    }
    n = max(len(players), 1)
    per_player: dict[str, list[float]] = defaultdict(list)
    for r in ranks:
        if (r.player_id, r.round_no) in clashes:
            continue
        # 1등 → 5.0, 꼴찌 → 0.0
        score = 5.0 if n == 1 else 5.0 * (n - r.value) / (n - 1)
        per_player[r.player_id].append(score)
    return {
        p.id: (sum(per_player[p.id]) / len(per_player[p.id]) if per_player[p.id] else 2.5)
        for p in players
    }


def compute_guess_hits(db: Session, room_id: str, players: list[Player]) -> dict[str, tuple[int, int]]:
    """§6 관찰력 — 남을 맞힌 횟수 / 전체 기회.

    기회는 네 곳에서 온다: 텔레파시 ②, ○○님은 ___한 사람, 라이어 지목,
    유형 맞히기. 한 곳에만 기대면 몇 번 찍어 맞힌 게 값을 크게 흔든다.
    """
    seat_by_player = {p.id: p.seat_no for p in players}
    hits: dict[str, int] = defaultdict(int)
    tries: dict[str, int] = defaultdict(int)

    # 텔레파시 ② — 내가 지목한 사람이 나와 같은 걸 골랐나
    tele = db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == "TELEPATHY").all()
    choice = {(g.guesser_id, g.round_no): g.target_choice for g in tele}
    for g in tele:
        tries[g.guesser_id] += 1
        if choice.get((g.target_player_id, g.round_no)) == g.target_choice:
            hits[g.guesser_id] += 1

    # ○○님은 ___한 사람 — 대상자 본인의 답과 같으면 정답
    own = {
        g.guesser_id: g.target_choice
        for g in db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == "TRAIT_SELF").all()
    }
    for g in db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == "TRAIT").all():
        tries[g.guesser_id] += 1
        if own.get(g.target_player_id) == g.target_choice:
            hits[g.guesser_id] += 1

    # 라이어 지목
    liar_by_round = {
        r.round_no: r.player_id
        for r in db.query(GameResult)
        .filter(GameResult.room_id == room_id, GameResult.kind == "LIAR_ROLE")
        .all()
    }
    for g in db.query(Guess).filter(Guess.room_id == room_id, Guess.kind == "LIAR_ACCUSE").all():
        tries[g.guesser_id] += 1
        if liar_by_round.get(g.round_no) == g.target_player_id:
            hits[g.guesser_id] += 1

    # 유형 맞히기 — round_no에 카드 실소유자의 seat_no가 들어 있다
    for g in (
        db.query(Guess)
        .filter(Guess.room_id == room_id, Guess.kind == "TYPE", Guess.round_no.isnot(None))
        .all()
    ):
        tries[g.guesser_id] += 1
        if seat_by_player.get(g.target_player_id) == g.round_no:
            hits[g.guesser_id] += 1

    return {p.id: (hits[p.id], tries[p.id]) for p in players}


def obs_from_hits(hits: int, tries: int) -> float:
    """맞힐 기회가 아예 없었으면 0이 아니라 중립. 못 맞힌 게 아니라 못 재본 것."""
    if tries <= 0:
        return 2.5
    return _clamp(hits / tries * 5)


def compute_half_obs(lie_correct: dict[str, int], player_id: str, player_count: int) -> float:
    """유형 카드를 뿌리는 시점의 임시 관찰력.

    아직 유형 맞히기를 안 했으니 그 몫을 빼고 계산해야 하는데, 이 시점에는
    앞선 세 게임의 기록만 있으면 충분하다. 인자는 하위 호환을 위해 남긴다.
    """
    others = max(player_count - 1, 1)
    return _clamp((lie_correct.get(player_id, 0) / others) * 2.5, 0.0, 2.5)


def compute_full_obs(lie_correct: dict[str, int], type_correct: dict[str, int], player_id: str, player_count: int) -> float:
    """구 산출식. compute_guess_hits + obs_from_hits로 대체됐다."""
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
    hits: dict[str, tuple[int, int]],
    self_guess_by_player: dict[str, Optional[str]],
    type_by_player: dict[str, str],
) -> dict[str, list[str]]:
    """§8 칭호. 모든 참가자는 최소 하나를 받는다(기본값 예측대로)."""
    badges: dict[str, list[str]] = {p.id: [] for p in players}

    # 관찰왕 — 맞힌 횟수 합계 1위
    totals = {p.id: hits.get(p.id, (0, 0))[0] for p in players}
    best = max(totals.values(), default=0)
    if best > 0:
        for pid, v in totals.items():
            if v == best:
                badges[pid].append("관찰왕")

    # 완벽한 라이어 — 라이어였는데 안 걸림
    for r in (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == "LIAR_SURVIVED")
        .all()
    ):
        if r.player_id in badges and "완벽한 라이어" not in badges[r.player_id]:
            badges[r.player_id].append("완벽한 라이어")

    # 눈치왕 — 판을 깬 적이 한 번도 없음 (눈치 게임을 실제로 한 방에서만)
    played = (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == "NUNCHI_RANK")
        .count()
    )
    if played:
        clashers = {
            r.player_id
            for r in db.query(GameResult)
            .filter(GameResult.room_id == room.id, GameResult.kind == "NUNCHI_CLASH")
            .all()
        }
        if clashers:  # 아무도 안 깼으면 전원에게 주는 게 의미가 없다
            for p in players:
                if p.id not in clashers:
                    badges[p.id].append("눈치왕")

    # 텔레파시 — ② 전부 적중
    tele = db.query(Guess).filter(Guess.room_id == room.id, Guess.kind == "TELEPATHY").all()
    if tele:
        choice = {(g.guesser_id, g.round_no): g.target_choice for g in tele}
        per_player: dict[str, list[bool]] = defaultdict(list)
        for g in tele:
            per_player[g.guesser_id].append(
                choice.get((g.target_player_id, g.round_no)) == g.target_choice
            )
        for pid, results in per_player.items():
            if pid in badges and results and all(results):
                badges[pid].append("텔레파시")

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
        if self_guess and self_guess == type_by_player.get(p.id):
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

    # 상호 이해도: 맞히기 전체 정답률(상위=40% 이상)
    # 기회가 네 곳(텔레파시·○○님은·라이어 지목·유형 맞히기)으로 늘면서 순수
    # 찍기의 기대값이 낮아졌다. 컷을 절반에서 40%로 내린 이유.
    hits_map = compute_guess_hits(db, room.id, players)
    total_tries = sum(t for _, t in hits_map.values())
    total_hits = sum(h for h, _ in hits_map.values())
    understanding_hit = (total_hits / total_tries if total_tries else 0) >= 0.4

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

    survived = (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == "LIAR_SURVIVED")
        .first()
    )
    if survived:
        player = next((p for p in players if p.id == survived.player_id), None)
        rnd = (
            db.query(LiarRound)
            .filter(LiarRound.room_id == room.id, LiarRound.round_no == survived.round_no)
            .first()
        )
        if player and rnd:
            highlights.append(f'아무도 못 잡은 라이어 — {player.nickname}, 제시어는 "{rnd.major_word}"였습니다')

    clashes = (
        db.query(GameResult)
        .filter(GameResult.room_id == room.id, GameResult.kind == "NUNCHI_CLASH")
        .all()
    )
    if clashes:
        names = {r.player_id for r in clashes if r.round_no == clashes[0].round_no}
        who = [p.nickname for p in players if p.id in names]
        if len(who) >= 2:
            highlights.append(f"동시에 눌러서 판을 깬 사람 — {' · '.join(who)}")

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
