import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { findCategoryByCode } from '../../data/categories'
import { getRoom, joinRoom } from '../../api/rooms'
import './EntryPage.css'

export default function EntryPage() {
  const navigate = useNavigate()
  const { nickname, category, setCategory, setRoomCode, setIsHost } = useRoomFlow()
  const [codeDraft, setCodeDraft] = useState('')
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)

  const handleCreate = () => {
    navigate('/room/create')
  }

  const handleJoin = async () => {
    const code = codeDraft.trim().toUpperCase()
    if (!code) {
      setError('초대코드를 입력해주세요')
      return
    }
    setError(null)
    setJoining(true)
    try {
      const room = await getRoom(code)
      await joinRoom(code, nickname)
      setCategory(findCategoryByCode(room.category))
      setIsHost(false)
      setRoomCode(room.code)
      navigate(`/room/${room.code}/waiting`)
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title="2단계 · 어떻게 시작할까요" />
      <div className="entry-body">
        <h1 className="entry-title">
          {nickname}님, {category.label} 방을
          <br />
          만들거나 참가하세요
        </h1>

        <label className="entry-label" htmlFor="join-code">
          초대코드로 참가
        </label>
        <div className="entry-join-row">
          <input
            id="join-code"
            className="entry-input"
            placeholder="예: AB12CD"
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value)}
            maxLength={6}
          />
          <Button variant="secondary" onClick={handleJoin} disabled={joining}>
            {joining ? '참가 중...' : '참가하기'}
          </Button>
        </div>
        {error && <p className="entry-error">{error}</p>}
      </div>
      <Button onClick={handleCreate}>방 만들기</Button>
    </PhoneFrame>
  )
}
