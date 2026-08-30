# Persona Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8인 텍스트 토의 스크립트로부터 요약+TTS 브리핑, 발언자별 페르소나 프로필, 페르소나 기반 밸런스 게임을 수행하는 CLI 파이프라인을 만든다.

**Architecture:** `persona_pipeline/` 하위 프로젝트에 세 개의 독립 실행 가능한 스텝 모듈을 두고, 스텝 간 연결은 오직 JSON 파일로만 한다. Anthropic SDK 호출은 `llm.py`에, TTS 호출은 `tts.py`에 격리해 테스트에서 monkeypatch 한 지점으로 대체할 수 있게 한다.

**Tech Stack:** Python 3.11+, `anthropic` SDK (`claude-opus-5`, `client.messages.parse`), `pydantic` v2, `gtts`, `python-dotenv`, `pytest`

**Spec:** `docs/superpowers/specs/2026-08-28-persona-pipeline-design.md`

## Global Constraints

- 모든 신규 파일은 `persona_pipeline/` 아래에 만든다. 기존 `mafia_game/`, `frontend/`, 루트 `tests/`, 루트 `requirements.txt`, 루트 `pyproject.toml`은 **수정하지 않는다.** 예외는 루트 `.gitignore` 두 줄 추가뿐이다.
- LLM 모델 ID는 `claude-opus-5`. 코드에 하드코딩하지 않고 `config.MODEL`을 통해서만 참조한다.
- Anthropic SDK를 import 하는 파일은 `pipeline/llm.py` 하나뿐이다. `gtts`를 import 하는 파일은 `pipeline/tts.py` 하나뿐이다.
- 스텝 모듈은 경로 상수와 외부 호출을 **모듈 속성으로** 참조한다 (`config.SUMMARY_PATH`, `llm.structured(...)`, `tts.synthesize(...)`). `from pipeline.config import SUMMARY_PATH` 처럼 값을 직접 import 하면 monkeypatch가 듣지 않아 테스트가 불가능해진다.
- 모든 JSON 저장은 `json.dump(..., ensure_ascii=False, indent=2)`. 한국어가 이스케이프되면 사람이 읽을 수 없다.
- 모든 사용자 대면 메시지(에러 포함)는 한국어로 쓴다.
- 테스트는 실제 API를 호출하지 않는다. 네트워크가 없어도 `pytest`가 전부 통과해야 한다.
- 커밋 메시지는 기존 리포 관례를 따른다 (`feat:`, `test:`, `docs:`, `chore:`).

---

### Task 1: 프로젝트 스캐폴딩과 설정

**Files:**
- Create: `persona_pipeline/requirements.txt`
- Create: `persona_pipeline/pytest.ini`
- Create: `persona_pipeline/.env.example`
- Create: `persona_pipeline/pipeline/__init__.py`
- Create: `persona_pipeline/pipeline/config.py`
- Create: `persona_pipeline/tests/__init__.py`
- Test: `persona_pipeline/tests/test_config.py`
- Modify: `.gitignore` (루트, 2줄 추가)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `config.BASE_DIR`, `config.ANTHROPIC_API_KEY: str`, `config.MODEL: str`, `config.TTS_LANG: str`, `config.DATA_DIR`, `config.OUTPUT_DIR`, `config.TALK_PATH`, `config.SUMMARY_PATH`, `config.SUMMARY_AUDIO_PATH`, `config.PERSONAS_PATH`, `config.MINIGAME_RESULT_PATH` (모두 `pathlib.Path`), `config.ensure_output_dir() -> Path`

- [ ] **Step 1: 디렉터리와 의존성 파일 만들기**

```bash
mkdir -p persona_pipeline/pipeline persona_pipeline/tests persona_pipeline/data persona_pipeline/output
touch persona_pipeline/pipeline/__init__.py persona_pipeline/tests/__init__.py
```

`persona_pipeline/requirements.txt`:

```
anthropic>=0.70.0
pydantic>=2.9.2
python-dotenv>=1.0.1
gTTS>=2.5.3
pytest>=8.3.3
```

`persona_pipeline/pytest.ini`:

```ini
[pytest]
pythonpath = .
testpaths = tests
```

`persona_pipeline/.env.example`:

```
# Anthropic API 키 (필수) - https://console.anthropic.com 에서 발급
ANTHROPIC_API_KEY=sk-ant-...

# 사용할 모델 (선택, 기본값 claude-opus-5)
# 반복 테스트로 비용을 줄이려면 claude-sonnet-5 로 바꾼다
ANTHROPIC_MODEL=claude-opus-5

# TTS 언어 (선택, 기본값 ko)
TTS_LANG=ko
```

루트 `.gitignore` 끝에 두 줄 추가:

```
persona_pipeline/.env
persona_pipeline/output/
```

- [ ] **Step 2: 실패하는 테스트 작성**

`persona_pipeline/tests/test_config.py`:

```python
from pathlib import Path

from pipeline import config


def test_paths_are_absolute_and_under_base_dir():
    assert config.BASE_DIR.is_absolute()
    assert config.BASE_DIR.name == "persona_pipeline"
    for path in (
        config.TALK_PATH,
        config.SUMMARY_PATH,
        config.SUMMARY_AUDIO_PATH,
        config.PERSONAS_PATH,
        config.MINIGAME_RESULT_PATH,
    ):
        assert path.is_absolute()
        assert config.BASE_DIR in path.parents


def test_default_model_is_opus_5(monkeypatch):
    assert config.MODEL == "claude-opus-5" or config.MODEL.startswith("claude-")


def test_ensure_output_dir_creates_directory(tmp_path, monkeypatch):
    target = tmp_path / "out"
    monkeypatch.setattr(config, "OUTPUT_DIR", target)
    assert config.ensure_output_dir() == target
    assert target.is_dir()


def test_output_file_names():
    assert config.SUMMARY_PATH.name == "summary.json"
    assert config.SUMMARY_AUDIO_PATH.name == "summary.mp3"
    assert config.PERSONAS_PATH.name == "personas.json"
    assert config.MINIGAME_RESULT_PATH.name == "minigame_result.json"
    assert config.TALK_PATH.name == "dummy_talk.json"
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.config'`

- [ ] **Step 4: `config.py` 구현**

`persona_pipeline/pipeline/config.py`:

```python
"""파이프라인 전역 설정: .env 로드, 모델 ID, 산출물 경로."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-5")
TTS_LANG = os.getenv("TTS_LANG", "ko")

DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"

TALK_PATH = DATA_DIR / "dummy_talk.json"
SUMMARY_PATH = OUTPUT_DIR / "summary.json"
SUMMARY_AUDIO_PATH = OUTPUT_DIR / "summary.mp3"
PERSONAS_PATH = OUTPUT_DIR / "personas.json"
MINIGAME_RESULT_PATH = OUTPUT_DIR / "minigame_result.json"


def ensure_output_dir() -> Path:
    """산출물 디렉터리를 만들고 경로를 돌려준다."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR
```

`ensure_output_dir()`는 모듈 전역 `OUTPUT_DIR`을 함수 안에서 읽는다. 테스트가 `monkeypatch.setattr(config, "OUTPUT_DIR", ...)`로 바꿔치기할 수 있어야 하기 때문이다.

- [ ] **Step 5: 의존성 설치 후 테스트 통과 확인**

```bash
cd persona_pipeline
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m pytest tests/test_config.py -v
```

Expected: 4 passed

- [ ] **Step 6: 커밋**

```bash
git add persona_pipeline/requirements.txt persona_pipeline/pytest.ini persona_pipeline/.env.example persona_pipeline/pipeline/__init__.py persona_pipeline/pipeline/config.py persona_pipeline/tests/__init__.py persona_pipeline/tests/test_config.py .gitignore
git commit -m "feat: scaffold persona_pipeline with config module"
```

---

### Task 2: Pydantic 스키마

**Files:**
- Create: `persona_pipeline/pipeline/schemas.py`
- Test: `persona_pipeline/tests/test_schemas.py`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `Utterance(speaker: str, text: str)`
  - `KeyIssue(title: str, description: str, sides: list[str])`
  - `DiscussionSummary(three_line_summary: list[str], key_issues: list[KeyIssue], briefing_script: str)` — `three_line_summary`는 정확히 3개
  - `PersonaProfile(personality_traits: list[str], speaking_style: list[str], stance: str, system_prompt: str)` — LLM 출력용
  - `Persona(speaker: str, personality_traits: list[str], speaking_style: list[str], stance: str, system_prompt: str)` + 클래스메서드 `Persona.from_profile(speaker: str, profile: PersonaProfile) -> Persona`
  - `BalanceChoice(choice: str, reason: str)` — LLM 출력용
  - `PersonaAnswer(speaker: str, choice: str, reason: str)` + `PersonaAnswer.from_choice(speaker: str, choice: BalanceChoice) -> PersonaAnswer`
  - `MinigameResult(question: str, options: list[str], answers: list[PersonaAnswer], tally: dict[str, int])`

**설계 메모:** LLM이 반환하는 스키마(`PersonaProfile`, `BalanceChoice`)에는 `speaker`가 없다. 발언자는 우리가 이미 알고 있는 값이므로 모델이 되받아 쓰게 하면 오타·불일치 위험만 생긴다. 저장 파일에 들어가는 `Persona`/`PersonaAnswer`에는 스펙대로 `speaker`가 들어가고, 우리가 붙인다.

- [ ] **Step 1: 실패하는 테스트 작성**

`persona_pipeline/tests/test_schemas.py`:

```python
import pytest
from pydantic import ValidationError

from pipeline.schemas import (
    BalanceChoice,
    DiscussionSummary,
    KeyIssue,
    Persona,
    PersonaAnswer,
    PersonaProfile,
    Utterance,
)


def _summary(lines):
    return DiscussionSummary(
        three_line_summary=lines,
        key_issues=[KeyIssue(title="비용", description="비용이 쟁점", sides=["찬성", "반대"])],
        briefing_script="오늘 회의를 요약해 드리겠습니다.",
    )


def test_three_line_summary_accepts_exactly_three():
    summary = _summary(["첫째 줄", "둘째 줄", "셋째 줄"])
    assert len(summary.three_line_summary) == 3


@pytest.mark.parametrize("lines", [["하나"], ["하나", "둘"], ["하나", "둘", "셋", "넷"]])
def test_three_line_summary_rejects_wrong_count(lines):
    with pytest.raises(ValidationError):
        _summary(lines)


def test_utterance_fields():
    u = Utterance(speaker="User1", text="찬성합니다")
    assert u.speaker == "User1"
    assert u.text == "찬성합니다"


def test_persona_from_profile_attaches_speaker():
    profile = PersonaProfile(
        personality_traits=["논리적", "분석적"],
        speaking_style=["단정적 어조"],
        stance="비용 효율을 최우선으로 본다.",
        system_prompt="당신은 User1입니다. 답변은 1~2문장으로 유지하세요.",
    )
    persona = Persona.from_profile("User1", profile)
    assert persona.speaker == "User1"
    assert persona.personality_traits == ["논리적", "분석적"]
    assert persona.system_prompt == profile.system_prompt


def test_persona_answer_from_choice_attaches_speaker():
    choice = BalanceChoice(choice="야근한다", reason="기한이 신뢰의 문제이기 때문입니다.")
    answer = PersonaAnswer.from_choice("User4", choice)
    assert answer.speaker == "User4"
    assert answer.choice == "야근한다"
    assert answer.reason.endswith("때문입니다.")
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_schemas.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.schemas'`

- [ ] **Step 3: `schemas.py` 구현**

`persona_pipeline/pipeline/schemas.py`:

```python
"""파이프라인 전 구간에서 쓰는 Pydantic 모델.

LLM 구조화 출력 스키마이기도 하므로 Field(description=...) 이 모델에게 전달되는
지시문 역할을 한다. 요구사항은 여기 한 곳에만 쓰고 프롬프트에서 반복하지 않는다.
"""

from pydantic import BaseModel, Field, field_validator


class Utterance(BaseModel):
    """토의 스크립트의 발언 한 줄."""

    speaker: str
    text: str


class KeyIssue(BaseModel):
    title: str = Field(description="쟁점을 한 줄로 요약한 제목")
    description: str = Field(description="쟁점 설명. 1~2문장.")
    sides: list[str] = Field(description="이 쟁점에서 갈린 입장들")


class DiscussionSummary(BaseModel):
    three_line_summary: list[str] = Field(
        description="토의 전체를 요약한 세 문장. 반드시 정확히 3개."
    )
    key_issues: list[KeyIssue] = Field(description="주요 쟁점 2~4개")
    briefing_script: str = Field(
        description=(
            "라디오 브리핑처럼 소리 내어 읽었을 때 자연스러운 한국어 서술문 3~5문장. "
            "불릿이나 번호 목록을 쓰지 말 것."
        )
    )

    @field_validator("three_line_summary")
    @classmethod
    def exactly_three_lines(cls, value: list[str]) -> list[str]:
        if len(value) != 3:
            raise ValueError(f"three_line_summary 는 정확히 3개여야 합니다 (받은 개수: {len(value)})")
        return value


class PersonaProfile(BaseModel):
    """LLM이 발언 묶음으로부터 추출하는 페르소나 본문 (speaker 제외)."""

    personality_traits: list[str] = Field(
        description="성격 특성 키워드 3~5개. 예: 논리적, 신중함, 감성적"
    )
    speaking_style: list[str] = Field(
        description="말투와 어조의 특징 2~4개. 예: 단정적 어조, 의문문을 자주 사용, 비유적 표현"
    )
    stance: str = Field(description="토의에서의 기본 입장과 가치관. 1~2문장.")
    system_prompt: str = Field(
        description=(
            "이 사람을 모사하기 위한 LLM용 시스템 프롬프트. "
            "'당신은 ...입니다' 형태의 1인칭 역할 지시문으로 쓰고, 성격·말투·입장을 "
            "필드 나열이 아니라 서술 문장으로 녹여 쓸 것. "
            "마지막에 '답변은 1~2문장으로 유지하세요.' 라는 지시를 반드시 포함할 것."
        )
    )


class Persona(BaseModel):
    """personas.json 에 저장되는 최종 페르소나 프로필."""

    speaker: str
    personality_traits: list[str]
    speaking_style: list[str]
    stance: str
    system_prompt: str

    @classmethod
    def from_profile(cls, speaker: str, profile: PersonaProfile) -> "Persona":
        return cls(speaker=speaker, **profile.model_dump())


class BalanceChoice(BaseModel):
    """LLM이 페르소나를 연기하며 내놓는 밸런스 게임 답변 (speaker 제외)."""

    choice: str = Field(description="주어진 두 선택지 중 하나를 글자 그대로 쓸 것")
    reason: str = Field(description="그 선택을 한 이유. 페르소나의 말투를 유지한 1~2문장.")


class PersonaAnswer(BaseModel):
    speaker: str
    choice: str
    reason: str

    @classmethod
    def from_choice(cls, speaker: str, choice: BalanceChoice) -> "PersonaAnswer":
        return cls(speaker=speaker, **choice.model_dump())


class MinigameResult(BaseModel):
    question: str
    options: list[str]
    answers: list[PersonaAnswer]
    tally: dict[str, int]
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_schemas.py -v`
Expected: 7 passed

- [ ] **Step 5: 커밋**

```bash
git add persona_pipeline/pipeline/schemas.py persona_pipeline/tests/test_schemas.py
git commit -m "feat: add pydantic schemas for pipeline"
```

---

### Task 3: 더미 대화 데이터와 transcript 로더

**Files:**
- Create: `persona_pipeline/data/dummy_talk.json`
- Create: `persona_pipeline/pipeline/transcript.py`
- Test: `persona_pipeline/tests/test_transcript.py`

**Interfaces:**
- Consumes: `schemas.Utterance`
- Produces:
  - `load_transcript(path: Path) -> list[Utterance]` — 파일이 없으면 `TranscriptError`
  - `group_by_speaker(utterances: list[Utterance]) -> dict[str, list[str]]` — 발언자 첫 등장 순서, 발언 원래 순서 보존
  - `format_full_script(utterances: list[Utterance]) -> str` — `"User1: 텍스트"` 줄들을 `\n`으로 이음
  - `TranscriptError(RuntimeError)`

- [ ] **Step 1: 더미 대화 데이터 작성**

`persona_pipeline/data/dummy_talk.json` — 주제는 "사내 업무 도구를 외부 SaaS로 전환할 것인가". 8명이 각각 5회씩 발언하며 성격이 뚜렷이 구분된다.

```json
[
  {"speaker": "User1", "text": "저는 이 제안에 찬성합니다. 자체 구축 대비 3년 총소유비용이 40% 낮게 나왔습니다."},
  {"speaker": "User2", "text": "하지만 고객 데이터가 외부 서버에 올라가는 건데, 보안 검토는 끝난 건가요?"},
  {"speaker": "User3", "text": "저는 숫자보다 팀원들이 얼마나 힘들어했는지가 더 마음에 걸려요. 지금 도구 때문에 다들 지쳐 있습니다."},
  {"speaker": "User4", "text": "전환합시다. 고민할 시간에 이미 경쟁사는 옮겼습니다."},
  {"speaker": "User5", "text": "지금 우리는 낡은 집을 고칠지 새 집으로 이사할지 고르는 셈인데, 이삿짐부터 세어봐야죠."},
  {"speaker": "User6", "text": "실무 입장에서 말씀드리면, 지난달 배치 작업만 해도 커스텀 스크립트가 열두 개 물려 있습니다."},
  {"speaker": "User7", "text": "2년 전에도 똑같은 얘기로 도구 바꿨다가 반년 만에 되돌렸죠. 그때 회의록 다시 읽어보셨나요?"},
  {"speaker": "User8", "text": "정리하면 지금 쟁점은 비용, 보안, 마이그레이션 비용 세 가지인 것 같은데 맞을까요?"},
  {"speaker": "User1", "text": "마이그레이션 비용까지 포함해서 계산한 수치입니다. 인건비 환산 1.2억, 절감액 4.5억입니다."},
  {"speaker": "User2", "text": "그 절감액은 SaaS 요금이 인상되지 않는다는 전제 아닌가요? 계약서에 인상 상한 조항은 있습니까?"},
  {"speaker": "User3", "text": "저는 조건부로 찬성이에요. 다만 전환 기간에 야근이 몰리지 않도록 일정을 넉넉히 잡았으면 합니다."},
  {"speaker": "User4", "text": "일정을 늘리면 그만큼 비용도 늘어납니다. 3개월 안에 끝냅시다."},
  {"speaker": "User5", "text": "너무 빨리 달리면 짐을 흘리기 마련입니다. 속도보다 순서를 정하는 게 먼저 아닐까요."},
  {"speaker": "User6", "text": "구체적으로는 정산 모듈이 문제입니다. 이건 외부 도구에 대응되는 기능이 아예 없습니다."},
  {"speaker": "User7", "text": "결국 또 예외 처리로 스크립트를 짜게 될 텐데, 그럼 뭐가 달라지는 거죠."},
  {"speaker": "User8", "text": "User6님 말씀은 정산 모듈이 전환 범위에서 빠져야 한다는 뜻으로 이해하면 될까요?"},
  {"speaker": "User1", "text": "정산 모듈을 제외해도 나머지 80% 업무에서 절감 효과는 유지됩니다. 데이터로 확인했습니다."},
  {"speaker": "User2", "text": "그러면 두 시스템을 동시에 운영하게 되는데, 그 이중 운영 리스크는 누가 책임지나요?"},
  {"speaker": "User3", "text": "책임을 따지기보다 함께 감당할 방법을 찾았으면 좋겠어요. 다들 잘해보려는 마음은 같잖아요."},
  {"speaker": "User4", "text": "책임은 제가 지겠습니다. 결정을 미루는 게 가장 큰 리스크입니다."},
  {"speaker": "User5", "text": "우산을 미리 챙기는 사람과 비를 맞고 뛰는 사람 둘 다 필요합니다. 지금은 우산을 챙길 때 같습니다."},
  {"speaker": "User6", "text": "파일럿으로 한 팀만 두 달 써보면 실제 공수가 나옵니다. 추정치로 싸우는 것보다 낫습니다."},
  {"speaker": "User7", "text": "파일럿도 지난번에 했습니다. 결과가 좋았는데도 전체 확대에서 무너졌죠."},
  {"speaker": "User8", "text": "그럼 지난번 실패 원인을 먼저 정리하고, 그게 이번에 해소됐는지 확인하는 건 어떨까요?"},
  {"speaker": "User1", "text": "합리적입니다. 실패 원인 분석과 파일럿 지표를 같은 문서에 정리하겠습니다."},
  {"speaker": "User2", "text": "보안 검토 보고서도 그 문서에 첨부해 주시면 좋겠습니다. 없으면 저는 찬성하기 어렵습니다."},
  {"speaker": "User3", "text": "전환하더라도 교육 시간을 업무 시간 안에 넣어주세요. 그것만으로도 부담이 많이 줄어듭니다."},
  {"speaker": "User4", "text": "좋습니다. 대신 다음 주까지 결론을 냅시다. 더 끌 이유가 없습니다."},
  {"speaker": "User5", "text": "결론을 서두르되 되돌아올 길은 남겨둡시다. 계약에 해지 조항이 있는지 확인이 필요합니다."},
  {"speaker": "User6", "text": "제가 정산 모듈 대체 방안을 이번 주 안에 두 가지로 정리해 오겠습니다."},
  {"speaker": "User7", "text": "기대는 안 하지만, 그 정리는 읽어보겠습니다. 이번엔 근거가 있길 바랍니다."},
  {"speaker": "User8", "text": "그럼 다음 회의 안건은 보안 보고서, 파일럿 설계, 정산 모듈 대안 세 가지로 정리하겠습니다."},
  {"speaker": "User1", "text": "동의합니다. 비용 모델은 파일럿 결과가 나오는 대로 갱신하겠습니다."},
  {"speaker": "User2", "text": "한 가지만 더요. 데이터가 어느 국가 리전에 저장되는지도 확인이 필요하지 않을까요?"},
  {"speaker": "User3", "text": "좋은 지적이에요. 그리고 전환 과정에서 힘든 사람이 있으면 편하게 말할 창구도 있으면 합니다."},
  {"speaker": "User4", "text": "창구는 제 자리입니다. 언제든 오십시오. 그럼 다음 주에 결정하는 걸로 하죠."},
  {"speaker": "User5", "text": "급한 강일수록 다리를 튼튼히 놓아야 합니다. 다음 주 결정 전에 문서를 꼭 돌려주세요."},
  {"speaker": "User6", "text": "문서는 제가 취합하겠습니다. 실무 체크리스트 형태로 만들면 검토가 빠를 겁니다."},
  {"speaker": "User7", "text": "체크리스트에 지난번 실패 항목도 그대로 넣어주세요. 같은 자리에서 또 넘어지긴 싫습니다."},
  {"speaker": "User8", "text": "정리됐습니다. 오늘은 여기까지 하고, 각자 맡은 항목을 다음 회의에서 확인하겠습니다."}
]
```

- [ ] **Step 2: 실패하는 테스트 작성**

`persona_pipeline/tests/test_transcript.py`:

```python
import json

import pytest

from pipeline import config
from pipeline.schemas import Utterance
from pipeline.transcript import (
    TranscriptError,
    format_full_script,
    group_by_speaker,
    load_transcript,
)

SAMPLE = [
    Utterance(speaker="User1", text="첫 발언"),
    Utterance(speaker="User2", text="두 번째"),
    Utterance(speaker="User1", text="세 번째"),
]


def test_group_by_speaker_preserves_order():
    grouped = group_by_speaker(SAMPLE)
    assert list(grouped.keys()) == ["User1", "User2"]
    assert grouped["User1"] == ["첫 발언", "세 번째"]
    assert grouped["User2"] == ["두 번째"]


def test_format_full_script():
    assert format_full_script(SAMPLE) == "User1: 첫 발언\nUser2: 두 번째\nUser1: 세 번째"


def test_load_transcript_reads_json(tmp_path):
    path = tmp_path / "talk.json"
    path.write_text(
        json.dumps([{"speaker": "User1", "text": "안녕"}], ensure_ascii=False),
        encoding="utf-8",
    )
    result = load_transcript(path)
    assert result == [Utterance(speaker="User1", text="안녕")]


def test_load_transcript_missing_file_raises(tmp_path):
    with pytest.raises(TranscriptError) as exc:
        load_transcript(tmp_path / "없음.json")
    assert "찾을 수 없" in str(exc.value)


def test_load_transcript_empty_list_raises(tmp_path):
    path = tmp_path / "talk.json"
    path.write_text("[]", encoding="utf-8")
    with pytest.raises(TranscriptError):
        load_transcript(path)


def test_bundled_dummy_talk_has_eight_speakers():
    utterances = load_transcript(config.TALK_PATH)
    grouped = group_by_speaker(utterances)
    assert list(grouped.keys()) == [f"User{i}" for i in range(1, 9)]
    for speaker, texts in grouped.items():
        assert len(texts) >= 4, f"{speaker} 의 발언이 너무 적습니다"
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_transcript.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.transcript'`

- [ ] **Step 4: `transcript.py` 구현**

`persona_pipeline/pipeline/transcript.py`:

```python
"""토의 스크립트 로딩과 정리. LLM 호출이 없는 순수 함수 모듈."""

import json
from pathlib import Path

from pipeline.schemas import Utterance


class TranscriptError(RuntimeError):
    """스크립트 파일을 읽을 수 없거나 내용이 비어 있을 때."""


def load_transcript(path: Path) -> list[Utterance]:
    if not path.exists():
        raise TranscriptError(
            f"대화 스크립트 파일을 찾을 수 없습니다: {path}\n"
            f"data/dummy_talk.json 이 있는지 확인하세요."
        )
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise TranscriptError(f"대화 스크립트 JSON 형식이 잘못되었습니다: {path} ({exc})") from exc

    if not isinstance(raw, list) or not raw:
        raise TranscriptError(f"대화 스크립트가 비어 있습니다: {path}")

    return [Utterance(**item) for item in raw]


def group_by_speaker(utterances: list[Utterance]) -> dict[str, list[str]]:
    """발언자별 발언 묶음. 발언자는 첫 등장 순서, 발언은 원래 순서를 유지한다.

    말투 분석에서 발언 순서가 의미를 가지므로 정렬하지 않는다.
    """
    grouped: dict[str, list[str]] = {}
    for utterance in utterances:
        grouped.setdefault(utterance.speaker, []).append(utterance.text)
    return grouped


def format_full_script(utterances: list[Utterance]) -> str:
    return "\n".join(f"{u.speaker}: {u.text}" for u in utterances)
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_transcript.py -v`
Expected: 6 passed

- [ ] **Step 6: 커밋**

```bash
git add persona_pipeline/data/dummy_talk.json persona_pipeline/pipeline/transcript.py persona_pipeline/tests/test_transcript.py
git commit -m "feat: add dummy discussion data and transcript loader"
```

---

### Task 4: Anthropic LLM 래퍼

**Files:**
- Create: `persona_pipeline/pipeline/llm.py`
- Test: `persona_pipeline/tests/test_llm.py`

**Interfaces:**
- Consumes: `config.MODEL`, `config.ANTHROPIC_API_KEY`
- Produces:
  - `LLMError(RuntimeError)`
  - `structured(system: str, prompt: str, model_cls: type[T]) -> T`
  - `roleplay(system_prompt: str, prompt: str, model_cls: type[T]) -> T`
  - `_get_client() -> anthropic.Anthropic` (테스트에서 monkeypatch 하는 지점)

**설계 메모:** `structured`와 `roleplay`는 구현이 같고 `_call`에 위임한다. 이름을 나눈 이유는 호출부 가독성이다 — `structured`는 우리가 쓴 시스템 프롬프트로 데이터를 뽑을 때, `roleplay`는 `personas.json`에서 온 시스템 프롬프트로 캐릭터를 연기시킬 때 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`persona_pipeline/tests/test_llm.py`:

```python
import anthropic
import httpx2 as httpx
import pytest
from pydantic import BaseModel

from pipeline import llm


class Answer(BaseModel):
    value: str


class FakeMessages:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        return self.result


class FakeClient:
    def __init__(self, messages):
        self.messages = messages


def _install(monkeypatch, messages):
    monkeypatch.setattr(llm, "_get_client", lambda: FakeClient(messages))
    return messages


class FakeResponse:
    def __init__(self, parsed_output):
        self.parsed_output = parsed_output


def test_structured_returns_parsed_output(monkeypatch):
    messages = _install(monkeypatch, FakeMessages(result=FakeResponse(Answer(value="ok"))))
    result = llm.structured("시스템", "질문", Answer)
    assert result == Answer(value="ok")
    call = messages.calls[0]
    assert call["output_format"] is Answer
    assert call["system"] == "시스템"
    assert call["messages"] == [{"role": "user", "content": "질문"}]
    assert call["thinking"] == {"type": "adaptive"}


def test_roleplay_passes_persona_prompt_as_system(monkeypatch):
    messages = _install(monkeypatch, FakeMessages(result=FakeResponse(Answer(value="ok"))))
    llm.roleplay("당신은 User1입니다.", "질문", Answer)
    assert messages.calls[0]["system"] == "당신은 User1입니다."


def _http_error(cls, status_code):
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx.Response(status_code, request=request)
    return cls("boom", response=response, body=None)


def test_authentication_error_becomes_korean_llm_error(monkeypatch):
    _install(monkeypatch, FakeMessages(error=_http_error(anthropic.AuthenticationError, 401)))
    with pytest.raises(llm.LLMError) as exc:
        llm.structured("s", "p", Answer)
    assert "ANTHROPIC_API_KEY" in str(exc.value)


def test_rate_limit_error_becomes_korean_llm_error(monkeypatch):
    _install(monkeypatch, FakeMessages(error=_http_error(anthropic.RateLimitError, 429)))
    with pytest.raises(llm.LLMError) as exc:
        llm.structured("s", "p", Answer)
    assert "요청 한도" in str(exc.value)


def test_connection_error_becomes_korean_llm_error(monkeypatch):
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    _install(monkeypatch, FakeMessages(error=anthropic.APIConnectionError(request=request)))
    with pytest.raises(llm.LLMError) as exc:
        llm.structured("s", "p", Answer)
    assert "네트워크" in str(exc.value)


def test_missing_api_key_raises_before_any_call(monkeypatch):
    monkeypatch.setattr(llm.config, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(llm, "_client", None)
    with pytest.raises(llm.LLMError) as exc:
        llm.structured("s", "p", Answer)
    assert ".env" in str(exc.value)
```

`httpx2`는 `anthropic` 1.x가 쓰는 HTTP 라이브러리다. SDK가 0.x라면 `import httpx`로 바꾼다 — 예외 생성에만 쓰이므로 그 외 코드는 동일하다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_llm.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.llm'`

- [ ] **Step 3: `llm.py` 구현**

`persona_pipeline/pipeline/llm.py`:

```python
"""Anthropic API 호출을 격리하는 유일한 모듈.

다른 모듈은 anthropic SDK 를 직접 import 하지 않는다. 테스트는 _get_client 를
monkeypatch 해서 네트워크 없이 전체 파이프라인을 검증한다.
"""

from typing import TypeVar

import anthropic
from pydantic import BaseModel

from pipeline import config

T = TypeVar("T", bound=BaseModel)

MAX_TOKENS = 16000

_client: anthropic.Anthropic | None = None


class LLMError(RuntimeError):
    """LLM 호출 실패를 사용자가 읽을 수 있는 한국어 메시지로 감싼 예외."""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not config.ANTHROPIC_API_KEY:
            raise LLMError(
                "ANTHROPIC_API_KEY 가 설정되지 않았습니다.\n"
                "persona_pipeline/.env 파일을 만들고 (.env.example 복사) "
                "ANTHROPIC_API_KEY 값을 채우세요."
            )
        _client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    return _client


def _call(system: str, prompt: str, model_cls: type[T]) -> T:
    client = _get_client()
    try:
        response = client.messages.parse(
            model=config.MODEL,
            max_tokens=MAX_TOKENS,
            thinking={"type": "adaptive"},
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_format=model_cls,
        )
    except anthropic.AuthenticationError as exc:
        raise LLMError(
            "Anthropic 인증에 실패했습니다. .env 의 ANTHROPIC_API_KEY 값을 확인하세요."
        ) from exc
    except anthropic.RateLimitError as exc:
        raise LLMError(
            "Anthropic API 요청 한도에 걸렸습니다. 잠시 후 다시 실행하세요."
        ) from exc
    except anthropic.APIConnectionError as exc:
        raise LLMError(
            "Anthropic API 에 연결하지 못했습니다. 네트워크 연결을 확인하세요."
        ) from exc
    except anthropic.APIStatusError as exc:
        raise LLMError(
            f"Anthropic API 오류가 발생했습니다 (HTTP {exc.status_code}): {exc.message}"
        ) from exc

    return response.parsed_output


def structured(system: str, prompt: str, model_cls: type[T]) -> T:
    """우리가 작성한 시스템 프롬프트로 구조화된 데이터를 추출한다."""
    return _call(system, prompt, model_cls)


def roleplay(system_prompt: str, prompt: str, model_cls: type[T]) -> T:
    """personas.json 에서 온 시스템 프롬프트로 캐릭터를 연기시킨다."""
    return _call(system_prompt, prompt, model_cls)
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_llm.py -v`
Expected: 7 passed

- [ ] **Step 5: 커밋**

```bash
git add persona_pipeline/pipeline/llm.py persona_pipeline/tests/test_llm.py
git commit -m "feat: add anthropic llm wrapper with korean error messages"
```

---

### Task 5: TTS 래퍼

**Files:**
- Create: `persona_pipeline/pipeline/tts.py`
- Test: `persona_pipeline/tests/test_tts.py`

**Interfaces:**
- Consumes: `config.TTS_LANG`, `config.ensure_output_dir`
- Produces:
  - `TTSError(RuntimeError)`
  - `synthesize(text: str, out_path: Path, lang: str | None = None) -> Path`

- [ ] **Step 1: 실패하는 테스트 작성**

`persona_pipeline/tests/test_tts.py`:

```python
import pytest

from pipeline import tts


class FakeGTTS:
    instances = []

    def __init__(self, text, lang):
        self.text = text
        self.lang = lang
        FakeGTTS.instances.append(self)

    def save(self, path):
        with open(path, "wb") as f:
            f.write(b"fake-mp3")


@pytest.fixture(autouse=True)
def reset_instances():
    FakeGTTS.instances = []


def test_synthesize_writes_file(tmp_path, monkeypatch):
    monkeypatch.setattr(tts, "gTTS", FakeGTTS)
    out = tmp_path / "nested" / "summary.mp3"
    result = tts.synthesize("안녕하세요", out)
    assert result == out
    assert out.read_bytes() == b"fake-mp3"
    assert FakeGTTS.instances[0].text == "안녕하세요"
    assert FakeGTTS.instances[0].lang == "ko"


def test_synthesize_rejects_empty_text(tmp_path, monkeypatch):
    monkeypatch.setattr(tts, "gTTS", FakeGTTS)
    with pytest.raises(tts.TTSError):
        tts.synthesize("   ", tmp_path / "a.mp3")


def test_synthesize_wraps_failure(tmp_path, monkeypatch):
    class Boom:
        def __init__(self, text, lang):
            pass

        def save(self, path):
            raise OSError("network down")

    monkeypatch.setattr(tts, "gTTS", Boom)
    with pytest.raises(tts.TTSError) as exc:
        tts.synthesize("안녕", tmp_path / "a.mp3")
    assert "인터넷 연결" in str(exc.value)
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_tts.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.tts'`

- [ ] **Step 3: `tts.py` 구현**

`persona_pipeline/pipeline/tts.py`:

```python
"""TTS 호출을 격리하는 유일한 모듈.

프로바이더(gTTS)의 세부사항을 밖으로 노출하지 않는다. OpenAI TTS 등으로
교체할 때 synthesize() 내부만 바꾸면 된다.
"""

from pathlib import Path

from gtts import gTTS

from pipeline import config


class TTSError(RuntimeError):
    """음성 합성 실패를 사용자가 읽을 수 있는 한국어 메시지로 감싼 예외."""


def synthesize(text: str, out_path: Path, lang: str | None = None) -> Path:
    """text 를 음성으로 합성해 out_path 에 저장하고 그 경로를 돌려준다."""
    if not text or not text.strip():
        raise TTSError("음성으로 변환할 텍스트가 비어 있습니다.")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        speech = gTTS(text=text, lang=lang or config.TTS_LANG)
        speech.save(str(out_path))
    except Exception as exc:  # gTTS 는 네트워크/언어 오류를 다양한 타입으로 던진다
        raise TTSError(
            f"음성 파일 생성에 실패했습니다: {exc}\n"
            f"gTTS 는 인터넷 연결이 필요합니다. 네트워크 상태를 확인하세요."
        ) from exc

    return out_path
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_tts.py -v`
Expected: 3 passed

- [ ] **Step 5: 커밋**

```bash
git add persona_pipeline/pipeline/tts.py persona_pipeline/tests/test_tts.py
git commit -m "feat: add gtts wrapper"
```

---

### Task 6: Step 1 — 요약 및 TTS 브리핑

**Files:**
- Create: `persona_pipeline/pipeline/step1_summary.py`
- Test: `persona_pipeline/tests/test_step1_summary.py`

**Interfaces:**
- Consumes: `transcript.load_transcript`, `transcript.format_full_script`, `llm.structured`, `tts.synthesize`, `schemas.DiscussionSummary`, `config.TALK_PATH`, `config.SUMMARY_PATH`, `config.SUMMARY_AUDIO_PATH`
- Produces:
  - `SYSTEM_PROMPT: str`
  - `build_prompt(script: str) -> str`
  - `run() -> DiscussionSummary` — 요약 생성 + `summary.json`/`summary.mp3` 저장
  - `main() -> int` — 0=성공, 1=실패

- [ ] **Step 1: 실패하는 테스트 작성**

`persona_pipeline/tests/test_step1_summary.py`:

```python
import json

from pipeline import config, llm, step1_summary, tts
from pipeline.schemas import DiscussionSummary, KeyIssue

FAKE_SUMMARY = DiscussionSummary(
    three_line_summary=["첫째 줄", "둘째 줄", "셋째 줄"],
    key_issues=[KeyIssue(title="비용", description="비용이 쟁점", sides=["찬성", "반대"])],
    briefing_script="오늘 회의를 요약해 드리겠습니다. 비용이 핵심 쟁점이었습니다.",
)


def _patch(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "SUMMARY_PATH", tmp_path / "summary.json")
    monkeypatch.setattr(config, "SUMMARY_AUDIO_PATH", tmp_path / "summary.mp3")
    calls = {}

    def fake_structured(system, prompt, model_cls):
        calls["system"] = system
        calls["prompt"] = prompt
        calls["model_cls"] = model_cls
        return FAKE_SUMMARY

    def fake_synthesize(text, out_path, lang=None):
        calls["tts_text"] = text
        out_path.write_bytes(b"mp3")
        return out_path

    monkeypatch.setattr(llm, "structured", fake_structured)
    monkeypatch.setattr(tts, "synthesize", fake_synthesize)
    return calls


def test_run_writes_summary_json(tmp_path, monkeypatch):
    _patch(monkeypatch, tmp_path)
    step1_summary.run()
    saved = json.loads((tmp_path / "summary.json").read_text(encoding="utf-8"))
    assert saved["three_line_summary"] == ["첫째 줄", "둘째 줄", "셋째 줄"]
    assert saved["key_issues"][0]["title"] == "비용"
    assert "briefing_script" in saved


def test_run_synthesizes_briefing_script_only(tmp_path, monkeypatch):
    calls = _patch(monkeypatch, tmp_path)
    step1_summary.run()
    assert calls["tts_text"] == FAKE_SUMMARY.briefing_script
    assert (tmp_path / "summary.mp3").exists()


def test_prompt_contains_full_script(tmp_path, monkeypatch):
    calls = _patch(monkeypatch, tmp_path)
    step1_summary.run()
    assert "User1:" in calls["prompt"]
    assert "User8:" in calls["prompt"]
    assert calls["model_cls"] is DiscussionSummary


def test_saved_json_is_not_ascii_escaped(tmp_path, monkeypatch):
    _patch(monkeypatch, tmp_path)
    step1_summary.run()
    raw = (tmp_path / "summary.json").read_text(encoding="utf-8")
    assert "첫째 줄" in raw
    assert "\\u" not in raw


def test_main_returns_1_when_transcript_missing(tmp_path, monkeypatch, capsys):
    _patch(monkeypatch, tmp_path)
    monkeypatch.setattr(config, "TALK_PATH", tmp_path / "없음.json")
    assert step1_summary.main() == 1
    assert "찾을 수 없" in capsys.readouterr().out


def test_main_returns_0_on_success(tmp_path, monkeypatch):
    _patch(monkeypatch, tmp_path)
    assert step1_summary.main() == 0
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_step1_summary.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.step1_summary'`

- [ ] **Step 3: `step1_summary.py` 구현**

`persona_pipeline/pipeline/step1_summary.py`:

```python
"""Step 1: 토의 스크립트를 요약하고 TTS 브리핑 음성을 만든다.

실행: python -m pipeline.step1_summary
"""

import json

from pipeline import config, llm, transcript, tts
from pipeline.schemas import DiscussionSummary

SYSTEM_PROMPT = (
    "당신은 회의록을 분석해 의사결정자에게 브리핑하는 전문 애널리스트입니다. "
    "발언 내용에 없는 사실을 추가하지 말고, 특정 입장에 치우치지 않게 요약하세요. "
    "모든 출력은 한국어로 작성합니다."
)

PROMPT_TEMPLATE = """다음은 8명이 참여한 사내 토의 스크립트입니다.

--- 스크립트 시작 ---
{script}
--- 스크립트 끝 ---

이 토의를 세 문장으로 요약하고, 참가자들의 의견이 실제로 갈린 주요 쟁점을 정리한 뒤,
소리 내어 읽을 브리핑 원고를 작성하세요."""


def build_prompt(script: str) -> str:
    return PROMPT_TEMPLATE.format(script=script)


def run() -> DiscussionSummary:
    utterances = transcript.load_transcript(config.TALK_PATH)
    script = transcript.format_full_script(utterances)

    summary = llm.structured(SYSTEM_PROMPT, build_prompt(script), DiscussionSummary)

    config.SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    config.SUMMARY_PATH.write_text(
        json.dumps(summary.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    tts.synthesize(summary.briefing_script, config.SUMMARY_AUDIO_PATH)
    return summary


def main() -> int:
    print("[Step 1] 토의 요약 및 TTS 브리핑 생성")
    try:
        summary = run()
    except (transcript.TranscriptError, llm.LLMError, tts.TTSError) as exc:
        print(f"\n오류: {exc}")
        return 1

    print("\n[3줄 요약]")
    for i, line in enumerate(summary.three_line_summary, 1):
        print(f"  {i}. {line}")

    print("\n[주요 쟁점]")
    for issue in summary.key_issues:
        print(f"  - {issue.title}: {issue.description}")
        print(f"    갈린 입장: {', '.join(issue.sides)}")

    print(f"\n요약 저장: {config.SUMMARY_PATH}")
    print(f"음성 저장: {config.SUMMARY_AUDIO_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_step1_summary.py -v`
Expected: 6 passed

- [ ] **Step 5: 커밋**

```bash
git add persona_pipeline/pipeline/step1_summary.py persona_pipeline/tests/test_step1_summary.py
git commit -m "feat: add step1 summary and tts briefing"
```

---

### Task 7: Step 2 — 페르소나 추출

**Files:**
- Create: `persona_pipeline/pipeline/step2_persona.py`
- Test: `persona_pipeline/tests/test_step2_persona.py`

**Interfaces:**
- Consumes: `transcript.load_transcript`, `transcript.group_by_speaker`, `llm.structured`, `schemas.PersonaProfile`, `schemas.Persona`, `config.TALK_PATH`, `config.PERSONAS_PATH`
- Produces:
  - `SYSTEM_PROMPT: str`
  - `build_prompt(speaker: str, texts: list[str]) -> str`
  - `extract_persona(speaker: str, texts: list[str]) -> Persona`
  - `run() -> list[Persona]` — 병렬 추출 후 `personas.json` 저장
  - `main() -> int`

- [ ] **Step 1: 실패하는 테스트 작성**

`persona_pipeline/tests/test_step2_persona.py`:

```python
import json

import pytest

from pipeline import config, llm, step2_persona
from pipeline.schemas import PersonaProfile


def _profile(speaker):
    return PersonaProfile(
        personality_traits=[f"{speaker}-특성"],
        speaking_style=["단정적 어조"],
        stance=f"{speaker} 의 입장",
        system_prompt=f"당신은 {speaker}입니다. 답변은 1~2문장으로 유지하세요.",
    )


def _patch(monkeypatch, tmp_path, failing_speaker=None):
    monkeypatch.setattr(config, "PERSONAS_PATH", tmp_path / "personas.json")
    seen = []

    def fake_structured(system, prompt, model_cls):
        speaker = next(s for s in [f"User{i}" for i in range(1, 9)] if f"[{s}]" in prompt)
        seen.append(speaker)
        if speaker == failing_speaker:
            raise llm.LLMError("의도된 실패")
        return _profile(speaker)

    monkeypatch.setattr(llm, "structured", fake_structured)
    return seen


def test_run_extracts_all_eight_personas(tmp_path, monkeypatch):
    _patch(monkeypatch, tmp_path)
    personas = step2_persona.run()
    assert [p.speaker for p in personas] == [f"User{i}" for i in range(1, 9)]


def test_saved_json_preserves_original_speaker_order(tmp_path, monkeypatch):
    _patch(monkeypatch, tmp_path)
    step2_persona.run()
    saved = json.loads((tmp_path / "personas.json").read_text(encoding="utf-8"))
    assert [p["speaker"] for p in saved] == [f"User{i}" for i in range(1, 9)]
    assert set(saved[0]) == {
        "speaker",
        "personality_traits",
        "speaking_style",
        "stance",
        "system_prompt",
    }


def test_one_failure_aborts_without_partial_save(tmp_path, monkeypatch):
    _patch(monkeypatch, tmp_path, failing_speaker="User5")
    with pytest.raises(llm.LLMError) as exc:
        step2_persona.run()
    assert "User5" in str(exc.value)
    assert not (tmp_path / "personas.json").exists()


def test_prompt_labels_speaker_and_includes_all_their_texts(tmp_path, monkeypatch):
    prompt = step2_persona.build_prompt("User1", ["첫 발언", "둘째 발언"])
    assert "[User1]" in prompt
    assert "첫 발언" in prompt
    assert "둘째 발언" in prompt


def test_main_returns_1_on_llm_error(tmp_path, monkeypatch, capsys):
    _patch(monkeypatch, tmp_path, failing_speaker="User3")
    assert step2_persona.main() == 1
    assert "User3" in capsys.readouterr().out


def test_main_returns_0_on_success(tmp_path, monkeypatch):
    _patch(monkeypatch, tmp_path)
    assert step2_persona.main() == 0
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_step2_persona.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.step2_persona'`

- [ ] **Step 3: `step2_persona.py` 구현**

`persona_pipeline/pipeline/step2_persona.py`:

```python
"""Step 2: 발언자별 페르소나 프로필을 추출해 personas.json 에 저장한다.

실행: python -m pipeline.step2_persona
"""

import json
from concurrent.futures import ThreadPoolExecutor

from pipeline import config, llm, transcript
from pipeline.schemas import Persona, PersonaProfile

SYSTEM_PROMPT = (
    "당신은 발화 분석 전문가입니다. 주어진 발언만을 근거로 그 사람의 성격, 말투, "
    "입장을 추론하세요. 발언에 드러나지 않은 내용을 지어내지 마세요. "
    "모든 출력은 한국어로 작성합니다."
)

PROMPT_TEMPLATE = """다음은 사내 토의에서 [{speaker}] 님이 한 발언을 순서대로 모은 것입니다.

{texts}

이 발언들을 근거로 [{speaker}] 님의 페르소나 프로필을 작성하세요."""


def build_prompt(speaker: str, texts: list[str]) -> str:
    numbered = "\n".join(f"{i}. {text}" for i, text in enumerate(texts, 1))
    return PROMPT_TEMPLATE.format(speaker=speaker, texts=numbered)


def extract_persona(speaker: str, texts: list[str]) -> Persona:
    profile = llm.structured(SYSTEM_PROMPT, build_prompt(speaker, texts), PersonaProfile)
    return Persona.from_profile(speaker, profile)


def run() -> list[Persona]:
    utterances = transcript.load_transcript(config.TALK_PATH)
    grouped = transcript.group_by_speaker(utterances)
    speakers = list(grouped.keys())

    with ThreadPoolExecutor(max_workers=len(speakers)) as pool:
        futures = {
            speaker: pool.submit(extract_persona, speaker, texts)
            for speaker, texts in grouped.items()
        }
        personas = []
        for speaker in speakers:
            try:
                personas.append(futures[speaker].result())
            except llm.LLMError as exc:
                # 8명이 모두 있어야 Step 3 이 성립하므로 부분 저장하지 않는다.
                raise llm.LLMError(f"{speaker} 페르소나 추출에 실패했습니다: {exc}") from exc

    config.PERSONAS_PATH.parent.mkdir(parents=True, exist_ok=True)
    config.PERSONAS_PATH.write_text(
        json.dumps([p.model_dump() for p in personas], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return personas


def main() -> int:
    print("[Step 2] 발언자별 페르소나 추출")
    try:
        personas = run()
    except (transcript.TranscriptError, llm.LLMError) as exc:
        print(f"\n오류: {exc}")
        return 1

    for persona in personas:
        print(f"\n  {persona.speaker}")
        print(f"    성격: {', '.join(persona.personality_traits)}")
        print(f"    말투: {', '.join(persona.speaking_style)}")
        print(f"    입장: {persona.stance}")

    print(f"\n페르소나 {len(personas)}명 저장: {config.PERSONAS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_step2_persona.py -v`
Expected: 6 passed

- [ ] **Step 5: 커밋**

```bash
git add persona_pipeline/pipeline/step2_persona.py persona_pipeline/tests/test_step2_persona.py
git commit -m "feat: add step2 persona extraction"
```

---

### Task 8: Step 3 — 페르소나 밸런스 게임

**Files:**
- Create: `persona_pipeline/pipeline/step3_minigame.py`
- Test: `persona_pipeline/tests/test_step3_minigame.py`

**Interfaces:**
- Consumes: `llm.roleplay`, `schemas.Persona`, `schemas.BalanceChoice`, `schemas.PersonaAnswer`, `schemas.MinigameResult`, `config.PERSONAS_PATH`, `config.MINIGAME_RESULT_PATH`
- Produces:
  - `OTHER_LABEL = "기타"`
  - `MinigameError(RuntimeError)`
  - `load_personas() -> list[Persona]` — `personas.json` 없으면 `MinigameError`
  - `build_prompt(question: str, options: list[str]) -> str`
  - `ask_persona(persona: Persona, question: str, options: list[str]) -> PersonaAnswer`
  - `tally_choices(answers: list[PersonaAnswer], options: list[str]) -> dict[str, int]`
  - `run(question: str, options: list[str]) -> MinigameResult`
  - `main(argv: list[str] | None = None) -> int`

- [ ] **Step 1: 실패하는 테스트 작성**

`persona_pipeline/tests/test_step3_minigame.py`:

```python
import json

import pytest

from pipeline import config, llm, step3_minigame
from pipeline.schemas import BalanceChoice, Persona, PersonaAnswer

OPTIONS = ["야근한다", "품질을 낮춘다"]
QUESTION = "기한을 맞추기 위해 야근할 것인가, 품질을 낮출 것인가?"


def _personas(n=8):
    return [
        Persona(
            speaker=f"User{i}",
            personality_traits=["논리적"],
            speaking_style=["단정적 어조"],
            stance="입장",
            system_prompt=f"당신은 User{i}입니다. 답변은 1~2문장으로 유지하세요.",
        )
        for i in range(1, n + 1)
    ]


def _write_personas(tmp_path, monkeypatch, personas=None):
    path = tmp_path / "personas.json"
    path.write_text(
        json.dumps([p.model_dump() for p in (personas or _personas())], ensure_ascii=False),
        encoding="utf-8",
    )
    monkeypatch.setattr(config, "PERSONAS_PATH", path)
    monkeypatch.setattr(config, "MINIGAME_RESULT_PATH", tmp_path / "minigame_result.json")
    return path


def test_tally_counts_exact_matches():
    answers = [
        PersonaAnswer(speaker="User1", choice="야근한다", reason="r"),
        PersonaAnswer(speaker="User2", choice="야근한다", reason="r"),
        PersonaAnswer(speaker="User3", choice="품질을 낮춘다", reason="r"),
    ]
    assert step3_minigame.tally_choices(answers, OPTIONS) == {
        "야근한다": 2,
        "품질을 낮춘다": 1,
        "기타": 0,
    }


def test_tally_puts_mismatched_choice_in_other():
    answers = [PersonaAnswer(speaker="User1", choice="둘 다 싫다", reason="r")]
    assert step3_minigame.tally_choices(answers, OPTIONS)["기타"] == 1


def test_tally_strips_whitespace_before_matching():
    answers = [PersonaAnswer(speaker="User1", choice="  야근한다  ", reason="r")]
    assert step3_minigame.tally_choices(answers, OPTIONS)["야근한다"] == 1


def test_run_asks_every_persona_with_its_own_system_prompt(tmp_path, monkeypatch):
    _write_personas(tmp_path, monkeypatch)
    seen = []

    def fake_roleplay(system_prompt, prompt, model_cls):
        seen.append(system_prompt)
        return BalanceChoice(choice="야근한다", reason="기한이 중요하기 때문입니다.")

    monkeypatch.setattr(llm, "roleplay", fake_roleplay)
    result = step3_minigame.run(QUESTION, OPTIONS)

    assert len(result.answers) == 8
    assert sorted(seen) == sorted(p.system_prompt for p in _personas())
    assert result.tally["야근한다"] == 8


def test_run_saves_result_json(tmp_path, monkeypatch):
    _write_personas(tmp_path, monkeypatch)
    monkeypatch.setattr(
        llm,
        "roleplay",
        lambda s, p, m: BalanceChoice(choice="품질을 낮춘다", reason="이유입니다."),
    )
    step3_minigame.run(QUESTION, OPTIONS)
    saved = json.loads((tmp_path / "minigame_result.json").read_text(encoding="utf-8"))
    assert saved["question"] == QUESTION
    assert saved["options"] == OPTIONS
    assert len(saved["answers"]) == 8
    assert saved["tally"]["품질을 낮춘다"] == 8


def test_prompt_contains_question_and_both_options():
    prompt = step3_minigame.build_prompt(QUESTION, OPTIONS)
    assert QUESTION in prompt
    assert "야근한다" in prompt
    assert "품질을 낮춘다" in prompt


def test_load_personas_missing_file_raises(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "PERSONAS_PATH", tmp_path / "없음.json")
    with pytest.raises(step3_minigame.MinigameError) as exc:
        step3_minigame.load_personas()
    assert "step2_persona" in str(exc.value)


def test_main_returns_1_when_personas_missing(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(config, "PERSONAS_PATH", tmp_path / "없음.json")
    code = step3_minigame.main(["--question", QUESTION, "--options", *OPTIONS])
    assert code == 1
    assert "step2_persona" in capsys.readouterr().out


def test_main_rejects_wrong_option_count(tmp_path, monkeypatch, capsys):
    _write_personas(tmp_path, monkeypatch)
    with pytest.raises(SystemExit):
        step3_minigame.main(["--question", QUESTION, "--options", "하나만"])


def test_main_returns_0_on_success(tmp_path, monkeypatch):
    _write_personas(tmp_path, monkeypatch)
    monkeypatch.setattr(
        llm, "roleplay", lambda s, p, m: BalanceChoice(choice="야근한다", reason="이유입니다.")
    )
    assert step3_minigame.main(["--question", QUESTION, "--options", *OPTIONS]) == 0
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_step3_minigame.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'pipeline.step3_minigame'`

- [ ] **Step 3: `step3_minigame.py` 구현**

`persona_pipeline/pipeline/step3_minigame.py`:

```python
"""Step 3: 8명의 페르소나에게 밸런스 게임 질문을 던지고 답변을 모은다.

실행:
  python -m pipeline.step3_minigame --question "..." --options "A" "B"
  python -m pipeline.step3_minigame          # 인자 생략 시 대화형 입력
"""

import argparse
import json
from concurrent.futures import ThreadPoolExecutor

from pipeline import config, llm
from pipeline.schemas import BalanceChoice, MinigameResult, Persona, PersonaAnswer

OTHER_LABEL = "기타"

PROMPT_TEMPLATE = """다음 밸런스 게임 질문에 답해 주세요.

질문: {question}

선택지:
  A. {option_a}
  B. {option_b}

두 선택지 중 반드시 하나를 고르고, choice 에는 고른 선택지의 문장을 글자 그대로
적으세요. reason 에는 당신의 평소 말투를 유지한 채 이유를 1~2문장으로 쓰세요."""


class MinigameError(RuntimeError):
    """미니게임 실행에 필요한 입력이 없을 때."""


def load_personas() -> list[Persona]:
    path = config.PERSONAS_PATH
    if not path.exists():
        raise MinigameError(
            f"페르소나 파일을 찾을 수 없습니다: {path}\n"
            f"먼저 `python -m pipeline.step2_persona` 를 실행하세요."
        )
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [Persona(**item) for item in raw]


def build_prompt(question: str, options: list[str]) -> str:
    return PROMPT_TEMPLATE.format(
        question=question, option_a=options[0], option_b=options[1]
    )


def ask_persona(persona: Persona, question: str, options: list[str]) -> PersonaAnswer:
    choice = llm.roleplay(
        persona.system_prompt, build_prompt(question, options), BalanceChoice
    )
    return PersonaAnswer.from_choice(persona.speaker, choice)


def tally_choices(answers: list[PersonaAnswer], options: list[str]) -> dict[str, int]:
    """선택지별 득표를 센다.

    모델이 선택지를 그대로 쓰지 않고 표현을 바꿀 수 있으므로, 정확히 일치하지
    않는 답변은 조용히 버리지 않고 '기타'로 분류한다.
    """
    counts: dict[str, int] = {option: 0 for option in options}
    counts[OTHER_LABEL] = 0
    for answer in answers:
        choice = answer.choice.strip()
        if choice in options:
            counts[choice] += 1
        else:
            counts[OTHER_LABEL] += 1
    return counts


def run(question: str, options: list[str]) -> MinigameResult:
    personas = load_personas()

    with ThreadPoolExecutor(max_workers=len(personas)) as pool:
        futures = [
            pool.submit(ask_persona, persona, question, options) for persona in personas
        ]
        answers = [future.result() for future in futures]

    result = MinigameResult(
        question=question,
        options=options,
        answers=answers,
        tally=tally_choices(answers, options),
    )

    config.MINIGAME_RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    config.MINIGAME_RESULT_PATH.write_text(
        json.dumps(result.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return result


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="페르소나 8인에게 밸런스 게임 질문을 던집니다."
    )
    parser.add_argument("--question", help="밸런스 게임 질문")
    parser.add_argument(
        "--options", nargs=2, metavar=("A", "B"), help="선택지 두 개"
    )
    return parser.parse_args(argv)


def _prompt_interactively(args: argparse.Namespace) -> tuple[str, list[str]]:
    question = args.question or input("밸런스 게임 질문을 입력하세요: ").strip()
    if args.options:
        options = list(args.options)
    else:
        options = [
            input("선택지 A: ").strip(),
            input("선택지 B: ").strip(),
        ]
    return question, options


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    print("[Step 3] 페르소나 밸런스 게임")

    question, options = _prompt_interactively(args)
    if not question or not all(options):
        print("\n오류: 질문과 선택지 두 개를 모두 입력해야 합니다.")
        return 1

    try:
        result = run(question, options)
    except (MinigameError, llm.LLMError) as exc:
        print(f"\n오류: {exc}")
        return 1

    print(f"\n질문: {result.question}")
    print(f"선택지: A. {options[0]} / B. {options[1]}\n")
    for answer in result.answers:
        print(f"  {answer.speaker} [{answer.choice}] {answer.reason}")

    print("\n[득표 집계]")
    for label, count in result.tally.items():
        if label == OTHER_LABEL and count == 0:
            continue
        print(f"  {label}: {count}표")

    print(f"\n결과 저장: {config.MINIGAME_RESULT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_step3_minigame.py -v`
Expected: 10 passed

- [ ] **Step 5: 커밋**

```bash
git add persona_pipeline/pipeline/step3_minigame.py persona_pipeline/tests/test_step3_minigame.py
git commit -m "feat: add step3 persona balance-game minigame"
```

---

### Task 9: 전체 실행 스크립트와 README

**Files:**
- Create: `persona_pipeline/run_all.py`
- Create: `persona_pipeline/README.md`
- Test: `persona_pipeline/tests/test_run_all.py`
- Modify: `README.md` (루트, 섹션 하나 추가)

**Interfaces:**
- Consumes: `step1_summary.main`, `step2_persona.main`, `step3_minigame.main`
- Produces: `run_all.main(argv: list[str] | None = None) -> int`

- [ ] **Step 1: 실패하는 테스트 작성**

`persona_pipeline/tests/test_run_all.py`:

```python
import run_all
from pipeline import step1_summary, step2_persona, step3_minigame


def _patch_steps(monkeypatch, codes):
    calls = []

    def make(name, code):
        def fn(*args, **kwargs):
            calls.append(name)
            return code
        return fn

    monkeypatch.setattr(step1_summary, "main", make("step1", codes[0]))
    monkeypatch.setattr(step2_persona, "main", make("step2", codes[1]))
    monkeypatch.setattr(step3_minigame, "main", make("step3", codes[2]))
    return calls


def test_runs_all_three_steps_in_order(monkeypatch):
    calls = _patch_steps(monkeypatch, [0, 0, 0])
    assert run_all.main(["--question", "질문", "--options", "A", "B"]) == 0
    assert calls == ["step1", "step2", "step3"]


def test_stops_when_step1_fails(monkeypatch):
    calls = _patch_steps(monkeypatch, [1, 0, 0])
    assert run_all.main([]) == 1
    assert calls == ["step1"]


def test_stops_when_step2_fails(monkeypatch):
    calls = _patch_steps(monkeypatch, [0, 1, 0])
    assert run_all.main([]) == 1
    assert calls == ["step1", "step2"]


def test_forwards_question_and_options_to_step3(monkeypatch):
    forwarded = {}

    monkeypatch.setattr(step1_summary, "main", lambda: 0)
    monkeypatch.setattr(step2_persona, "main", lambda: 0)
    monkeypatch.setattr(
        step3_minigame, "main", lambda argv: forwarded.setdefault("argv", argv) or 0
    )
    run_all.main(["--question", "질문", "--options", "A", "B"])
    assert forwarded["argv"] == ["--question", "질문", "--options", "A", "B"]
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd persona_pipeline && pytest tests/test_run_all.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'run_all'`

- [ ] **Step 3: `run_all.py` 구현**

`persona_pipeline/run_all.py`:

```python
"""Step 1 -> 2 -> 3 을 순서대로 실행한다.

실행:
  python run_all.py
  python run_all.py --question "..." --options "A" "B"
"""

import argparse

from pipeline import step1_summary, step2_persona, step3_minigame


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="토의 요약 -> 페르소나 추출 -> 밸런스 게임을 순차 실행합니다."
    )
    parser.add_argument("--question", help="Step 3 밸런스 게임 질문")
    parser.add_argument("--options", nargs=2, metavar=("A", "B"), help="Step 3 선택지 두 개")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    for step in (step1_summary.main, step2_persona.main):
        code = step()
        if code != 0:
            print("\n앞 단계가 실패해 파이프라인을 중단합니다.")
            return code
        print()

    step3_argv: list[str] = []
    if args.question:
        step3_argv += ["--question", args.question]
    if args.options:
        step3_argv += ["--options", *args.options]

    return step3_minigame.main(step3_argv)


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd persona_pipeline && pytest tests/test_run_all.py -v`
Expected: 4 passed

- [ ] **Step 5: `persona_pipeline/README.md` 작성**

```markdown
# Persona Pipeline

8인 텍스트 토의 데이터로 **요약+TTS 브리핑 → 페르소나 추출 → 페르소나 밸런스 게임**을
수행하는 CLI 파이프라인. 같은 리포의 `mafia_game/`, `frontend/` 와는 독립적으로 동작한다.

설계 문서: `../docs/superpowers/specs/2026-08-28-persona-pipeline-design.md`

## 설치

```bash
cd persona_pipeline
python -m venv .venv
.venv\Scripts\activate          # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
```

`.env` 를 열어 `ANTHROPIC_API_KEY` 를 채운다. TTS(gTTS)는 API 키가 필요 없지만
인터넷 연결은 필요하다.

## 실행

### Step 1 — 토의 요약 및 TTS 브리핑

```bash
python -m pipeline.step1_summary
```

`data/dummy_talk.json` 을 읽어 3줄 요약과 주요 쟁점을 뽑고, 브리핑 원고를 음성으로
변환한다. 산출물: `output/summary.json`, `output/summary.mp3`

### Step 2 — 발언자별 페르소나 추출

```bash
python -m pipeline.step2_persona
```

User1~User8 각각의 성격·말투·입장과, 그 사람을 모사하는 LLM 시스템 프롬프트를
추출한다. 산출물: `output/personas.json`

### Step 3 — 페르소나 밸런스 게임

```bash
python -m pipeline.step3_minigame \
  --question "프로젝트 기한을 맞추기 위해 야근을 할 것인가, 품질을 낮추고 제시간에 제출할 것인가?" \
  --options "야근한다" "품질을 낮춘다"
```

인자를 생략하면 대화형으로 질문과 선택지를 입력받는다. 8명의 페르소나가 각자
말투를 유지한 채 선택과 이유를 답한다. 산출물: `output/minigame_result.json`

### 전체 순차 실행

```bash
python run_all.py --question "..." --options "A" "B"
```

## 테스트

```bash
pytest
```

LLM/TTS 호출은 전부 모킹되어 있다. API 키나 네트워크 없이 통과한다.

## 입력 데이터 교체

`data/dummy_talk.json` 을 같은 형식(`[{"speaker": ..., "text": ...}, ...]`)의
실제 토의 데이터로 바꾸면 코드 수정 없이 그대로 동작한다.

## 설정

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | (필수) | Anthropic API 키 |
| `ANTHROPIC_MODEL` | `claude-opus-5` | 반복 테스트로 비용을 줄이려면 `claude-sonnet-5` |
| `TTS_LANG` | `ko` | gTTS 언어 코드 |

1회 전체 실행에 LLM 호출 17회(요약 1 + 페르소나 8 + 게임 답변 8)가 발생한다.
```

- [ ] **Step 6: 루트 `README.md` 에 섹션 추가**

루트 `README.md` 맨 끝에 다음을 덧붙인다.

```markdown

## Persona Pipeline (별도 하위 프로젝트)

8인 토의 데이터로 요약/TTS, 페르소나 추출, 밸런스 게임을 수행하는 CLI 파이프라인.
마피아 게임과 코드 의존성이 없는 독립 프로젝트다. 설치와 실행은
`persona_pipeline/README.md` 를 참고한다.
```

- [ ] **Step 7: 전체 테스트 통과 확인**

```bash
cd persona_pipeline && pytest -v
```

Expected: 49 passed (config 4 + schemas 7 + transcript 6 + llm 7 + tts 3 + step1 6 + step2 6 + step3 10 + run_all 4)

루트에서도 기존 테스트가 깨지지 않았는지 확인한다:

```bash
cd .. && pytest
```

Expected: 기존 마피아 게임 테스트만 수집되고 전부 통과

- [ ] **Step 8: 커밋**

```bash
git add persona_pipeline/run_all.py persona_pipeline/README.md persona_pipeline/tests/test_run_all.py README.md
git commit -m "feat: add run_all script and persona_pipeline docs"
```

---

## 수동 검증 (API 키 필요)

자동 테스트는 API를 호출하지 않는다. 구현이 끝나면 실제 키로 한 번 돌려 확인한다.

- [ ] `.env` 에 실제 `ANTHROPIC_API_KEY` 설정
- [ ] `python -m pipeline.step1_summary` → `output/summary.json` 의 `three_line_summary` 가 3개이고, `output/summary.mp3` 가 재생되며 한국어 브리핑이 자연스럽게 들리는지
- [ ] `python -m pipeline.step2_persona` → `output/personas.json` 에 8명이 있고, 각 `system_prompt` 에 "1~2문장" 지시가 들어 있는지
- [ ] `python -m pipeline.step3_minigame --question "프로젝트 기한을 맞추기 위해 야근을 할 것인가, 품질을 낮추고 제시간에 제출할 것인가?" --options "야근한다" "품질을 낮춘다"` → 8명의 답변이 서로 다른 말투로 나오고, 득표 집계에서 `기타`가 0인지 (0이 아니면 `PROMPT_TEMPLATE` 의 "글자 그대로" 지시를 강화한다)
