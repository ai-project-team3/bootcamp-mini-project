import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom } from '../../api/rooms'
import { joinRoom } from '../../api/players'
import './JoinPage.css'

export default function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { setNickname, setGender, setMbti, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [genderDraft, setGenderDraft] = useState('M')
  const [mbtiDraft, setMbtiDraft] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    const nickname = nicknameDraft.trim() || '참가자'
    const mbti = mbtiDraft.trim().toUpperCase()
    setError(null)
    setLoading(true)
    try {
      const room = await getRoom(code)
      const player = await joinRoom(room.code, nickname, genderDraft, mbti)
      setNickname(nickname)
      setGender(genderDraft)
      setMbti(mbti)
      setIsHost(false)
      setRoomCode(room.code)
      setPlayerId(player.id)
      navigate(`/room/${room.code}/waiting`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar showBack={false} title="방 참가하기" />
      <div className="join-body">
        <h1 className="join-title">
          초대코드 {code}
          <br />
          방에 참가해요
        </h1>
        <label className="join-label" htmlFor="join-nickname">닉네임</label>
        <input
          id="join-nickname"
          className="join-input"
          placeholder="닉네임을 입력하세요"
          value={nicknameDraft}
          onChange={(e) => setNicknameDraft(e.target.value)}
          maxLength={12}
        />

        <label className="join-label">성별</label>
        <div className="join-gender-row">
          <button
            type="button"
            className={`join-gender-btn ${genderDraft === 'M' ? 'join-gender-btn-active' : ''}`}
            onClick={() => setGenderDraft('M')}
          >
            남
          </button>
          <button
            type="button"
            className={`join-gender-btn ${genderDraft === 'F' ? 'join-gender-btn-active' : ''}`}
            onClick={() => setGenderDraft('F')}
          >
            여
          </button>
        </div>

        <label className="join-label" htmlFor="join-mbti">MBTI (선택)</label>
        <input
          id="join-mbti"
          className="join-input"
          placeholder="예: INTJ"
          value={mbtiDraft}
          onChange={(e) => setMbtiDraft(e.target.value.toUpperCase())}
          maxLength={4}
        />

        {error && <p className="join-error">{error}</p>}
      </div>
      <Button onClick={handleJoin} disabled={loading}>
        {loading ? '참가하는 중...' : '참가하기'}
      </Button>
    </PhoneFrame>
  )
}
