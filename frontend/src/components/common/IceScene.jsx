import './IceScene.css'

/**
 * 로고 아래 빙하 — 가운데 얼음덩이를 왼쪽 펭귄과 오른쪽 북극곰이 곡괭이로
 * 번갈아 찍고 있다.
 *
 * **두 장을 번갈아 보여주는 방식**을 골랐다. 곡괭이를 든 자세와 내려찍은
 * 자세, 딱 두 컷이다. 캐릭터가 36px밖에 안 되는데 부드럽게 보간하면 중간
 * 프레임이 죄다 뭉개져서 무슨 동작인지 알아볼 수 없고, 회전축을 아무리 잘
 * 잡아도 이 크기에서는 티가 안 난다. 게임 스프라이트가 두세 컷으로 버티는
 * 이유가 그것이고, 딱 끊기는 전환이 오히려 "일하고 있다"로 읽힌다.
 *
 * 둘 다 **얼음덩이를 보고** 선다. 정면을 보면 곡괭이가 어디를 향하는지가
 * 안 읽혀서, 뭘 하는 그림인지 알 수 없다. 두 손으로 같이 쥔다.
 *
 * 한 마리가 1.5초에 한 번, 곰은 그 절반을 밀어서 — 그래서 주고받는 소리처럼
 * 들린다. 동시에 치면 그냥 바쁜 화면이 된다.
 */

/** 곡괭이. 쥐는 자리가 (0,0), 날은 자루 반대쪽 끝에 있다. */
function Pickaxe({ transform }) {
  return (
    <g transform={transform}>
      <rect x="-2.4" y="-34" width="4.8" height="48" rx="2.4" fill="#b07c3c" stroke="#5f3f16" strokeWidth="2" />
      <path
        d="M-16 -30c7-11 25-11 32 0-9.5-5.5-22.5-5.5-32 0z"
        fill="#c6d3e6"
        stroke="#46506a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>
  )
}

/** 펭귄. 오른쪽(얼음덩이)을 본다. */
function Penguin({ hit }) {
  const lean = hit ? 'rotate(9 32 62)' : 'rotate(-2 32 62)'
  return (
    <g transform={lean}>
      <g stroke="#1d2029" strokeWidth="2.4" strokeLinejoin="round" fill="#f7a02b">
        <path d="M28 58c-6 1-9 4-8 6 1 2 7 2 11 0z" />
        <path d="M38 58c6 1 9 4 8 6-1 2-7 2-11 0z" />
      </g>
      {/* 옆에서 본 몸 — 뒤가 둥글고 앞이 배 */}
      <path
        d="M31 4c-11 0-18 11-18 27 0 17 6 29 19 29s18-12 18-29C50 15 42 4 31 4z"
        fill="#3c414c"
        stroke="#1d2029"
        strokeWidth="2.6"
      />
      <path d="M40 16c6 4 10 14 10 24 0 12-4 20-11 20-4 0-6-9-6-22s2-22 7-22z" fill="#fdfefe" />
      {/* 부리는 앞쪽(오른쪽)을 향한다 — 이 하나로 어느 쪽을 보는지가 정해진다 */}
      <path d="M46 22c4 0 8 2 8 3.6s-4 3.4-8 3.4z" fill="#f7a02b" stroke="#a4600f" strokeWidth="1.2" />
      <circle cx="41" cy="19" r="5.2" fill="#15181f" />
      <circle cx="43" cy="17" r="2" fill="#fff" />
      <ellipse cx="33" cy="30" rx="3.4" ry="2.2" fill="#ff8ab0" opacity="0.5" />

      {/* 두 손이 같이 쥔다. 뒤쪽 손은 조금 어둡게 두어 앞뒤가 구분되게. */}
      {hit ? (
        <>
          <path d="M40 34c8 2 13 7 14 12l-7 3c-3-5-7-9-11-10z" fill="#2f343e" stroke="#1d2029" strokeWidth="2.2" strokeLinejoin="round" />
          <Pickaxe transform="translate(52,48) rotate(126)" />
          <path d="M38 30c9 2 15 8 17 14l-7 3c-3-6-8-11-13-12z" fill="#3c414c" stroke="#1d2029" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      ) : (
        <>
          {/* 손은 가슴 높이, 날만 위로. 팔을 얼굴 앞으로 올리면 이 크기에서
              머리가 통째로 가려져 무슨 동물인지 안 보인다. */}
          <path d="M40 38c7-2 12-1 15 2l-4 6c-3-2-7-2-11-1z" fill="#2f343e" stroke="#1d2029" strokeWidth="2.2" strokeLinejoin="round" />
          <Pickaxe transform="translate(53,40) rotate(34)" />
          <path d="M38 34c8-2 14 0 18 4l-5 6c-3-3-9-3-13-2z" fill="#3c414c" stroke="#1d2029" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )}
    </g>
  )
}

/**
 * 북극곰. 왼쪽(얼음덩이)을 본다.
 *
 * 달걀에서 벗어나려면 두 가지가 필요하다. **머리와 몸을 나누고**, **귀를 둘**
 * 그리는 것. 한 덩이에 귀 하나를 붙이면 어느 각도에서 봐도 달걀이거나
 * 강아지다. 머리를 몸보다 크게 얹고 귀 두 개를 위로 세우면 그 순간 곰이 된다.
 */
function Bear({ hit }) {
  const lean = hit ? 'rotate(-8 36 66)' : 'rotate(2 36 66)'
  return (
    <g transform={lean}>
      <g fill="#f6f2e8" stroke="#6f6558" strokeWidth="2.4" strokeLinejoin="round">
        <path d="M42 62c6 1 10 4 9 6-1 2-8 2-12 0z" />
        <path d="M30 62c-6 1-10 4-9 6 1 2 8 2 12 0z" />
      </g>
      {/* 몸 — 머리보다 작고 낮게. 곰은 어깨가 두툼하다 */}
      <path
        d="M36 34c11 0 18 7 18 18 0 9-6 14-18 14s-18-5-18-14c0-11 7-18 18-18z"
        fill="#f6f2e8"
        stroke="#6f6558"
        strokeWidth="2.5"
      />
      {/* 귀 둘 — 뒤쪽 귀를 살짝 어둡게 해서 앞뒤가 보이게 */}
      <circle cx="47" cy="12" r="7.5" fill="#e8e1d2" stroke="#6f6558" strokeWidth="2.4" />
      <circle cx="26" cy="9" r="8" fill="#f6f2e8" stroke="#6f6558" strokeWidth="2.4" />
      <circle cx="26" cy="9" r="3.4" fill="#e8b9c4" />
      {/* 머리 — 몸보다 확실히 크게 */}
      <circle cx="34" cy="24" r="19" fill="#f6f2e8" stroke="#6f6558" strokeWidth="2.6" />
      {/* 주둥이는 머리 밖으로 나와 실루엣을 깬다. 짧고 넓게 — 길면 개가 된다 */}
      <path
        d="M20 20c-8 0-13 3.6-13 8s5 8 13 8c5.5 0 9-3.6 9-8s-3.5-8-9-8z"
        fill="#fffdf8"
        stroke="#6f6558"
        strokeWidth="2.4"
      />
      <ellipse cx="10" cy="25.5" rx="4.6" ry="3.6" fill="#20232b" />
      <path d="M11 29.5c2.6 3 6 2.2 6.6-.8" stroke="#20232b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="29" cy="20" r="4.6" fill="#20232b" />
      <circle cx="27.4" cy="18" r="1.8" fill="#fff" />
      <ellipse cx="40" cy="30" rx="3.6" ry="2.4" fill="#ff9ec0" opacity="0.45" />

      {hit ? (
        <>
          <path d="M28 40c-9 3-15 9-16 15l8 3c3-6 8-11 13-12z" fill="#e5decf" stroke="#6f6558" strokeWidth="2.2" strokeLinejoin="round" />
          <Pickaxe transform="translate(14,56) rotate(-124)" />
          <path d="M31 36c-10 3-17 9-19 16l8 3c3-7 9-13 15-14z" fill="#f6f2e8" stroke="#6f6558" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M28 42c-8-2-13-1-16 2l5 6c3-2 7-2 11-1z" fill="#e5decf" stroke="#6f6558" strokeWidth="2.2" strokeLinejoin="round" />
          <Pickaxe transform="translate(14,44) rotate(-30)" />
          <path d="M31 38c-9-2-15 0-19 4l5 7c4-3 10-3 14-2z" fill="#f6f2e8" stroke="#6f6558" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )}
    </g>
  )
}

export default function IceScene() {
  return (
    <div className="icescene" aria-hidden>
      {/* ── 빙하 ── */}
      <svg className="icescene-glacier" viewBox="0 0 400 110" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gl-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6a9dc9" stopOpacity="0.95" />
            <stop offset="0.4" stopColor="#33598c" stopOpacity="0.62" />
            {/* 아래를 완전히 없앤다. 색이 남으면 파란 띠 한 줄로 보인다. */}
            <stop offset="1" stopColor="#16234a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gl-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0fbff" />
            <stop offset="1" stopColor="#9ed4ef" />
          </linearGradient>
        </defs>
        {/* 뒤쪽 빙벽 — 층이 져야 얼음판이 아니라 빙하로 보인다 */}
        <path
          d="M0 44 46 30 92 40 120 22 168 36 210 26 252 38 300 24 342 36 380 28 400 40V110H0z"
          fill="#25406e"
          opacity="0.5"
        />
        <path d="M0 60 52 52 104 59 156 50 208 59 260 51 312 59 364 52 400 58V110H0z" fill="url(#gl-face)" />
        <path
          d="M0 60 52 52 104 59 156 50 208 59 260 51 312 59 364 52 400 58v9l-36 6-52-7-52 8-52-8-52 8-52-7-52 8-36-6z"
          fill="url(#gl-top)"
        />
        {/* 앞면을 비스듬히 나눠 밝기만 다르게 — 세로 선을 그으면 막대기가 된다 */}
        <g fill="#0f2145" opacity="0.2">
          <path d="M52 52 104 59 92 110H44z" />
          <path d="M208 59 260 51 268 110h-52z" />
          <path d="M364 52 400 58v52h-46z" />
        </g>
      </svg>

      {/* ── 가운데 얼음덩이 ── */}
      <div className="icescene-block">
        <svg viewBox="0 0 72 60" width="72" height="60">
          <defs>
            <linearGradient id="blk" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0" stopColor="#eafaff" />
              <stop offset="0.5" stopColor="#a8dcf4" />
              <stop offset="1" stopColor="#5ba3cf" />
            </linearGradient>
          </defs>
          <path
            d="M13 16 32 5l27 8 8 20-9 22H16L5 36z"
            fill="url(#blk)"
            stroke="#dff4ff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <g fill="#ffffff" opacity="0.38">
            <path d="M13 16 32 5l6 15-14 12z" />
            <path d="M59 13l8 20-11 4-6-16z" />
          </g>
          <g className="icescene-hitmark icescene-hitmark-a" fill="none" strokeLinecap="round">
            <path d="M26 20 20 30 27 34 22 44" stroke="#2c4f7d" strokeWidth="3.4" />
            <path d="M26 20 20 30 27 34 22 44" stroke="#f4fcff" strokeWidth="1.4" transform="translate(-1,-1)" />
          </g>
          <g className="icescene-hitmark icescene-hitmark-b" fill="none" strokeLinecap="round">
            <path d="M46 18 52 28 45 33 50 43" stroke="#2c4f7d" strokeWidth="3.4" />
            <path d="M46 18 52 28 45 33 50 43" stroke="#f4fcff" strokeWidth="1.4" transform="translate(1,-1)" />
          </g>
        </svg>
        <span className="icescene-chip icescene-chip-1" />
        <span className="icescene-chip icescene-chip-2" />
        <span className="icescene-chip icescene-chip-3" />
        <span className="icescene-chip icescene-chip-4" />
      </div>

      {/* ── 두 마리. 각자 두 컷을 겹쳐두고 번갈아 켠다 ── */}
      <div className="icescene-actor icescene-penguin">
        <svg viewBox="0 0 64 72" width="38" height="43">
          <ellipse cx="32" cy="66" rx="15" ry="3" fill="#050a1e" opacity="0.45" />
          <g className="icescene-frame icescene-frame-up">
            <Penguin hit={false} />
          </g>
          <g className="icescene-frame icescene-frame-hit">
            <Penguin hit />
          </g>
        </svg>
      </div>

      <div className="icescene-actor icescene-bear">
        <svg viewBox="0 0 72 76" width="44" height="46">
          <ellipse cx="36" cy="70" rx="16" ry="3" fill="#050a1e" opacity="0.45" />
          <g className="icescene-frame icescene-frame-up">
            <Bear hit={false} />
          </g>
          <g className="icescene-frame icescene-frame-hit">
            <Bear hit />
          </g>
        </svg>
      </div>
    </div>
  )
}
