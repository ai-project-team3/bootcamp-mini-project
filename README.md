# 얼음땡

팀 프로젝트를 막 시작한 5명이 18분짜리 아이스브레이킹을 함께 하면, 각자의 캐릭터 카드와
팀 리포트가 나오는 웹 서비스입니다. 기획안(`ai-project-team3/-` 저장소의
`얼음땡-기획안.md`)의 진행 순서·능력치 산출식·유형/칭호/궁합/팀등급 계산까지 실제로
구현되어 있습니다.

## 스택

- **Frontend**: React 19 + Vite, react-router-dom
- **Backend**: FastAPI, SQLAlchemy
- **DB**: MariaDB

## 진행 순서 (기획안 §4, §14)

```
/                         시작 (닉네임·성별·MBTI, 방 만들기 / 코드로 참여)
  → /room/create           방 만들기 (QR·초대코드)
  → /join/:code             초대코드로 참여
  → /room/:code/waiting     대기실 (5명이 모이면 호스트가 시작)
  → /room/:code/game        공통 게임 화면 — 첫인상 투표①, 이지선다 8문항,
                             첫인상 투표②, 유형 맞히기를 이 화면 하나가 담당
  → /room/:code/statements  둘은 진실, 하나는 거짓 (문장 입력 + 거짓 찾기)
  → /room/:code/hub         결과 허브
  → /room/:code/report/me   개인 리포트
  → /room/:code/report/team 팀 리포트
```

전원이 제출하면 호스트 클릭 없이 서버가 자동으로 다음 단계로 넘깁니다(짧은 주기
폴링 기반, WebSocket 미사용).

## 실행 방법

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # DB 접속 정보 수정
python -m app.init_db    # 테이블 생성 (최초 1회 / 스키마 변경 시)
uvicorn app.main:app --reload
```

### MariaDB (선택 — docker-compose)

```bash
docker compose up -d
```

MariaDB 컨테이너가 뜬 뒤 `python -m app.init_db`를 실행하면 `rooms`, `players`,
`answers`, `statements`, `guesses`, `abilities`, `reports` 테이블이 생성됩니다.

## 디렉터리 구조

```
frontend/
  src/
    pages/        화면별 컴포넌트 (기능마다 폴더 분리)
    components/   공통 UI (layout, common)
    context/      화면 간 공유 상태 (닉네임·성별·MBTI·방코드·playerId)
    data/         문항·유형 등 정적 게임 콘텐츠
    router/       라우트 정의
    styles/       디자인 토큰(theme.css) + 전역 스타일
backend/
  app/
    models/       SQLAlchemy 모델 (Room, Player, Answer, Statement, Guess, Ability, Report)
    schemas/      Pydantic 요청/응답 스키마
    routers/      엔드포인트 (health, rooms, players, answers, impressions,
                   statements, type_guess, reports)
    content/      문항·문구 사전 (기획안 §4-2·§4-3·§11)
    services/     능력치·유형·칭호·궁합·팀등급 산출 로직 (기획안 §5~§9)
    config.py     환경변수 설정
    database.py   MariaDB 연결/세션
```

## 기획안 대비 정한 기본값

기획안이 확정하지 않고 남겨둔 항목(§17)은 아래처럼 임시로 채워뒀습니다. 코드 주석에도
표시되어 있으니 바꾸기 쉽습니다.

| 항목 | 기본값 |
|---|---|
| O1 유형 8종 색·심볼 | `backend/app/constants.py`의 `TYPES`에 테마 팔레트 기반으로 임시 배정 |
| O2 문장 입력 글자 수 상한 | 60자 |
| O3 코멘트 생성 | LLM 미연동, `content/comments.py` 사전 문장 그대로 사용 |
| O4 결과 링크 유효기간 | 없음(무기한) |

궁합 S/A/B, 팀등급(SSS~S) 4지표 "상위" 판정 컷오프도 기획안에 구체적인 수치가 없어
`services/scoring.py`에 임의로 정해뒀습니다(주석 참고).

## 알려진 제한

- "둘은 진실, 하나는 거짓" 턴에서 대상자 본인은 자기 차례가 끝나는 순간의 "정답 공개"
  화면을 못 보고 바로 다음 턴으로 넘어갑니다. 데이터·채점은 정확하고 리포트에도 반영되지만
  연출상 사소한 공백입니다.
- 새로고침하면 닉네임·playerId 등 세션 정보가 초기화됩니다(로컬 상태만 사용, 영속화는
  범위 밖).
