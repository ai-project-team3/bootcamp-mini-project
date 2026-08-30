import './IceCritter.css'

/**
 * 로고 뒤 눈밭을 돌아다니는 펭귄.
 *
 * 로고는 가만히 있고 이 친구가 화면을 살린다 — 걸어 들어와서 얼음을 몇 번
 * 두들기다가, 미끄러져 굴러서 화면 밖으로 나가고, 잠시 뒤 반대쪽에서 돌아온다.
 * 한 바퀴가 22초라 눈에 걸리적거리지 않으면서 화면이 죽어 있지도 않다.
 *
 * 겹은 셋으로 나눈다. 각각 하는 일이 달라서 한 요소에 모으면 서로 덮어쓴다.
 *   .icecritter       가로 이동과 구르기, 그리고 보고 있는 방향
 *   .icecritter-hit   얼음을 때리는 순간의 도약
 *   .icecritter-bob   걸을 때의 뒤뚱거림
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
          <svg viewBox="0 0 64 74" width="46" height="53" role="presentation">
            <ellipse cx="24" cy="68" rx="9" ry="4.4" fill="#f5a524" />
            <ellipse cx="41" cy="68" rx="9" ry="4.4" fill="#f5a524" />
            <path
              d="M32 4C19 4 11 16 11 34c0 20 9 32 21 32s21-12 21-32C53 16 45 4 32 4z"
              fill="#22335a"
            />
            <path d="M11.5 30c-4.5 6-4.5 19 0 25 3.2-6.4 3.2-18.6 0-25z" fill="#18274a" />
            <path d="M52.5 30c4.5 6 4.5 19 0 25-3.2-6.4-3.2-18.6 0-25z" fill="#18274a" />
            <ellipse cx="32" cy="42" rx="14" ry="21" fill="#fdfeff" />
            <circle cx="26" cy="27" r="5" fill="#fff" />
            <circle cx="38" cy="27" r="5" fill="#fff" />
            <circle cx="27" cy="27.8" r="2.5" fill="#101a30" />
            <circle cx="39" cy="27.8" r="2.5" fill="#101a30" />
            <ellipse cx="19.5" cy="35" rx="3.2" ry="2.1" fill="#ff8ab0" opacity="0.5" />
            <ellipse cx="44.5" cy="35" rx="3.2" ry="2.1" fill="#ff8ab0" opacity="0.5" />
            <path d="M32 32.5l5.2 4.2-5.2 3.6-5.2-3.6z" fill="#f5a524" />
          </svg>
        </div>
      </div>
    </div>
  )
}
