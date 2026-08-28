# 얼음땡 *(가제)*

기획안(`ai-project-team3/-` 저장소의 `얼음땡-기획안.md`) 기준 구현.

처음 만난 다섯 명이 18분짜리 아이스브레이킹을 하면, 각자의 캐릭터 카드와 팀 리포트가 나온다.
음성은 쓰지 않는다. **선택과 추측만으로** 능력치를 만든다.

**되는 것** — 익명 계정, 방 생성·입장·대기실, 전원 제출까지 폴링 후 동시 공개, 선택형 문항 제출과 채점
**아직 안 되는 것** — 첫인상 투표, 진실/거짓, 유형 맞히기, 능력치 5개 산출, 유형·칭호·궁합·팀 등급, 리포트 3화면

## 스택

- **Frontend** React 19 + Vite, react-router-dom
- **Backend** FastAPI, SQLAlchemy
- **DB** MariaDB (로컬은 SQLite로도 가능)

## 진행 흐름

```
1. 입장              2:00   닉네임 · 성별 · MBTI
2. 첫인상 투표 ①      2:00   5문항, 한 명씩 지목
3. 동시에 답하기      5:00   이지선다 8문항 (+ 응답 시간 기록)
4. 둘은 진실, 하나는 거짓  5:00   세 줄 입력 → 남의 거짓 찾기
5. 첫인상 투표 ②      2:00   ②와 같은 5문항
6. 누가 나를 맞힐까    2:00   자기 유형 찍기 → 남들 유형 배정
                    ─────
                    18:00
```

**단계 2·3·5·6은 화면 하나가 담당한다.** 문제 → 제출 → 전원 완료 시 동시 공개라는
껍데기가 같아서, 안에 들어가는 문제 종류만 달라진다.

## 화면

```
/ 시작                        닉네임 · 성별 · MBTI → user_id 발급
  → /join                     초대코드로 참여
  → /room/create              서버가 발급한 초대코드
  → /room/:code/waiting       참가자 폴링 · 호스트만 시작
  → /room/:code/play/:stage   공통 게임 화면 — 단계 2·3·5·6
  → /room/:code/statements    문장 입력 — 단계 4 전용
  → /room/:code/result        결과 허브 (세 메뉴)
      → /result/me            개인 리포트
      → /result/team          팀 리포트
      → /result/next          페르소나 넘기고 다음 게임으로
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

> **`.env`를 PowerShell로 만들 때 주의.** `Set-Content -Encoding utf8`은 BOM을 붙여서
> 첫 줄 키가 `﻿DB_URL`로 읽힌다. 위처럼 `echo`를 쓰거나, 에디터에서 BOM 없는 UTF-8로 저장한다.

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

```bash
cd frontend
npm run lint && npm run build
```

빌드가 통과해도 브라우저에서만 드러나는 문제가 있다. **React StrictMode는 개발 중에
마운트를 두 번 한다.** 요청을 한 번만 보내려고 ref로 막아두고 언마운트에서 응답을 버리면,
첫 마운트의 응답이 사라진 채 ref가 재시도까지 막는다. 화면이 영원히 로딩에 머문다.

## 구조

```
frontend/src/
  api/          client.js(fetch 래퍼) · session.js(user_id) · rooms.js
  pages/        화면별 폴더
  context/      화면 간 공유 상태 (서버가 원본, 여긴 편의용)
  data/         단계 메타
backend/app/
  models/       User · Room · Participant · Answer · Guess · Ability · Report
  data/         문항 정의
  scoring/      능력치 산출 · 유형 판정 · 궁합 · 팀 등급
  routers/      users · rooms · participants · play · reports · health
  scripts/      smoke.py
```

## 설계상 꼭 지켜야 할 것

기획안에서 지키기로 한 것 중 코드에 직접 걸린 것들이다. 무심코 되돌리기 쉬운 자리라 적어둔다.

- **`user_id`와 참가 기록 id를 섞지 않는다.** 앞은 사람, 뒤는 이 방에서의 참가 기록이다.
  참가 기록 id는 방마다 새로 생겨서 능력치가 사람을 못 찾아간다. (기획안 §13)
- **MBTI를 능력치 산출식과 유형 판정에 넣지 않는다.** 리포트 문장을 쓸 때 컨텍스트로만
  넘긴다. 한 번 섞이면 "오늘의 나"가 아니라 MBTI 재탕이 된다. (§12)
- **첫인상 투표 결과를 능력치 본값에 합치지 않는다.** `IMPRESSION_PRE` / `IMPRESSION_POST`는
  레이더 점선과 인상 변화 전용이다. (§5, §13)
- **첫인상 5문항은 앞뒤가 완전히 같아야 한다.** 문항이 하나라도 다르면 전후 비교가 무의미해지고,
  `첫인상 배신자` 칭호와 팀 등급의 인상 변화량 지표가 같이 무너진다. (§4-5)
- **응답 시간은 클라이언트가 재서 함께 보낸다.** 서버 도착 시각으로 재면 네트워크 지연이
  순발력 점수가 된다. (§5)
- **문항 응답에 능력치 이름과 채점값을 실어 보내지 않는다.** 보이면 답을 조작한다.
- **방 코드는 서버가 발급한다.** 클라이언트에서 만들면 결국 충돌한다.
- **`localStorage`에는 `user_id`만 넣는다.** 나머지는 서버에서 다시 받는다.
- **등급과 궁합의 바닥을 없애지 않는다.** 팀 등급 최하 `S`, 궁합 최하 `B`는 의도된 설계다.
  나쁜 결과가 안 나오는 것이 요구사항이다. (§8, §9)

## 남은 작업

```
✔ 익명 계정 · user_id · localStorage
✔ 방 생성 · 입장 · 대기실 · 호스트 시작
✔ 전원 제출까지 폴링 후 동시 공개
✔ 선택형 문항 제출과 서버 채점

□ 1. 공통 게임 화면 일반화        기존 설문 화면을 문제 종류만 갈아끼우는 형태로   §14
□ 2. 이지선다 8문항 + 응답 시간    elapsed_ms를 클라이언트에서 함께 전송        §4-3
□ 3. 첫인상 투표 ①②              Guess(kind=IMPRESSION_PRE/POST)            §4-2, §4-5
□ 4. 문장 입력 + 거짓 찾기         Statement · Guess(kind=LIE)                §4-4
□ 5. 유형 맞히기                  Guess(kind=TYPE) · 자기 예측 포함            §4-6
□ 6. 능력치 5개 산출               DOM·EXP·EMP는 선택, SPD는 시간, OBS는 정답률  §5
□ 7. 유형 판정                    DOM×EXP×OBS 8분면 · SPD 타이브레이커         §6
□ 8. 궁합 · 칭호 · 팀 등급          §7, §8, §9
□ 9. 리포트 3화면                 결과 허브 · 개인 카드 · 팀 카드               §10
□ 10. 문구 사전                   첫 줄과 마지막 줄을 짝지어 보관               §11
```

**1~5번을 먼저 끝내 한 바퀴가 도는 것을 본 뒤에 6번 이후로 간다.** 산출식을 아무리
잘 만들어도 데이터가 안 들어오면 확인할 방법이 없다.

기존 설문 코드(`survey_items.py`, `scoring/survey.py`)는 **선택형 문항을 서버에서 채점하는
구조가 그대로 쓰인다.** 문항 내용과 축 매핑만 새 기획안 §4-3으로 갈아끼우면 된다.
