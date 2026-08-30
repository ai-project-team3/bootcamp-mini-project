import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom } from '../../api/rooms'
import { joinRoom } from '../../api/players'
import './StartPage.css'

export default function StartPage() {
  const navigate = useNavigate()
  const isEntry = useLocation().pathname === '/'
  const { setNickname, setGender, setMbti, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [genderDraft, setGenderDraft] = useState('M')
  const [mbtiDraft, setMbtiDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const commitProfile = () => {
    const nickname = nicknameDraft.trim() || '플레이어'
    setNickname(nickname)
    setGender(genderDraft)
    setMbti(mbtiDraft.trim().toUpperCase())
    return { nickname, gender: genderDraft, mbti: mbtiDraft.trim().toUpperCase() }
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
    const { nickname, gender, mbti } = commitProfile()
    setError(null)
    setBusy(true)
    try {
      const room = await getRoom(code)
      const player = await joinRoom(room.code, nickname, gender, mbti)
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
        <div className="start-hero">
          <span className="start-hero-glow" aria-hidden />
          <span className="start-hero-flake start-hero-flake-1" aria-hidden>❄</span>
          <span className="start-hero-flake start-hero-flake-2" aria-hidden>❄</span>
          <span className="start-hero-flake start-hero-flake-3" aria-hidden>❄</span>
          <h1 className="start-title">얼음땡</h1>
        </div>

        <label className="start-label" htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          className="start-input"
          placeholder="닉네임을 입력하세요"
          value={nicknameDraft}
          onChange={(e) => setNicknameDraft(e.target.value)}
          maxLength={12}
        />

        <label className="start-label">성별</label>
        <div className="start-gender-row">
          <button
            type="button"
            className={`start-gender-btn ${genderDraft === 'M' ? 'start-gender-btn-active' : ''}`}
            onClick={() => setGenderDraft('M')}
          >
            남
          </button>
          <button
            type="button"
            className={`start-gender-btn ${genderDraft === 'F' ? 'start-gender-btn-active' : ''}`}
            onClick={() => setGenderDraft('F')}
          >
            여
          </button>
        </div>

        <label className="start-label" htmlFor="mbti">MBTI (선택)</label>
        <input
          id="mbti"
          className="start-input"
          placeholder="예: INTJ"
          value={mbtiDraft}
          onChange={(e) => setMbtiDraft(e.target.value.toUpperCase())}
          maxLength={4}
        />

        {/* 초대코드로 들어가는 것과 방을 새로 여는 것은 서로 다른 갈래다.
            줄만 나란히 두면 위 칸을 채워야 아래 버튼이 눌리는 것처럼 읽힌다. */}
        <div className="start-join">
          <label className="start-label" htmlFor="join-code">받은 초대코드가 있다면</label>
          <div className="start-join-row">
            <input
              id="join-code"
              className="start-input"
              placeholder="예: AB12CD"
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              maxLength={6}
            />
            <Button variant="secondary" onClick={handleJoin} disabled={busy}>
              참가
            </Button>
          </div>
        </div>

        {error && <p className="start-error">{error}</p>}
      </div>
      <div className="start-or"><span>또는</span></div>
      <Button onClick={handleCreate} disabled={busy}>
        {busy ? '만드는 중...' : '방 만들기'}
      </Button>
    </PhoneFrame>
  )
}
