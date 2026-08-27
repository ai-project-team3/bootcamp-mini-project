# 얼음땡 *(가제)*

기획안(`ai-project-team3/-` 저장소의 `구현기획안.md`) 기준 MVP.

**되는 것** — 익명 계정, 방 생성·입장·대기실, 팀플 설문 18문항, SELF 축 산출, 폴링 동기화
**아직 안 되는 것** — 게임 1~4단계, 유형·칭호·궁합 판정, LLM 리포트

## 스택

- **Frontend** React 19 + Vite, react-router-dom
- **Backend** FastAPI, SQLAlchemy
- **DB** MariaDB (로컬은 SQLite로도 가능)

## 화면 흐름

```
/ 시작                        닉네임 · 성별 → user_id 발급
  → /join                     초대코드로 참여
  → /category                 단체 → 팀플·합석 / 연인 → 낮·밤
  → /room/create              서버가 발급한 초대코드
  → /room/:code/waiting       참가자 폴링 · 호스트만 시작
  → /room/:code/survey        18문항 → 제출 → 전원 완료까지 대기
  → /room/:code/stage/1~4     ← 아직 껍데기
  → /room/:code/report        ← SELF 축만 실제 데이터
  → /room/:code/share         공유 카드
```

## 실행

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows
pip install -r requirements.txt

# MariaDB 없이 돌려보기 — SQLite 파일 하나면 된다
echo "DB_URL=sqlite:///./dev.db" > .env

python -m app.init_db             # 테이블 생성
uvicorn app.main:app --reload
```

MariaDB를 쓰려면 `.env`에서 `DB_URL`을 지우고 `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`을 채운다.
`docker compose up -d`로 MariaDB 컨테이너를 띄울 수 있다.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

백엔드 주소가 `http://localhost:8000`이 아니면 `frontend/.env`에 `VITE_API_BASE`를 넣는다.

### 검증

```bash
cd backend
python scripts/smoke.py
```

메모리 SQLite로 전체 흐름을 한 번 돌린다. DB도 서버도 안 띄워도 되고 아무것도 안 남긴다.
계정 발급 → 방 생성 → 입장 → 시작 → 설문 제출 → 축 산출까지 29개 항목을 확인한다.

```bash
cd frontend
npm run lint && npm run build
```

## 구조

```
frontend/src/
  api/          client.js(fetch 래퍼) · session.js(user_id) · rooms.js
  pages/        화면별 폴더
  context/      화면 간 공유 상태 (서버가 원본, 여긴 편의용)
  data/         카테고리 · 스테이지 메타
backend/app/
  models/       User · Room · Participant · AxisScore · CompatGrade · SurveyResponse
  data/         survey_items.py — 문항과 채점값
  scoring/      survey.py — SELF 축 산출
  routers/      users · rooms · participants · survey · reports · health
  scripts/      smoke.py
```

## 설계상 꼭 지켜야 할 것

기획안에서 지키기로 한 것 중 코드에 직접 걸린 것들이다. 무심코 되돌리기 쉬운 자리라 적어둔다.

- **`user_id`와 `Participant.id`를 섞지 않는다.** 앞은 사람, 뒤는 이 방에서의 참가 기록이다.
  `Participant.id`는 방마다 새로 생겨서 축 점수가 사람을 못 찾아간다. (기획안 §4-5)
- **`AxisScore` PK에서 `category`를 빼지 않는다.** 팀플에서 잰 값이 연인 리포트를 덮어쓴다. (§5-4)
- **방 코드는 서버가 발급한다.** 클라이언트에서 만들면 결국 충돌한다.
- **설문 응답에 축 이름과 선택지 값을 실어 보내지 않는다.** 보이면 답을 조작한다. (§10-2)
- **문항 선택지 개수를 하드코딩하지 않는다.** 2지·3지·순서형 4지가 섞여 들어온다. (§9-1)
- **`localStorage`에는 `user_id`만 넣는다.** 나머지는 서버에서 다시 받는다. (§4-2)
- **`IMPRESSION` 출처를 유형 결정에 쓰지 않는다.** (§5-4)

## 남은 작업

`docs/뼈대-검토.md`의 순서를 따른다.

1. ~~api/client.js + user_id · localStorage~~ ✔
2. ~~Participant에 user_id + User 모델~~ ✔
3. ~~방 생성·입장·대기실 서버 연동~~ ✔
4. ~~설문 18문항 + 제출 API~~ ✔
5. Stage 인터페이스 + 1단계(이지선다 + 순서 정하기 + 동시 공개) — 기획안 §10-1, §10-2
6. 축 산출 → 유형 판정 (룰만) — §6
7. 2~4단계
8. 칭호 · 궁합 계산 — §7, §8
9. LLM 리포트 + 폴백 — §11-3

합석·낮·밤 문항은 기획안 §9-4~9-6에 다 쓰여 있고, `backend/app/data/survey_items.py`로 옮기면 된다.
다만 기획안 §18 원칙대로 **팀플이 끝까지 도는 걸 본 다음에** 옮긴다.
