import './ProfileFields.css'

// MBTI를 네 글자로 받아치게 하지 않는다. 자리마다 두 글자 중 하나를 고르는
// 게 폰에서 훨씬 빠르고, 오타로 존재하지 않는 유형이 들어오는 일도 없다.
// 고른 걸 다시 누르면 풀린다 — 모르는 사람은 비워두면 된다.
const MBTI_AXES = [
  ['E', 'I'],
  ['N', 'S'],
  ['T', 'F'],
  ['J', 'P'],
]

/** 네 자리를 다 골랐을 때만 값이 된다. 세 글자짜리 MBTI는 없다. */
export function mbtiOf(picks) {
  return picks.every(Boolean) ? picks.join('') : ''
}

export function toggleMbti(picks, axis, letter) {
  return picks.map((value, i) => (i === axis ? (value === letter ? null : letter) : value))
}

/**
 * 방을 열든 초대코드로 들어오든, 사람에 대해 묻는 것은 똑같다.
 *
 * 두 화면이 각자 이 폼을 들고 있었더니 한쪽만 고쳐져서 QR로 들어온 사람은
 * MBTI를 손으로 타이핑하고 있었다. 물어보는 게 같으면 화면도 하나여야 한다.
 */
export default function ProfileFields({
  idPrefix,
  nickname,
  onNicknameChange,
  gender,
  onGenderChange,
  mbtiPicks,
  onMbtiPick,
}) {
  const mbti = mbtiOf(mbtiPicks)

  return (
    <section className="profile-card">
      <div className="profile-field">
        <label className="profile-label" htmlFor={`${idPrefix}-nickname`}>
          닉네임
        </label>
        <input
          id={`${idPrefix}-nickname`}
          className="profile-input"
          placeholder="뭐라고 부를까요?"
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          maxLength={12}
        />
      </div>

      <div className="profile-field">
        <span className="profile-label">성별</span>
        <div className="profile-seg" role="group" aria-label="성별">
          {[['M', '남'], ['F', '여']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`profile-seg-btn${gender === value ? ' is-on' : ''}`}
              aria-pressed={gender === value}
              onClick={() => onGenderChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="profile-field">
        <span className="profile-label">
          MBTI <em>선택</em>
        </span>
        <div className="profile-mbti">
          {MBTI_AXES.map(([left, right], axis) => (
            <div key={axis} className="profile-mbti-pair">
              {[left, right].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={`profile-mbti-btn${mbtiPicks[axis] === letter ? ' is-on' : ''}`}
                  aria-pressed={mbtiPicks[axis] === letter}
                  onClick={() => onMbtiPick(axis, letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>
        <p className="profile-hint">
          {mbti
            ? `${mbti} — 리포트 문장에만 씁니다. 유형이나 점수에는 안 들어갑니다`
            : '골라두면 리포트가 그 사람다워집니다. 비워둬도 됩니다'}
        </p>
      </div>
    </section>
  )
}
