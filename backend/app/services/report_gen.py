"""얼음땡 기획안 §5-2 — 나올 때 호출.

그 판에서 실제로 있었던 일을 넘겨 코멘트와 팀 요약을 쓴다. 세션당 한 번만
부르고 결과는 Report 행에 남긴다 — 리포트를 다시 열 때마다 문장이 바뀌면
캡처해서 공유한 것과 달라진다.

MBTI는 컨텍스트로만 들어가고 출력에서는 금지어로 막는다(§13). 판정은 이미
끝난 뒤이고, 여기서 하는 일은 문장을 두껍게 만드는 것뿐이다.
"""

import logging
import time
from typing import Optional

from pydantic import BaseModel, Field

from ..config import settings

logger = logging.getLogger(__name__)

COMMENT_MAX_LEN = 90
SUMMARY_MAX_LEN = 40
REASON_MAX_LEN = 70
HIGHLIGHT_MAX_LEN = 80
TIMEOUT_S = 20.0

# 출력에서 이 단어가 하나라도 보이면 통째로 버린다. MBTI를 재탕한 리포트는
# "오늘의 나"가 아니게 된다.
BANNED = (
    "MBTI", "mbti",
    "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
    "내향", "외향", "성격유형", "성향검사", "16가지",
)


class PlayerCommentOut(BaseModel):
    nickname: str
    line1: str = Field(max_length=COMMENT_MAX_LEN)  # 돌려까기
    line2: str = Field(max_length=COMMENT_MAX_LEN)  # 오늘의 장면
    line3: str = Field(max_length=COMMENT_MAX_LEN)  # 뒤집어 칭찬


class GeneratedReport(BaseModel):
    players: list[PlayerCommentOut]
    team_summary: str = Field(max_length=SUMMARY_MAX_LEN)
    team_reasons: list[str]
    highlights: list[str]


PROMPT_RULES = """문구 규칙(§12) — 하나라도 어기면 안 된다.
1. 숫자를 문장에 쓰지 않는다. "6초 만에 골랐다" ✕ → "손이 먼저 나갑니다" ○
2. 까는 대상은 오늘 한 행동이지 사람이 아니다. "게으르다" ✕ → "본인 차례에만
   성실했다" ○ 같은 식으로, 행동을 과장해서 놀리되 인신공격은 하지 않는다.
3. line1·line2는 봐줄 필요 없이 익살스럽게 비꼰다 — 순화하지 않고 세게
   찌른다. line3은 line1에서 깐 바로 그 행동을 뒤집어 반드시 진심 어린
   칭찬으로 마무리한다. 다른 장점을 새로 꺼내지 않는다. 이게 있어야
   돌려까기가 되고, 없으면 그냥 욕이 된다 — 놀리기만 하고 안 띄워주면 실패다.
4. 외모·성별·나이·직업은 소재로 쓰지 않는다.
5. 첫인상 득표는 놀리되 사실로 확정하지 않는다.
6. team_summary와 team_reasons에는 비꼼을 넣지 않는다. 개인은 놀려도 되지만
   팀 전체를 까면 자리 분위기가 죽는다.
7. 각 사람의 MBTI가 흔히 갖는 성향(계획적/즉흥적, 논리적/감정적, 사교적/
   내향적 등)을 line1·line2·line3의 소재로 적극 활용해서 그 사람다운 글로
   만든다. 단 성격유형 검사 이름이나 네 글자 코드, 그 부분 글자(I/E/N/S/T/
   F/J/P 각각), "내향", "외향", "성향검사" 같은 단어는 절대 쓰지 않는다 —
   성향만 녹이고 이름표는 붙이지 않는다.
8. team_reasons와 highlights는 "라벨 — 설명"처럼 항목을 나열하는 형식이
   아니라 처음부터 끝까지 하나로 이어지는 완결된 문장으로 쓴다. 하이픈(-)이나
   대시(—)로 앞뒤를 끊어 붙이지 않는다.
9. highlights(오늘의 장면)는 사실을 나열만 하지 말고, 읽으면 피식 웃음이
   나올 만한 장면으로 골라 재미있게 쓴다. line1·line2만큼 세게 비틀 필요는
   없지만 밋밋한 사실 보고문이 되면 안 된다.
모든 문장은 '~습니다'체로 끝낸다."""


def _clean(result: GeneratedReport, expected_nicknames: set[str]) -> bool:
    texts: list[str] = [result.team_summary, *result.team_reasons, *result.highlights]
    for p in result.players:
        texts += [p.line1, p.line2, p.line3]
    for t in texts:
        if any(word in t for word in BANNED):
            logger.warning("report generation: banned word in %r", t)
            return False
    got = {p.nickname for p in result.players}
    if got != expected_nicknames:
        logger.warning("report generation: nickname mismatch (got %s, want %s)", got, expected_nicknames)
        return False
    if len(result.team_reasons) < 3 or len(result.highlights) < 2:
        logger.warning("report generation: too few reasons/highlights")
        return False
    return True


def generate(context: str, expected_nicknames: set[str]) -> Optional[GeneratedReport]:
    """실패하면 None. 부르는 쪽은 사전 문장으로 그대로 진행한다."""
    if not settings.gemini_api_key:
        return None

    from google import genai
    from google.genai import types

    prompt = (
        "아래는 처음 만난 사람들이 방금 끝낸 18분짜리 아이스브레이킹의 기록이다.\n"
        "이 기록으로 각자의 리포트 코멘트와 팀 리포트를 쓴다.\n\n"
        f"{context}\n\n"
        "톤: 익살스럽게 비꼬다가 마지막에 칭찬 한 줌. 진지한 성격 검사가 아니라 "
        "서로 보여주며 웃는 물건이다.\n\n"
        f"{PROMPT_RULES}\n\n"
        "players: 각 사람마다 line1(찌르는 관찰) · line2(오늘 실제로 있었던 장면) · "
        "line3(line1에서 깐 그 행동을 뒤집어 칭찬) 세 줄. 각 90자 이내.\n"
        "team_summary: 이 팀을 한 줄로. 40자 이내.\n"
        "team_reasons: 등급이 그렇게 나온 이유 4개. 각 70자 이내.\n"
        "highlights: 오늘의 장면 3개. 각 80자 이내.\n"
    )
    started = time.monotonic()
    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeneratedReport,
                # gemini-3.6-flash rejects thinking_budget=0 outright (400 INVALID_ARGUMENT);
                # 1 is the lowest budget it accepts, closest to the original "skip thinking" intent.
                thinking_config=types.ThinkingConfig(thinking_budget=1),
                http_options=types.HttpOptions(timeout=int(TIMEOUT_S * 1000)),
            ),
        )
    except Exception:
        logger.exception("report generation call failed")
        return None

    logger.info("report generation took %.1fs", time.monotonic() - started)
    if response.parsed is None:
        logger.warning("report generation: response did not parse (text=%r)", response.text)
        return None
    if not _clean(response.parsed, expected_nicknames):
        return None
    return response.parsed


def build_context(
    context_line: Optional[str],
    players: list[dict],
    grade: str,
) -> str:
    """LLM에 넘길 기록. 사람이 읽어도 이해되는 형태로 둔다 — 프롬프트를 디버깅할 때
    이 문자열만 보고 무엇이 들어갔는지 알 수 있어야 한다."""
    lines = []
    if context_line:
        lines.append(f"프로젝트: {context_line}")
    lines.append(f"팀 등급: {grade}")
    lines.append("")
    for p in players:
        a = p["abilities"]
        lines.append(
            f"[{p['nickname']}] {p['mbti'] or '-'} · 유형 {p['type_name']}\n"
            f"  능력치 주도 {a['DOM']:.1f} / 순발 {a['SPD']:.1f} / 표현 {a['EXP']:.1f} /"
            f" 공감 {a['EMP']:.1f} / 관찰 {a['OBS']:.1f}\n"
            f"  첫인상 처음 {p['pre_votes']}표 → 나중 {p['post_votes']}표\n"
            f"  본인이 고른 자기 설명: {p['trait'] or '-'} ({p['trait_note'] or '-'})\n"
            f"  맞히기 {p['hits']}/{p['tries']} · 칭호 {', '.join(p['badges']) or '-'}"
        )
    return "\n".join(lines)
