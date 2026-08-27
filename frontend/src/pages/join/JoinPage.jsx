import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { findCategoryByCode } from '../../data/categories'
import { getRoom, joinRoom } from '../../api/rooms'
import './JoinPage.css'

export default function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { setNickname, setCategory, setRoomCode, setIsHost } = useRoomFlow()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    const name = draft || '참가자'
    setError(null)
    setLoading(true)
    try {
      const room = await getRoom(code)
      await joinRoom(code, name)
      setNickname(name)
      setCategory(findCategoryByCode(room.category))
      setIsHost(false)
      setRoomCode(room.code)
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
        <label className="join-label" htmlFor="join-nickname">
          닉네임
        </label>
        <input
          id="join-nickname"
          className="join-input"
          placeholder="닉네임을 입력하세요"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={12}
        />
        {error && <p className="join-error">{error}</p>}
      </div>
      <Button onClick={handleJoin} disabled={loading}>
        {loading ? '참가하는 중...' : '참가하기'}
      </Button>
    </PhoneFrame>
  )
}
