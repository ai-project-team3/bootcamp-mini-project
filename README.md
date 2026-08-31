# 얼음땡 

처음 만난 사람들이 18분짜리 아이스브레이킹을 함께 하면, 각자의 캐릭터 카드와
팀 리포트가 나오는 웹 서비스. **음성은 쓰지 않는다. 선택과 추측만으로** 능력치를 만든다.

기획안은 `ai-project-team3/-` 저장소의 `얼음땡-기획안.md`이며, 이 브랜치에는
읽기 편하도록 `docs/`에 사본을 둔다. **원본이 우선한다.**

발표 기획안 — 10분 발표용 슬라이드 구성·대본·시연 콘티는
[`docs/얼음땡-발표기획안.html`](docs/얼음땡-발표기획안.html)에 있다. 이건 사본이
아니라 이 저장소가 원본이다. 브라우저로 열어 읽고, `Ctrl+P`로 PDF로 저장한다.

## 스택

- **Frontend** React 19 + Vite, react-router-dom
- **Backend** FastAPI, SQLAlchemy
- **DB** MariaDB (로컬은 SQLite로도 가능)

## 진행 흐름

```
/                          시작 — 닉네임 · 성별 · MBTI
  → /room/create           방 만들기 — 프로젝트 서술 · 인원 수 · QR/초대코드
  → /join/:code            초대코드로 참여
  → /room/:code/waiting    대기실 — 호스트가 시작
  → /room/:code/game       아홉 단계를 화면 하나가 돌린다
  → /room/:code/hub        결과 허브
  → /room/:code/report/me     개인 리포트
  → /room/:code/report/team   팀 리포트
```

단계는 **노출도가 오르는 순서**로 배치돼 있고 그 순서는 `services/flow.py`가
혼자 정한다. 라우터는 다음 단계를 물어볼 뿐 각자 후속을 정하지 않는다.

```
1 입장          2 첫인상 투표①   3 텔레파시      4 동시에 답하기
5 ○○님은…       6 눈치 게임      7 라이어 게임    8 첫인상 투표②   9 유형 맞히기
```

인원이 모자라 성립하지 않는 단계는 건너뛴다 — 첫인상 투표는 3명부터, 라이어는
3명부터, ○○님은/눈치는 2명부터, 이지선다와 유형 맞히기는 혼자서도 된다.

전원이 제출하면 호스트 클릭 없이 서버가 다음 단계로 넘긴다. 짧은 주기 폴링이고
WebSocket은 쓰지 않는다. 화면도 서버 단계를 따라 폴링하므로, 어떤 단계가 스스로
넘기기에 실패해도 화면이 멈추지 않는다.

## 지금 되는 것

```
✔ 인원 1~8명 · 못 도는 단계 건너뛰기
✔ localStorage 재접속 복구
✔ 집계만 공개 (누가 뭘 골랐는지 숨김)
✔ 텔레파시 · 눈치 게임 · 라이어 게임
✔ ○○님은 ___한 사람이다 (진실/거짓 대체)
✔ 능력치 5개 · 유형 8종 · 칭호 · 궁합 S/A/B · 팀 등급 SSS~S
✔ 문항 생성 + 게임 소재 생성 + 유형 부제 생성 (블록별 폴백)
✔ 리포트 문장 생성 (사전 폴백, 방에 캐시)
✔ 페르소나 인계 API
✔ 파티 팔레트 · 단계 전환 · 집계 차오름 · 눈치 색 전환
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

MariaDB를 쓰려면 `.env`에서 `DB_URL`을 지우고 `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`을
채운다. `docker compose up -d`로 컨테이너를 띄울 수 있다.

> **`.env`를 PowerShell로 만들 때 주의.** `Set-Content -Encoding utf8`은 BOM을 붙여서
> 첫 줄 키가 `﻿DB_URL`로 읽힌다. 위처럼 `echo`를 쓰거나 BOM 없는 UTF-8로 저장한다.

### Gemini 키 — 각자 발급해서 각자 `.env`에

키는 **공유하지 않는다.** 팀원마다 하나씩 받아서 자기 `backend/.env`에 넣는다.
`.env`는 `.gitignore`에 있어서 커밋되지 않는다.

**1. 발급** — [Google AI Studio](https://aistudio.google.com/apikey) 에서 구글 계정으로
로그인하고 `Create API key`. 무료이고 카드 등록도 필요 없다.

**2. 넣기** — `backend/.env`에 한 줄 추가한다. 따옴표도 공백도 넣지 않는다.

```
GEMINI_API_KEY=AIza...
```

**3. 패키지** — venv에 SDK가 있어야 한다. 예전에 만들어 둔 venv라면 빠져 있을 수 있다.

```bash
cd backend && pip install -r requirements.txt
```

**4. 확인** — 키를 화면에 찍지 않고 실제로 되는지만 본다.

```bash
cd backend && python scripts/check_gemini.py
```

`[ 사용가능 ]` 이 나오면 끝이다. 서버를 이미 띄워뒀다면 **다시 시작해야** 한다 —
`.env`는 뜰 때 한 번만 읽는다.

**키가 없어도 앱은 돌아간다.** 문항 13개는 기본 세트로, 리포트는 사전 문장으로
나간다. 게임 규칙·능력치·유형·궁합은 전부 코드 계산이라 키와 무관하다.
그래서 리포트 문구를 손보기 전에는 위 확인부터 하는 편이 낫다 — 호출이 안 되고
있으면 프롬프트를 아무리 고쳐도 화면이 안 바뀐다.

키가 하는 일은 두 가지다(기획안 §5).

| 언제 | 무엇을 |
|---|---|
| 방을 만들고 참가자를 모으는 동안 | 호스트가 적은 프로젝트에 맞춘 문항 13슬롯 + 게임 소재 3종 |
| 마지막 단계가 끝난 직후 | 개인 코멘트 + 팀 요약·근거·하이라이트 |

> 실수로 키가 새면 AI Studio에서 **삭제하고 새로 발급**하면 끝이다. 무료 키라
> 금전 피해는 없다. 채팅이나 이슈에 붙여넣지만 않으면 된다.

> **무료 한도는 하루 20회다**(모델·프로젝트당). **인원수와 무관하게 한 판에
> 두 번**이다 — 방을 열 때 문항 한 번, 리포트를 처음 여는 사람이 한 번. 나머지
> 사람은 저장된 문장을 읽는다. 그래서 키 하나로 **하루 열 판**이다.
> `문항 다시 만들기`를 누르면 그때마다 한 번씩 더 든다. 팀원마다 키가 따로 있어야 하는 진짜 이유가
> 이것이고, 데모 전에 테스트를 많이 돌렸다면 그날 한도가 이미 없을 수 있다.
> 한도를 넘기면 429가 나고 앱은 기본 문장으로 넘어간다 — 죽지는 않는다.
>
> `scripts/flow_check.py`는 키가 있어도 생성을 끄고 돈다. 검사 한 번이 하루치의
> 십분의 일을 먹으면 안 되고, 그 스크립트가 재는 것은 흐름이 끝까지 도는가지
> 문장이 예쁜가가 아니다.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

백엔드 주소가 `http://localhost:8000`이 아니면 `frontend/.env`에 `VITE_API_BASE`를 넣는다.

> **팀원을 부를 때는 `localhost` 말고 터미널에 뜬 `Network` 주소로 접속한다.**
> Vite가 시작할 때 `Local:`과 `Network:` 두 줄을 찍는데, 폰에서 닿는 것은 두 번째다
> (`http://192.168.0.27:5173` 같은 모양). QR과 초대 링크는 **방을 만든 사람의
> 주소창**을 그대로 따라가므로, `localhost`로 열어놓고 만든 QR은 찍는 폰에서
> 폰 자신을 가리켜 아무 데도 닿지 않는다. 방을 만든 사람 화면은 멀쩡해 보이고
> 찍는 쪽만 실패하니 원인을 찾기 어렵다. 방 만들기 화면이 이 상황을 감지하면
> 경고를 띄우고, 서버가 랜 주소를 알아내면 QR에는 그 주소를 대신 담는다.
>
> 같은 Wi-Fi가 아니면(회사망 격리, 다른 대역) 터널을 쓴다 —
> `cloudflared tunnel --url http://localhost:5173`. 그 도메인으로 접속하면 QR도
> 따라간다.

### 검증

```bash
cd backend && python scripts/flow_check.py
```

1 · 2 · 3 · 5 · 8명 방을 각각 끝까지 돌려 리포트까지 나오는지 확인한다. 메모리
SQLite로 실제 라우터를 거치므로 DB도 서버도 안 띄워도 되고 아무것도 안 남긴다.

```bash
cd frontend && npm run lint && npm run build
```

빌드가 통과해도 브라우저에서만 드러나는 문제가 있다. **React StrictMode는 개발 중에
마운트를 두 번 한다.** 요청을 한 번만 보내려고 ref로 막아두고 언마운트에서 응답을
버리면, 첫 마운트의 응답이 사라진 채 ref가 재시도까지 막는다. 화면이 영원히 로딩에
머문다.

## 구조

```
frontend/src/
  pages/        화면별 폴더 (컴포넌트 + co-located CSS)
  components/   common(Button·Card·Badge·ProgressBar) · layout(PhoneFrame·TopBar)
  context/      RoomFlowContext — 닉네임·성별·MBTI·방코드·playerId
  data/         문항·유형 등 정적 콘텐츠
  router/       AppRouter
  styles/       theme.css 디자인 토큰
backend/app/
  models/       Room · Player · Answer · Statement · Guess · Ability · Report
  schemas/      Pydantic 요청/응답
  routers/      health · rooms · players · answers · impressions · statements ·
                type_guess · reports
  content/      문항·문구 사전
  services/     scoring.py — 능력치·유형·칭호·궁합·팀등급
```

## 설계상 꼭 지켜야 할 것

기획안에서 정한 것 중 코드에 직접 걸린 것들이다. 무심코 되돌리기 쉬운 자리라 적어둔다.

- **인원 관련 상수를 게이트 조건에 박지 않는다.** 전부 `len(players)`에서 계산한다.
  5로 박으면 4명이나 6명일 때 게임이 통째로 멈춘다
- **MBTI를 능력치 산출식과 유형 판정에 넣지 않는다.** 리포트 문장의 컨텍스트로만
  넘긴다. 한 번 섞이면 "오늘의 나"가 아니라 MBTI 재탕이 된다   §13
- **첫인상 투표 결과를 능력치 본값에 합치지 않는다.** `IMPRESSION_PRE`/`POST`는
  레이더 점선과 인상 변화 전용이다   §6, §14
- **첫인상 5문항은 앞뒤가 완전히 같아야 한다.** 하나라도 다르면 전후 비교가
  무의미해지고 `첫인상 배신자` 칭호와 팀 등급 지표가 같이 무너진다   §4-8
- **능력치 매핑을 `Question` 행에 저장하지 않는다.** 슬롯 이름이 곧 매핑이고 그 표는
  코드 상수다. 저장하면 생성 결과가 채점을 바꿀 수 있게 된다   §5-2
- **응답 시간은 클라이언트가 재서 함께 보낸다.** 서버 도착 시각으로 재면 네트워크
  지연이 순발력 점수가 된다   §6
- **개인 선택을 공개하지 않는다.** 집계만 보여준다   §3-4
- **방 코드는 서버가 발급한다.** 클라이언트에서 만들면 결국 충돌한다
- **`localStorage`에는 식별자만 넣는다.** 나머지는 서버에서 다시 받는다
- **등급과 궁합의 바닥을 없애지 않는다.** 팀 등급 최하 `S`, 궁합 최하 `B`는 의도된
  설계다. 나쁜 결과가 안 나오는 것이 요구사항이다   §9, §10

## 기획안이 비워둔 곳의 기본값

기획안 §18이 확정하지 않은 항목은 아래처럼 임시로 채워져 있다. 코드 주석에도
표시돼 있어 바꾸기 쉽다.

| 항목 | 기본값 |
|---|---|
| 유형 8종 색·심볼 | `backend/app/constants.py`의 `TYPES`에 테마 팔레트 기반 임시 배정 |
| 문장 입력 글자 수 상한 | 60자 |
| 코멘트 생성 | LLM 미연동, `content/comments.py` 사전 문장 |
| 결과 링크 유효기간 | 없음 (무기한) |

궁합 S/A/B와 팀 등급 4지표의 "상위" 컷오프도 기획안에 수치가 없어
`services/scoring.py`에 임의로 정해뒀다.

## 부가 미니게임 — 마피아 · 커플 브루마블

기획안 §17의 "페르소나 이후 게임"에 해당하는 별도 파트입니다. 본 게임(얼음땡)과
코드가 섞이지 않도록 각자 폴더 안에 격리되어 있습니다.

| 게임 | 인원 | 경로 | 코드 |
|---|---|---|---|
| **마피아** | 4~8인 | `/games/mafia` | `backend/app/mafia/`, `frontend/src/pages/mafia/` |
| **커플 브루마블** | 2~8인 | `/games/marble` | `backend/app/marble/`, `frontend/src/pages/marble/` |

- API는 `/mafia/...`, `/marble/...` 로 네임스페이스되어 본 게임의 `/rooms`, 데모의
  `/demo/rooms` 와 겹치지 않습니다.
- CSS는 각 게임의 루트 클래스(`.mafia-app`, `.pm-app`) 아래로 스코프되어 있어
  공용 디자인 토큰과 서로 영향을 주지 않습니다.
- 성향 데이터는 어댑터(`persona/provider.py`)를 통해 들어옵니다. 실제 페르소나 API가
  준비되면 그 구현체만 교체하면 되고 게임 로직은 그대로입니다.
- 두 게임 모두 인메모리 방 저장소를 쓰며 DB를 사용하지 않습니다.

### 미니게임 테스트

```bash
cd backend && pytest        # 데모룸 + 두 미니게임
cd frontend && npm test     # 두 미니게임 (vitest)
```

## 다른 파트와의 관계

이 브랜치는 **아이스브레이킹**을 담당한다. 페르소나가 만들어진 다음은 다른 브랜치다.

| 브랜치 | 담당 | 내용 |
|---|---|---|
| `acy` | 치영 | 마피아 게임 · 페르소나 마블 (백엔드 state machine + 테스트 포함) |
| `minwoo` | 민우 | 파티 게임 데모 — 라이어 · 텔레파시 · 금지어 · 몸으로 말해요 · 페르소나 임포스터/예측 |

### 페르소나 인계 인터페이스 — 지금 어긋나 있다

마피아 쪽은 이미 받을 자리를 만들어뒀다. `POST /mafia/rooms/{room_id}/persona`가
외부에서 호출하도록 열려 있고, `PersonaScores.from_partial()`이 빠진 축을 중립
50으로 채운다.

문제는 **축 이름과 눈금이 다르다는 것**이다.

```
마피아 쪽   initiative · analysis · empathy · caution        0 ~ 100
여기        DOM · SPD · EXP · EMP · OBS                      0.0 ~ 5.0
```

`empathy ← EMP`, `initiative ← DOM`까지는 자연스러운데 나머지는 대응이 없다.
**어느 쪽 이름으로 통일할지, 눈금을 어디서 변환할지 정해야 한다.** 안 정하면 마지막에
`결과 허브 → 게임으로 가기`가 연결되지 않는다.

## 참고

`docs/뼈대-검토.md`는 개정 전 기준의 검토 기록이다. 지금은 위의 "달라진 것" 목록이
최신이다.
