# 얼음땡

**처음 만난 사람들이 모여 앉아 서로를 알아가는 아이스브레이킹 웹 서비스.**
게임이 끝나면 각자의 캐릭터 카드와 팀 리포트가 남습니다.

`React 19` · `Vite` · `FastAPI` · `SQLAlchemy` · `MariaDB` · `Gemini 3.6 Flash`

<p>
  <img src="docs/images/type-self-host.png" width="200" alt="유형 카드 — 셀프 사회자">
  <img src="docs/images/type-armchair-doctor.png" width="200" alt="유형 카드 — 방구석 박사">
  <img src="docs/images/type-quiet-detective.png" width="200" alt="유형 카드 — 은둔형 명탐정">
</p>

<sub>유형 카드 8종 중 셋 — 셀프 사회자 · 방구석 박사 · 은둔형 명탐정</sub>

---

## 어떤 문제를 푸나

아이스브레이킹에는 늘 **사회자가 필요**했습니다. 누가 진행을 맡아야 하고, 그
사람은 게임을 돌리느라 정작 어울리지 못합니다. 규칙을 설명하는 동안 흐름이 끊기고,
"다음 뭐 할까요"가 나오면 판이 식습니다.

그렇다고 성격 검사 같은 건 결과는 남지만 **혼자 하는 것**이라 같이 있는 사람들과
아무 상관이 없습니다.

**얼음땡은 그 사회자 역할을 서비스가 맡습니다.** 규칙 안내도, 순서도, 시작 신호도
앱이 냅니다. 사람들은 어울리는 데만 쓰면 됩니다.

> **말은 사람끼리 오갑니다.** 라이어 게임은 서로 제시어를 떠보며 추리하는
> 게임이고, 눈치 게임도 서로를 보면서 합니다. 앱이 쓰지 않는 것은 **음성 인식**
> 입니다 — 오간 말을 받아 적는 대신 **선택과 추측만으로** 능력치를 만듭니다.

## 핵심 기능

| | |
|---|---|
| **가상의 사회자** | 규칙 안내 · 순서 · 시작 신호 · 다음 게임까지 앱이 진행합니다. 인원이 모자라 성립하지 않는 단계는 자동으로 건너뜁니다. |
| **집계만 공개** | 누가 누구를 지목했는지는 끝까지 밝히지 않고 표 수만 보여줍니다. 지목이 드러나면 솔직하게 고르지 않기 때문입니다. |
| **팀 맥락으로 만드는 문항** | 방을 만들 때 팀 소개를 한 줄 적으면 LLM이 그 팀에 맞는 문항 13개를 만듭니다. 해커톤 팀과 동아리 신입 모임이 같은 문항을 풀지 않습니다. |

능력치는 **주도력 · 순발력 · 표현력 · 공감력 · 관찰력** 다섯 축이고, 그 조합으로
**유형 8종** 중 하나가 카드로 나옵니다. 개인 리포트에는 *내가 남을 어떻게 봤는지*가
아니라 **남들이 나를 어떻게 봤는지**가 담깁니다.

## 진행 흐름

```
/                          시작 — 닉네임 · 성별 · MBTI
  → /room/create           방 만들기 — 팀 소개 · 인원 수 · QR/초대코드
  → /join/:code            초대코드로 참여
  → /room/:code/waiting    대기실 — 호스트가 시작
  → /room/:code/game       아홉 단계를 화면 하나가 돌린다
  → /room/:code/hub        결과 허브
  → /room/:code/report/me     개인 리포트
  → /room/:code/report/team   팀 리포트
```

단계는 **노출도가 오르는 순서**로 배치돼 있고, 그 순서는 `services/flow.py`가 혼자
정합니다. 라우터는 다음 단계를 물어볼 뿐 각자 후속을 정하지 않습니다.

```
1 입장          2 첫인상 투표①   3 텔레파시      4 동시에 답하기
5 ○○님은…       6 눈치 게임      7 라이어 게임    8 첫인상 투표②   9 유형 맞히기
```

인원이 모자라 성립하지 않는 단계는 건너뜁니다 — 첫인상 투표는 3명부터, 라이어는
3명부터, ○○님은/눈치는 2명부터, 이지선다와 유형 맞히기는 혼자서도 됩니다.

전원이 제출하면 호스트 클릭 없이 서버가 다음 단계로 넘깁니다. 짧은 주기 폴링이고
WebSocket은 쓰지 않습니다. 화면도 서버 단계를 따라 폴링하므로, 어떤 단계가 스스로
넘기기에 실패해도 화면이 멈추지 않습니다.

## 기술적으로 풀었던 문제

### 동시 접속이 만든 중복 호출

리포트 문장은 **한 방에 한 번만** 만들면 되도록 캐시해 두었는데, 5명이 한 판 돌
때마다 LLM 호출이 **6번** 나갔습니다. 인원이 늘면 호출도 같이 늘었습니다.

원인은 **읽는 시점이 전원 동시**라는 것이었습니다. 마지막 게임이 끝나면 모두가 같은
순간에 결과 화면으로 나오고, 생성에 10~20초가 걸리는 그 사이에 다들 리포트를 엽니다.
전원이 "저장된 게 없다"를 보고 각자 생성을 부릅니다. **캐시가 있어도 채워지기 전에
다 같이 도착하면 없는 것과 같습니다.**

방 단위 잠금으로 첫 요청만 쓰고 나머지는 기다렸다 읽게 했습니다. 기다린 요청은
자기 트랜잭션을 먼저 롤백해야 앞사람의 커밋이 보입니다 — 이걸 빼면 잠금은 걸리는데
값은 여전히 안 보여서 또 부릅니다.

**호출 6회 → 2회, 인원수와 무관.** `backend/app/routers/reports.py`

### 방을 만든 사람에게는 보이지 않는 버그

내가 방을 만들면 팀원이 QR로 다 들어오는데, **팀원이 방을 만들면 아무도 못
들어왔습니다.** QR에 `window.location.origin`을 그대로 담고 있었기 때문입니다.
`localhost`로 열어놓고 만든 QR은 그걸 찍은 **폰 자신**을 가리킵니다.

오래 안 잡힌 이유는 **실패가 비대칭**이라서였습니다. 방을 만든 사람 화면에는 QR이
정상으로 보이고, 실패는 폰을 든 사람에게만 일어납니다. 그 사람이 할 수 있는 말은
"안 돼요"뿐입니다.

지금은 주소창이 loopback일 때만 서버에 "같은 네트워크에서 닿는 주소"를 물어
(`GET /health/lan`) 그 주소를 담습니다. 터널 도메인이나 랜 IP는 이미 밖에서 닿는
주소라 손대지 않고, 못 찾으면 조용히 두는 대신 화면에 경고를 띄웁니다.

`frontend/src/pages/roomCreate/inviteAddress.js` · `backend/app/routers/health.py`

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
  models/       Room · Player · Answer · Question · Guess · Ability · Report
  schemas/      Pydantic 요청/응답
  routers/      health · rooms · players · answers · impressions · telepathy ·
                trait · nunchi · liar · type_guess · reports
  content/      문항·문구 사전
  services/     flow.py — 단계 전이 / scoring.py — 능력치·유형·칭호·궁합·팀등급
                question_gen.py · report_gen.py — LLM 생성과 폴백
```

## 실행

### Backend

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

MariaDB 없이 돌려보려면 `.env`에 `DB_URL=sqlite:///./icetag.db` 한 줄이면 됩니다.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> **팀원을 부를 때는 `localhost` 말고 터미널에 뜬 `Network` 주소로 접속하세요.**
> Vite가 `Local:`과 `Network:` 두 줄을 찍는데, 폰에서 닿는 것은 두 번째입니다
> (`http://192.168.0.27:5173` 같은 모양). 같은 Wi-Fi가 아니면 터널을 씁니다 —
> `cloudflared tunnel --url http://localhost:5173`.

### Gemini 키 — 각자 발급해서 각자 `.env`에

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 키를 발급받습니다
2. `backend/.env`에 `GEMINI_API_KEY=...` 한 줄을 넣습니다 (`.env`는 커밋되지 않습니다)
3. `python scripts/check_gemini.py` 로 연동을 확인합니다

> **무료 한도는 하루 20회입니다**(모델·프로젝트당). **인원수와 무관하게 한 판에
> 두 번** — 방을 열 때 문항 한 번, 리포트를 처음 여는 사람이 한 번. 나머지 사람은
> 저장된 문장을 읽습니다. 그래서 키 하나로 **하루 열 판**입니다.
> `문항 다시 만들기`를 누르면 그때마다 한 번씩 더 듭니다.
>
> 키가 없어도 서비스는 돌아갑니다. 문항과 리포트 문장이 사전 세트로 폴백됩니다.

### 검증

```bash
cd backend && python scripts/flow_check.py    # 1·2·3·5·8명 방을 끝까지 재생
cd backend && pytest                          # 302개
cd frontend && npm test                       # 248개
cd frontend && npm run lint && npm run build
```

`flow_check.py`는 메모리 SQLite로 **실제 라우터를 거쳐** 리포트까지 나오는지 봅니다.
DB도 서버도 안 띄우고, 아무것도 남기지 않습니다. LLM 호출은 꺼둡니다.

## 문서

| | |
|---|---|
| [`docs/얼음땡-기획안.md`](docs/얼음땡-기획안.md) | 서비스 기획안 (사본 — 원본은 별도 저장소) |
| [`docs/개발-노트.md`](docs/개발-노트.md) | 설계상 지켜야 할 것 · 기본값 · 미니게임 · 인계 인터페이스 |
| [`docs/얼음땡-발표기획안.html`](docs/얼음땡-발표기획안.html) | 10분 발표용 슬라이드 구성과 시연 콘티 |

부가 미니게임(마피아 · 커플 브루마블)은 [`docs/개발-노트.md`](docs/개발-노트.md)를
참고하세요. 본 게임과 코드가 섞이지 않도록 각자 폴더 안에 격리돼 있습니다.

## 팀

**3조** — 박진웅 · 안치영 · 이재환 · 최민우 · 이종훈
