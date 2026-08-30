import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom } from '../../api/rooms'
import { joinRoom } from '../../api/players'
import './StartPage.css'

// MBTI를 네 글자로 받아치게 하지 않는다. 자리마다 두 글자 중 하나를 고르는
// 게 폰에서 훨씬 빠르고, 오타로 존재하지 않는 유형이 들어오는 일도 없다.
// 고른 걸 다시 누르면 풀린다 — 모르는 사람은 비워두면 된다.
const MBTI_AXES = [
  ['E', 'I'],
  ['N', 'S'],
  ['T', 'F'],
  ['J', 'P'],
]

const FLAKES = [
  { left: '12%', delay: '0s', dur: '13s', size: '0.8rem' },
  { left: '28%', delay: '3.4s', dur: '16s', size: '0.55rem' },
  { left: '46%', delay: '1.6s', dur: '11s', size: '0.7rem' },
  { left: '64%', delay: '5.2s', dur: '15s', size: '0.5rem' },
  { left: '81%', delay: '2.4s', dur: '12s', size: '0.75rem' },
  { left: '93%', delay: '6.8s', dur: '17s', size: '0.5rem' },
]

export default function StartPage() {
  const navigate = useNavigate()
  const isEntry = useLocation().pathname === '/'
  const { setNickname, setGender, setMbti, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [genderDraft, setGenderDraft] = useState('M')
  const [mbtiPicks, setMbtiPicks] = useState([null, null, null, null])
  const [codeDraft, setCodeDraft] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // 네 자리를 다 골랐을 때만 값이 된다. 세 글자짜리 MBTI는 없다.
  const mbti = mbtiPicks.every(Boolean) ? mbtiPicks.join('') : ''

  const pickMbti = (axis, letter) =>
    setMbtiPicks((current) =>
      current.map((value, i) => (i === axis ? (value === letter ? null : letter) : value)),
    )

  const commitProfile = () => {
    const nickname = nicknameDraft.trim() || '플레이어'
    setNickname(nickname)
    setGender(genderDraft)
    setMbti(mbti)
    return { nickname, gender: genderDraft, mbti }
  }

  const handleCreate = () => {
    commitProfile()
    setRoomCode(null)
    setIsHost(true)
    navigate('/room/create')
  }

  const handleJoin = async () => {
    const code = codeDraft.trim().toUpperCase()
    if (!code) {
      setError('초대코드를 입력해주세요')
      return
    }
    const { nickname, gender, mbti: picked } = commitProfile()
    setError(null)
    setBusy(true)
    try {
      const room = await getRoom(code)
      const player = await joinRoom(room.code, nickname, gender, picked)
      setIsHost(false)
      setRoomCode(room.code)
      setPlayerId(player.id)
      navigate(`/room/${room.code}/waiting`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PhoneFrame>
      {/* 앱의 첫 화면일 때는 돌아갈 곳이 없다. */}
      <TopBar showBack={!isEntry} onBack={() => navigate('/')} />
      <div className="start-body">
        <header className="start-hero">
          <span className="start-hero-glow" aria-hidden />
          {FLAKES.map((flake, i) => (
            <span
              key={i}
              className="start-flake"
              aria-hidden
              style={{
                left: flake.left,
                fontSize: flake.size,
                animationDelay: flake.delay,
                animationDuration: flake.dur,
              }}
            >
              ❄
            </span>
          ))}
          <h1 className="start-title">얼음땡</h1>
          <p className="start-tagline">처음 만난 사람들, 18분 뒤엔 서로를 놀립니다</p>
          <ul className="start-meta">
            <li>18분</li>
            <li>2~8명</li>
            <li>각자 폰으로</li>
          </ul>
        </header>

        <section className="start-card">
          <div className="start-field">
            <label className="start-label" htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              className="start-input"
              placeholder="뭐라고 부를까요?"
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              maxLength={12}
            />
          </div>

          <div className="start-field">
            <span className="start-label">성별</span>
            <div className="start-seg" role="group" aria-label="성별">
              {[['M', '남'], ['F', '여']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`start-seg-btn${genderDraft === value ? ' is-on' : ''}`}
                  aria-pressed={genderDraft === value}
                  onClick={() => setGenderDraft(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="start-field">
            <span className="start-label">
              MBTI <em>선택</em>
            </span>
            <div className="start-mbti">
              {MBTI_AXES.map(([left, right], axis) => (
                <div key={axis} className="start-mbti-pair">
                  {[left, right].map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      className={`start-mbti-btn${mbtiPicks[axis] === letter ? ' is-on' : ''}`}
                      aria-pressed={mbtiPicks[axis] === letter}
                      onClick={() => pickMbti(axis, letter)}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p className="start-hint">
              {mbti
                ? `${mbti} — 리포트 문장에만 씁니다. 유형이나 점수에는 안 들어갑니다`
                : '골라두면 리포트가 그 사람다워집니다. 비워둬도 됩니다'}
            </p>
          </div>
        </section>

        {error && <p className="start-error">{error}</p>}

        <Button className="start-cta" onClick={handleCreate} disabled={busy}>
          {busy ? '만드는 중...' : '방 만들기'}
        </Button>

        {/* 방을 새로 여는 것과 초대코드로 들어가는 것은 서로 다른 갈래다.
            줄만 나란히 두면 위 칸을 채워야 아래 버튼이 눌리는 것처럼 읽힌다. */}
        <div className="start-or"><span>또는</span></div>

        <div className="start-join">
          <label className="start-label" htmlFor="join-code">받은 초대코드로 들어가기</label>
          <div className="start-join-row">
            <input
              id="join-code"
              className="start-input start-code"
              placeholder="AB12CD"
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
              maxLength={6}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <Button variant="secondary" onClick={handleJoin} disabled={busy}>
              참가
            </Button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}
