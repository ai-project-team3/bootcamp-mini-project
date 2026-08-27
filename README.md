# CrewVerse — 프로젝트 뼈대

기획안(`ai-project-team3/-` 저장소의 `구현기획안.md`) 기준 MVP의 **UI·화면 이동 뼈대**입니다.
게임 판정 로직(축 계산, 유형/칭호/궁합 산출, LLM 리포트 생성)은 아직 포함되어 있지 않고,
화면 흐름과 디자인 시스템, 백엔드/DB 골격만 구성되어 있습니다.

## 스택

- **Frontend**: React 19 + Vite, react-router-dom
- **Backend**: FastAPI, SQLAlchemy
- **DB**: MariaDB

## 화면 흐름

```
/ (시작)
  → /category (카테고리 선택: 단체 → 팀플·합석 / 연인 → 낮·밤)
  → /room/create (방 만들기)
  → /room/:code/waiting (대기실)
  → /room/:code/survey (설문 진입)
  → /room/:code/stage/1~4 (게임 단계 진입 — 실제 게임 로직 없음)
  → /room/:code/report (리포트: 내 결과 / 팀 궁합 / 게임)
  → /room/:code/share (공유 카드)
```

디자인은 `구현기획안.html`의 MVP 화면 스타일(다크 톤 공유 카드, 핫핑크 `#C9256B` 포인트,
Black Han Sans 헤딩 + IBM Plex Sans KR 본문, 폰 프레임 레이아웃)을 기준으로 했습니다.

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

MariaDB 컨테이너가 뜬 뒤 `python -m app.init_db`를 실행하면 `rooms`, `participants`,
`axis_scores`, `compat_grades` 테이블이 생성됩니다.

## 디렉터리 구조

```
frontend/
  src/
    pages/        화면별 컴포넌트 (기능마다 폴더 분리)
    components/   공통 UI (layout, common)
    context/      화면 간 공유 상태 (닉네임/카테고리/방코드)
    data/         카테고리·스테이지·목업 리포트 데이터
    router/       라우트 정의
    styles/       디자인 토큰(theme.css) + 전역 스타일
backend/
  app/
    models/       SQLAlchemy 모델 (Room, Participant, AxisScore, CompatGrade)
    schemas/      Pydantic 요청/응답 스키마
    routers/      엔드포인트 (health, rooms, participants, reports)
    config.py     환경변수 설정
    database.py   MariaDB 연결/세션
```

## 남은 작업

- 설문/게임 단계별 실제 문항·판정 로직 (기획안 §8~§10)
- 축 산출 → 유형/칭호/궁합 계산 (기획안 §4~§7)
- LLM 리포트 생성 및 폴백 (기획안 §11-3)
- 실시간 동기화 (HTTP POST + Polling, 기획안 기술 원칙)
