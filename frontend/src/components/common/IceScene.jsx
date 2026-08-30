import './IceScene.css'

/**
 * 로고 아래 빙하와, 그 위에서 얼음을 부수고 있는 펭귄.
 *
 * 처음에는 이 친구가 화면을 가로질러 걸어다니게 했는데, 눈이 자꾸 따라가서
 * 정작 읽어야 할 것을 안 읽게 된다. 한자리에서 **계속 얼음을 부수는** 쪽이
 * 이름과도 맞고, 곁눈으로만 보여서 방해도 안 된다. 한 번 내리치는 데 3.4초.
 *
 * 그리기에서 귀여움을 만드는 것은 비율이다. 머리를 크게, 몸을 작게, 흰 면은
 * **얼굴과 배로 나눠서** 둔다. 흰 면 하나로 앞을 다 덮으면 검은 후드가
 * 테두리만 남아 펭귄으로 안 보인다 — 처음에 그렇게 그렸다가 고쳤다.
 */
export default function IceScene() {
  return (
    <div className="icescene" aria-hidden>
      <svg className="icescene-floe" viewBox="0 0 400 80" preserveAspectRatio="none">
        <defs>
          <linearGradient id="floe-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b8fbe" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#2f5588" stopOpacity="0.6" />
            {/* 아래를 완전히 없앤다. 색이 남으면 파란 띠 한 줄로 보인다. */}
            <stop offset="1" stopColor="#16234a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="floe-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e6f7ff" />
            <stop offset="1" stopColor="#95cfec" />
          </linearGradient>
        </defs>

        {/* 앞면 — 물 밑으로 사라지는 두께 */}
        <path
          d="M0 30 34 22 72 31 110 20 150 30 188 21 226 31 264 22 302 30 340 21 378 30 400 24V80H0z"
          fill="url(#floe-face)"
        />
        {/* 윗면 — 빛을 받는 얇은 면. 잘게 각져야 얼음으로 읽힌다 */}
        <path
          d="M0 30 34 22 72 31 110 20 150 30 188 21 226 31 264 22 302 30 340 21 378 30 400 24v8l-22 6-38-8-38 9-38-7-38 9-38-8-40 9-38-8-38 9-34-7z"
          fill="url(#floe-top)"
        />
        {/* 앞면의 결 — 세로 선을 그으면 막대기가 꽂힌 것처럼 보인다.
            면을 비스듬히 나눠 밝기만 다르게 두는 편이 얼음으로 읽힌다. */}
        <g fill="#0f2145" opacity="0.22">
          <path d="M34 22 72 31 60 80H24z" />
          <path d="M150 30 188 21 196 80h-40z" />
          <path d="M264 22 302 30 296 80h-38z" />
          <path d="M378 30 400 24V80h-30z" />
        </g>
      </svg>

      {/* 내리칠 때 갈라지는 금. 밝은 얼음 위라 흰 선만으로는 안 보인다 —
          파인 자국을 어둡게 깔고 그 위에 빛을 얹는다. */}
      <svg className="icescene-cracks" viewBox="0 0 120 40">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g stroke="#22406b" strokeWidth="3.4" opacity="0.9">
            <path d="M60 10 44 19 30 15" />
            <path d="M60 10 74 20 90 16" />
            <path d="M60 10 57 25 48 32" />
            <path d="M60 10 67 26 78 31" />
          </g>
          <g stroke="#f2fbff" strokeWidth="1.3" opacity="0.85" transform="translate(0,-1.2)">
            <path d="M60 10 44 19 30 15" />
            <path d="M60 10 74 20 90 16" />
            <path d="M60 10 57 25 48 32" />
            <path d="M60 10 67 26 78 31" />
          </g>
        </g>
      </svg>

      <span className="icescene-chip icescene-chip-1" />
      <span className="icescene-chip icescene-chip-2" />
      <span className="icescene-chip icescene-chip-3" />
      <span className="icescene-chip icescene-chip-4" />
      <span className="icescene-chip icescene-chip-5" />

      <div className="icescene-penguin">
        <svg viewBox="0 0 100 108" width="66" height="71" role="presentation">
          <ellipse cx="50" cy="101" rx="25" ry="4.6" fill="#050a1e" opacity="0.45" />

          <g stroke="#1d2029" strokeWidth="3" strokeLinejoin="round">
            <path d="M40 90c-10 2-15 7-13 10 2 3 11 3 17-1z" fill="#f7a02b" />
            <path d="M60 90c10 2 15 7 13 10-2 3-11 3-17-1z" fill="#f7a02b" />
          </g>

          {/* 몸통 — 머리가 크고 배가 작다. 목이 살짝 잘록해야 두 덩이로 읽힌다 */}
          <path
            d="M50 4C31 4 20 17 20 34c0 8 3 15 7 20-4 6-6 13-6 20 0 16 13 19 29 19s29-3 29-19c0-7-2-14-6-20 4-5 7-12 7-20C80 17 69 4 50 4z"
            fill="#3c414c"
            stroke="#1d2029"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />

          {/* 흰 면 둘 — 얼굴과 배 */}
          <ellipse cx="50" cy="38" rx="20" ry="19" fill="#fdfefe" />
          <ellipse cx="50" cy="76" rx="19" ry="16" fill="#fdfefe" />

          <circle cx="40" cy="34" r="8" fill="#15181f" />
          <circle cx="60" cy="34" r="8" fill="#15181f" />
          <circle cx="43" cy="30.4" r="3" fill="#fff" />
          <circle cx="63" cy="30.4" r="3" fill="#fff" />

          <ellipse cx="30.5" cy="45" rx="4.4" ry="2.8" fill="#ff8ab0" opacity="0.5" />
          <ellipse cx="69.5" cy="45" rx="4.4" ry="2.8" fill="#ff8ab0" opacity="0.5" />

          <path
            d="M50 43c-4.8 0-7.6 2.8-7.6 5.2S46 52.6 50 52.6s7.6-1.8 7.6-4.4S54.8 43 50 43z"
            fill="#f7a02b"
            stroke="#a4600f"
            strokeWidth="1.4"
          />

          {/* 날개 — 내리치는 팔. 어깨를 축으로 돌아간다 */}
          <path
            className="icescene-wing icescene-wing-l"
            d="M24 50C15 44 6 46 5 52c-1 7 7 14 17 17z"
            fill="#3c414c"
            stroke="#1d2029"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path
            className="icescene-wing icescene-wing-r"
            d="M76 50c9-6 18-4 19 2 1 7-7 14-17 17z"
            fill="#3c414c"
            stroke="#1d2029"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
