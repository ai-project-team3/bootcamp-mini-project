# 페르소나 미니게임 (miniproject)

6인 팀 미니프로젝트의 **미니게임 모듈 저장소**. 성향(페르소나) 데이터를 활용하는
두 개의 미니게임을 담는다. 두 게임은 합쳐지는 것이 아니라 **독립된 모듈로 나란히**
존재한다.

| 미니게임 | 인원 | 설명 | 위치 |
|---|---|---|---|
| **마피아 게임** | 4~6인 | 성향으로 직업이 정해지는 아이스브레이킹 마피아. 최후변론·찬반투표까지 타이머로 자동 진행 | `backend/app/mafia/`, `frontend/src/pages/mafia/` |
| **커플 브루마블** | 2인 | 성향 기반 1대1 연인 보드게임. 12칸 보드, 퀴즈·찬스카드, 케미 총평 | `backend/app/marble/`, `frontend/src/pages/marble/` |

## 스택

- **Frontend**: React 18 + Vite + TypeScript, Vitest
- **Backend**: FastAPI + Pydantic (상태는 인메모리, DB 없음)

## 실행

가장 간단한 방법은 저장소 루트의 **`start.bat`** 실행이다. 백엔드(8000)와
프론트엔드(5173)를 함께 띄우고 브라우저를 연다.

직접 띄우려면:

```bash
# 백엔드
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r backend/requirements.txt
cd backend
uvicorn app.standalone:app --reload --host 0.0.0.0

# 프론트엔드 (다른 터미널)
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

브라우저에서 게임을 고른다:

- 마피아 게임 → <http://localhost:5173/#/mafia>
- 커플 브루마블 → <http://localhost:5173/#/marble>

### 여러 기기에서 함께 플레이

같은 와이파이에 있으면 각자 휴대폰에서 **`http://<이 PC의 IP>:5173`** 으로 접속하면
된다. 프론트엔드는 자기를 내려준 주소를 그대로 API 주소로 쓰고(`src/shared/apiBase.ts`),
백엔드 CORS도 사설망 대역을 허용하므로 별도 설정이 필요 없다. 배포 시에는
`VITE_API_BASE` 로 API 주소를 지정한다.

## 테스트

```bash
cd backend && pytest        # 164개
cd frontend && npm test     # 158개
```

## 디렉터리 구조

두 게임 모두 CrewVerse의 백엔드 골격(`models` / `schemas` / `routers` / `utils`)을
자기 패키지 **안에서** 따르고, 화면은 CrewVerse 방식대로 화면마다 폴더 하나에
컴포넌트 + 전용 CSS + 테스트를 함께 둔다.

```
backend/
  app/
    standalone.py     로컬 실행용 진입점 (합친 뒤에는 CrewVerse의 app/main.py가 대신함)
    mafia/            마피아 게임 전체 — 모든 경로가 /mafia/... 로 네임스페이스됨
      __init__.py     routers 목록 export
      config.py  constants.py  store.py
      models/  schemas/  routers/  utils/
      game/  roles/  persona/  validation/
    marble/           커플 브루마블 전체 — 모든 경로가 /marble/...
      __init__.py  store.py
      models/  schemas/  routers/  utils/  game/  persona/
  tests/
    mafia/  marble/
  requirements.txt
frontend/
  src/
    main.tsx          로컬 실행용 진입점 + 게임 선택 화면 (합칠 때 버림)
    standalone.css    로컬 실행용 페이지 리셋 (합칠 때 버림)
    shared/apiBase.ts API 주소 결정
    pages/
      mafia/          MafiaApp.tsx + 화면별 폴더(home, waiting, roleReveal, day,
                      finalDefense, executionVote, night, result) + api/hooks/
                      utils/assets/components/styles
      marble/         MarbleApp.tsx + components/ + api/hooks/assets/styles
docs/                 설계 문서 및 구현 계획
```

## CrewVerse에 합칠 때

두 게임 모두 CrewVerse 파일을 **하나도 건드리지 않도록** 격리되어 있다.
경로는 `/mafia/`·`/marble/` 로, CSS는 각 게임의 루트 클래스(`.mafia-app`,
`.pm-app`) 아래로 스코프되어 있다.

1. **백엔드**: `backend/app/mafia/` 와 `backend/app/marble/` 폴더를 복사하고,
   CrewVerse의 `app/main.py` 에 다음을 추가한다.

   ```python
   from app.mafia import routers as mafia_routers
   from app.marble import routers as marble_routers

   for router in (*mafia_routers, *marble_routers):
       app.include_router(router)
   ```

2. **프론트엔드**: `src/pages/mafia/` 와 `src/pages/marble/` 폴더를 복사하고,
   `AppRouter.jsx` 에 라우트 두 개를 추가한다. `MafiaApp`/`MarbleApp` 은 각자
   화면 전환을 스스로 처리하므로 감싸는 쪽에서 할 일이 없다.

3. **손봐야 하는 파일** — 앱당 하나뿐이라 자동으로 합쳐지지 않는다:
   `backend/requirements.txt`(의존성 합집합), `frontend/package.json`,
   `frontend/package-lock.json`, `frontend/index.html`(폰트 링크 합치기).
   `backend/app/__init__.py` 는 양쪽 다 빈 파일이라 문제없다.

4. **버리는 파일**: `backend/app/standalone.py`, `frontend/src/main.tsx`,
   `frontend/src/standalone.css` — 전부 로컬 실행용이다.

## 실제 페르소나 데이터 연동 시

두 게임 모두 어댑터 패턴으로 데이터 출처를 분리해 두었다. 게임 로직과 화면 코드는
수정할 필요가 없다.

- **마피아**: `backend/app/mafia/persona/provider.py` 의 `PersonaProvider` 를 구현한
  `RealPersonaProvider` 를 만들어 `MockPersonaProvider` 대신 주입한다. 또는 외부
  팀이 `POST /mafia/rooms/{room_id}/persona` 로 직접 보내도 된다
  (스키마는 `docs/mafia_game_design.md` §2.2).
- **마블**: `backend/app/marble/persona/provider.py` 의 `persona_provider` 만 교체한다.

대기실의 "무작위 성향 데이터 채우기" 버튼은 데모 전용 엔드포인트를 호출하며,
실제 서비스에서는 쓰지 않는다.

## 참고 — 제거된 하위 프로젝트

`docs/superpowers/` 안의 `2026-08-28-persona-pipeline*` 문서 2개는 이전에 있었던
`persona_pipeline` CLI 하위 프로젝트의 기록이다. 해당 코드는 제거되었고 문서만 남아 있다.
