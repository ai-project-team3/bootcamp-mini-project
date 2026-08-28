# Persona Pipeline 설계

8인 텍스트 토의 데이터를 입력받아 (1) 요약과 TTS 브리핑, (2) 발언자별 페르소나
프로필, (3) 페르소나 기반 밸런스 게임을 순차 수행하는 CLI 파이프라인.

- 작성일: 2026-08-28
- 위치: `persona_pipeline/` (리포 최상위, 기존 `mafia_game/`·`frontend/`와 코드 의존성 없음)
- 언어/스택: Python 3, Anthropic SDK(`claude-opus-5`), gTTS, Pydantic

## 1. 목표와 범위

### 목표

MVP 수준의 파이프라인을 만든다. 세 단계가 각각 독립 실행되고, 파일을 통해서만
연결되어 어느 단계부터든 다시 돌릴 수 있어야 한다.

### 범위 밖

- 웹 UI, API 서버 (CLI만 제공)
- 실시간 음성 입력 (텍스트 스크립트만 입력)
- 기존 `mafia_game` 패키지와의 연동. `mafia_game/persona/`는 4축 점수 스키마로
  이번 페르소나 프로필과 별개다. 지금은 통합하지 않는다.

## 2. 디렉터리 구조

```
persona_pipeline/
├── README.md               # 설치·실행 가이드
├── requirements.txt        # anthropic, gtts, pydantic, python-dotenv, pytest
├── pytest.ini              # testpaths를 이 폴더로 한정
├── .env.example
├── data/
│   └── dummy_talk.json     # 8인 더미 토의 스크립트
├── output/                 # 산출물 (gitignore)
│   ├── summary.json
│   ├── summary.mp3
│   ├── personas.json
│   └── minigame_result.json
├── pipeline/
│   ├── __init__.py
│   ├── config.py
│   ├── schemas.py
│   ├── llm.py
│   ├── tts.py
│   ├── transcript.py
│   ├── step1_summary.py
│   ├── step2_persona.py
│   └── step3_minigame.py
├── run_all.py
└── tests/
```

`.env`는 커밋하지 않는다. 리포 루트 `.gitignore`에 `persona_pipeline/.env`와
`persona_pipeline/output/`를 추가한다.

## 3. 데이터 흐름

```
data/dummy_talk.json ─┬─▶ step1 ─▶ output/summary.json ─▶ gTTS ─▶ output/summary.mp3
                      └─▶ step2 ─▶ output/personas.json ─┐
                                                         ├─▶ step3 ─▶ 콘솔 출력
                             사용자 밸런스 질문 (CLI 인자) ┘   + output/minigame_result.json
```

각 단계는 선행 산출물이 없으면 처리하지 않고, 어떤 명령을 먼저 실행해야 하는지
한국어로 안내한 뒤 종료 코드 1로 끝난다.

## 4. 입력 데이터

`data/dummy_talk.json`은 발언 객체의 배열이다.

```json
[
  {"speaker": "User1", "text": "저는 이 제안에 찬성합니다. 비용 대비 효율이 높기 때문입니다."},
  {"speaker": "User2", "text": "하지만 보안상의 이슈가 발생할 수 있지 않을까요?"}
]
```

User1~User8이 모두 등장하고, 각자 성격이 뚜렷이 구분되도록 발언을 작성한다.
페르소나 추출이 의미 있으려면 인당 최소 4~5개 발언이 필요하다. 주제는
"사내 업무 도구를 외부 SaaS로 전환할 것인가"로 한다 — 찬반과 조건부 입장이
자연스럽게 갈리는 소재다.

## 5. 공통 레이어

### `config.py`

`python-dotenv`로 `.env`를 읽고 다음을 노출한다.

- `ANTHROPIC_API_KEY` — 미설정 시 `llm.py`가 호출 시점에 한국어 에러 발생
- `MODEL` — 기본 `claude-opus-5`. 반복 테스트로 비용을 줄이려면 `.env`의
  `ANTHROPIC_MODEL`을 `claude-sonnet-5`로 바꾼다.
- `TTS_LANG` — 기본 `ko`
- 경로 상수: `DATA_DIR`, `OUTPUT_DIR`, `TALK_PATH`, `SUMMARY_PATH`,
  `SUMMARY_AUDIO_PATH`, `PERSONAS_PATH`, `MINIGAME_RESULT_PATH`

경로는 모두 `config.py` 파일 위치 기준 절대 경로로 계산한다. 어느 작업
디렉터리에서 실행해도 동일하게 동작해야 한다.

### `llm.py`

Anthropic SDK 호출은 이 모듈에만 존재한다. 다른 모듈은 SDK를 직접 import 하지
않는다.

```python
def structured(system: str, prompt: str, model_cls: type[T]) -> T
def roleplay(system_prompt: str, prompt: str, model_cls: type[T]) -> T
```

두 함수 모두 `client.messages.parse(model=MODEL, output_format=model_cls, ...)`를
사용해 검증된 Pydantic 인스턴스(`response.parsed_output`)를 반환한다.
`thinking={"type": "adaptive"}`를 설정하고, `max_tokens`는 16000으로 둔다.

`structured`는 추출·요약용(시스템 프롬프트를 우리가 씀), `roleplay`는 페르소나
연기용(시스템 프롬프트가 `personas.json`에서 옴)이다. 구현은 거의 같지만 호출
의도가 다르므로 이름을 분리해 호출부의 가독성을 지킨다.

에러 처리는 타입별로 나눈다: `AuthenticationError`(키 문제),
`RateLimitError`(재시도 안내), `APIConnectionError`(네트워크), 그 외
`APIStatusError`. 각각 무엇을 해야 하는지 알려주는 한국어 메시지로 감싼다.

### `tts.py`

```python
def synthesize(text: str, out_path: Path, lang: str = TTS_LANG) -> Path
```

`gTTS(text=text, lang=lang).save(out_path)` 한 줄을 감싼다. gTTS는 API 키가
필요 없지만 네트워크는 필요하다. 실패 시 "인터넷 연결을 확인하세요" 안내로
감싼다. 향후 OpenAI TTS 등으로 교체할 때 이 함수 하나만 바꾸면 되도록
프로바이더 세부사항을 밖으로 노출하지 않는다.

### `transcript.py`

```python
def load_transcript(path: Path) -> list[Utterance]
def group_by_speaker(utterances: list[Utterance]) -> dict[str, list[str]]
def format_full_script(utterances: list[Utterance]) -> str
```

`group_by_speaker`는 발언 순서를 보존한다(말투 분석에 순서가 의미를 가진다).
`format_full_script`는 `"User1: 저는 ..."` 형태의 줄바꿈 구분 문자열을 만든다.
LLM 호출과 무관한 순수 함수이므로 모킹 없이 테스트한다.

### `schemas.py`

모든 Pydantic 모델을 한곳에 모은다. 구조화 출력 스키마이므로 필드마다
`Field(description=...)`을 붙인다 — 이 설명이 모델에게 전달되는 지시문 역할을
하므로, 프롬프트와 스키마 양쪽에 요구사항을 중복해서 쓰지 않는다.

## 6. Step 1 — 요약 및 TTS 브리핑

**입력** `data/dummy_talk.json` **출력** `output/summary.json`, `output/summary.mp3`

### 스키마

```python
class KeyIssue(BaseModel):
    title: str        # 쟁점 한 줄 제목
    description: str  # 쟁점 설명 1~2문장
    sides: list[str]  # 이 쟁점에서 갈린 입장들

class DiscussionSummary(BaseModel):
    three_line_summary: list[str]  # 정확히 3개
    key_issues: list[KeyIssue]     # 2~4개
    briefing_script: str
```

`three_line_summary`가 정확히 3개인지는 `field_validator`로 검증한다. 모델이
2개나 4개를 반환하면 조용히 통과시키지 않고 실패시킨다.

### `briefing_script`를 따로 두는 이유

불릿 목록을 TTS로 그대로 읽히면 어색하다. `briefing_script`는 라디오 브리핑처럼
읽었을 때 자연스러운 한국어 서술 문장(3~5문장)으로 별도 생성하고, 이것만
`summary.mp3`로 변환한다. `summary.json`에는 세 필드가 모두 들어간다.

### 흐름

1. 스크립트 전체를 `format_full_script`로 직렬화
2. `structured()` 1회 호출 → `DiscussionSummary`
3. `summary.json` 저장 (`ensure_ascii=False`, 들여쓰기 2)
4. `briefing_script`를 `tts.synthesize()`로 `summary.mp3` 저장
5. 콘솔에 3줄 요약과 쟁점 목록 출력

## 7. Step 2 — 발언자별 페르소나 추출

**입력** `data/dummy_talk.json` **출력** `output/personas.json`

### 스키마

```python
class Persona(BaseModel):
    speaker: str
    personality_traits: list[str]  # 3~5개 키워드
    speaking_style: list[str]      # 2~4개 특징
    stance: str                    # 기본 입장과 가치관, 1~2문장
    system_prompt: str
```

### `system_prompt` 생성 지침

추출 프롬프트에서 `system_prompt`가 갖춰야 할 조건을 명시한다.

- 1인칭 역할 지시문("당신은 ...입니다")으로 작성
- 성격, 말투, 입장을 모두 문장 안에 녹여 쓸 것 (필드 나열이 아니라 서술)
- **"답변은 1~2문장으로 유지하라"는 지시를 반드시 포함할 것**

마지막 조건이 중요하다. Step 3의 답변 길이는 이 문자열에서 결정되므로, 여기서
빠지면 Step 3 출력이 장황해진다.

### 흐름

1. `group_by_speaker()`로 발언자별 발언 묶음 생성
2. 8명에 대해 `ThreadPoolExecutor(max_workers=8)`로 병렬 `structured()` 호출.
   순차 8회는 체감 대기가 크다.
3. 실패한 발언자가 있으면 어떤 발언자가 왜 실패했는지 출력하고 전체를 실패
   처리한다. 부분 저장은 하지 않는다 — 8명이 모두 있어야 Step 3이 성립한다.
4. 원본 등장 순서로 정렬해 `personas.json` 저장

## 8. Step 3 — 페르소나 기반 밸런스 게임

**입력** `output/personas.json` + 사용자 질문
**출력** 콘솔 + `output/minigame_result.json`

### 인터페이스

```bash
python -m pipeline.step3_minigame \
  --question "프로젝트 기한을 맞추기 위해 야근을 할 것인가, 품질을 낮추고 제시간에 제출할 것인가?" \
  --options "야근한다" "품질을 낮춘다"
```

인자를 생략하면 대화형 `input()`으로 받는다. `--options`는 정확히 2개를 요구한다.

### 스키마

```python
class PersonaAnswer(BaseModel):
    speaker: str
    choice: str   # 주어진 두 선택지 중 하나
    reason: str   # 1~2문장

class MinigameResult(BaseModel):
    question: str
    options: list[str]
    answers: list[PersonaAnswer]
    tally: dict[str, int]
```

`choice`는 자유 문자열로 두되, 프롬프트에서 두 선택지 중 하나를 그대로 쓰라고
지시한다. 집계 시에는 선택지 문자열과 정확히 일치하지 않는 답변을 `기타`로
분류한다 — 모델이 표현을 바꿔 쓸 수 있으므로 집계가 조용히 어긋나지 않게 한다.

### 흐름

1. `personas.json` 로드
2. 8명에 대해 병렬 `roleplay()` 호출. 각 호출의 시스템 프롬프트는 해당 페르소나의
   `system_prompt`, 사용자 메시지는 질문 + 두 선택지.
3. `tally` 계산
4. 콘솔에 발언자별 `[선택] 이유` 출력 후 득표 집계 출력
5. `minigame_result.json` 저장

## 9. `run_all.py`

step1 → step2 → step3을 순차 실행한다. 질문은 `--question`/`--options`로 받아
step3에 넘기고, 생략 시 step3이 대화형으로 묻는다. 중간 단계가 실패하면 즉시
중단한다.

## 10. 테스트 전략

`persona_pipeline/tests/`에 두고, `persona_pipeline/pytest.ini`로 testpaths를
한정한다. 리포 루트의 `pyproject.toml`은 `testpaths = ["tests"]`로 마피아 게임
테스트를 가리키므로, 루트에서 `pytest`를 돌려도 이 폴더가 섞이지 않는다.

**API를 실제로 호출하지 않는다.** `llm.structured`/`llm.roleplay`/`tts.synthesize`를
monkeypatch로 대체한다. 검증 대상:

- `transcript`: 발언자별 그룹핑이 순서를 보존하는가, 스크립트 직렬화 형식
- `schemas`: `three_line_summary`가 3개가 아니면 검증 실패하는가
- step1: 가짜 요약으로 `summary.json`이 기대 형태로 저장되고 TTS가
  `briefing_script`로 호출되는가
- step2: 8명이 모두 추출되고 원본 순서로 정렬되는가, 한 명 실패 시 전체가
  실패하고 부분 저장이 없는가
- step3: 집계가 정확한가, 선택지와 불일치하는 답변이 `기타`로 분류되는가,
  `personas.json`이 없을 때 안내 후 종료하는가

## 11. 환경 변수

`.env.example`:

```
# Anthropic API 키 (필수) - https://console.anthropic.com 에서 발급
ANTHROPIC_API_KEY=sk-ant-...

# 사용할 모델 (선택, 기본값 claude-opus-5)
# 반복 테스트로 비용을 줄이려면 claude-sonnet-5 사용
ANTHROPIC_MODEL=claude-opus-5

# TTS 언어 (선택, 기본값 ko)
TTS_LANG=ko
```

gTTS는 API 키가 필요 없다. 네트워크만 필요하다.

## 12. README 실행 가이드

```bash
cd persona_pipeline
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # 그 뒤 ANTHROPIC_API_KEY 채우기

python -m pipeline.step1_summary
python -m pipeline.step2_persona
python -m pipeline.step3_minigame --question "..." --options "A" "B"

python run_all.py               # 전체 순차 실행
pytest                          # 테스트 (API 호출 없음)
```

## 13. 비용

1회 전체 실행 = LLM 호출 17회(요약 1 + 페르소나 8 + 게임 답변 8). 더미 대화가
짧아 실제 비용은 미미하다. 반복 테스트 시 `.env`의 `ANTHROPIC_MODEL`을
`claude-sonnet-5`로 낮출 수 있다.
