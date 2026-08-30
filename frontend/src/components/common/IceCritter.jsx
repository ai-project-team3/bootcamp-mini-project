import './IceCritter.css'

/**
 * 로고 뒤 눈밭을 돌아다니는 펭귄.
 *
 * 로고는 가만히 있고 이 친구가 화면을 살린다 — 걸어 들어와서 얼음을 몇 번
 * 두들기다가, 미끄러져 굴러서 화면 밖으로 나가고, 잠시 뒤 반대쪽에서 돌아온다.
 * 한 바퀴가 22초라 눈에 걸리적거리지 않으면서 화면이 죽어 있지도 않다.
 *
 * 다리는 **멈췄을 때만** 보인다. 달릴 때는 다리 대신 바퀴처럼 뭉개진 잔상이
 * 돈다 — 만화가 빠른 발을 그리는 방식이고, 작은 크기에서 다리 두 개를
 * 왔다갔다 시키는 것보다 훨씬 잘 읽힌다.
 *
 * 겹은 셋으로 나눈다. 각각 하는 일이 달라서 한 요소에 모으면 나중에 선언된
 * transform이 앞의 것을 통째로 덮어쓴다.
 *   .icecritter       가로 이동과 구르기, 그리고 보고 있는 방향
 *   .icecritter-hit   얼음을 때리는 순간의 도약
 *   .icecritter-bob   서 있을 때의 뒤뚱거림
 */
export default function IceCritter() {
  return (
    <div className="icecritter" aria-hidden>
      {/* 때릴 때 튀는 얼음 부스러기. 펭귄과 같이 움직여야 머리 위에 붙어 있는다. */}
      <span className="icecritter-chip icecritter-chip-1" />
      <span className="icecritter-chip icecritter-chip-2" />
      <span className="icecritter-chip icecritter-chip-3" />

      <div className="icecritter-hit">
        <div className="icecritter-bob">
          <svg viewBox="0 0 76 84" width="54" height="60" role="presentation">
            <ellipse cx="38" cy="79" rx="19" ry="3.6" fill="#050a1e" opacity="0.45" />

            {/* 달릴 때 — 다리 대신 도는 잔상. 닫힌 고리로 그리면 훌라후프가
                되므로 아래 반쪽만 그리고, 뒤로 흘리는 속도선을 얹는다. */}
            <g className="icecritter-wheel">
              <path
                d="M21 66a17 9 0 0 0 34 0"
                fill="none"
                stroke="#f7a02b"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                className="icecritter-wheel-spin"
                d="M21 66a17 9 0 0 0 34 0"
                fill="none"
                stroke="#f6f9fd"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray="9 16"
                opacity="0.7"
              />
              <g stroke="#dfe8f5" strokeLinecap="round" fill="none" opacity="0.4">
                <path d="M14 62h-9" strokeWidth="2.4" />
                <path d="M12 69h-11" strokeWidth="2" />
              </g>
            </g>

            {/* 멈췄을 때 — 다리 */}
            <g className="icecritter-legs" stroke="#23262e" strokeWidth="2.4" strokeLinejoin="round">
              <path d="M30 64c-7 2-11 6-9.5 8.6C22 75 28 74.6 32 72z" fill="#f7a02b" />
              <path d="M46 64c7 2 11 6 9.5 8.6C54 75 48 74.6 44 72z" fill="#f7a02b" />
            </g>

            {/* 날개 — 참고 그림처럼 위로 벌린다 */}
            <path
              d="M18 34C11 27 4 27 2.6 32.4 1.2 38 6 45 15 49z"
              fill="#454b58"
              stroke="#23262e"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <path
              d="M58 34c7-7 14-7 15.4-1.6C74.8 38 70 45 61 49z"
              fill="#454b58"
              stroke="#23262e"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />

            {/* 몸통 */}
            <path
              d="M38 5C23.5 5 15 18 15 39c0 19 9 30 23 30s23-11 23-30C61 18 52.5 5 38 5z"
              fill="#454b58"
              stroke="#23262e"
              strokeWidth="2.8"
            />

            {/* 얼굴과 배가 이어진 흰 면 — 큰 흰 덩이가 귀여움의 절반이다 */}
            <path d="M38 15c-11.5 0-18 9.5-18 23s7 23 18 23 18-9.5 18-23-6.5-23-18-23z" fill="#fdfefe" />

            {/* 눈 — 크게, 그리고 흰 점을 꼭 넣는다 */}
            <circle cx="29.5" cy="31" r="6.4" fill="#191c22" />
            <circle cx="46.5" cy="31" r="6.4" fill="#191c22" />
            <circle cx="31.8" cy="28.4" r="2.3" fill="#fff" />
            <circle cx="48.8" cy="28.4" r="2.3" fill="#fff" />

            {/* 부리 */}
            <path
              d="M38 36.5c-4.2 0-6.6 1.8-6.6 3.4s2.8 3.2 6.6 3.2 6.6-1.6 6.6-3.2-2.4-3.4-6.6-3.4z"
              fill="#f7a02b"
              stroke="#a4600f"
              strokeWidth="1.1"
            />

            {/* 배에 걸린 옅은 웃음선 */}
            <path
              d="M30 51.5c4.5 3.4 11.5 3.4 16-.6"
              fill="none"
              stroke="#e3e8f0"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
