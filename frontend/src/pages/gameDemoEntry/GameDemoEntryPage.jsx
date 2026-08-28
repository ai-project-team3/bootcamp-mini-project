import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createDemoRoom, getDemoRoom, joinDemoRoom } from '../../api/demoRooms'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import GameDemoRoomHero from '../../components/common/GameDemoRoomHero'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { normalizeDemoNickname, normalizeDemoRoomCode } from '../../data/gameDemo/gameDemoModels'
import './GameDemoEntryPage.css'

export default function GameDemoEntryPage() {
  const navigate = useNavigate()
  const { code: invitedCode = '' } = useParams()
  const { setIsHost, setNickname, setPlayerId, setRoomCode } = useRoomFlow()
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState(invitedCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const nickname = normalizeDemoNickname(nicknameDraft)

  const enterRoom = (roomCode, player, isHost) => {
    setNickname(player.nickname)
    setRoomCode(roomCode)
    setPlayerId(player.id)
    setIsHost(isHost)
    navigate(`/games/demo/room/${roomCode}`)
  }

  const handleCreate = async () => {
    if (!nickname) {
      setError('닉네임을 입력해주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await createDemoRoom(nickname)
      enterRoom(created.room.code, created.player, true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    const code = normalizeDemoRoomCode(codeDraft)
    if (!nickname || !code) {
      setError('닉네임과 초대코드를 모두 입력해주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const room = await getDemoRoom(code)
      const player = await joinDemoRoom(room.code, nickname)
      enterRoom(room.code, player, false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar title="게임 데모" onBack={() => navigate('/games')} />
      <GameDemoRoomHero eyebrow="MINWOO GAME LAB" title={<>닉네임만 정하고<br />같이 시작해요</>}>
        2명부터 10명까지 초대코드로 모일 수 있어요.
      </GameDemoRoomHero>

      <Card className="game-room-entry-card">
        <label htmlFor="demo-nickname">닉네임</label>
        <input
          id="demo-nickname"
          value={nicknameDraft}
          onChange={(event) => setNicknameDraft(event.target.value)}
          placeholder="닉네임을 입력하세요"
          maxLength={12}
          autoComplete="nickname"
        />

        <Button onClick={handleCreate} disabled={busy}>새 방 만들기</Button>

        <div className="game-room-divider"><span>또는 초대코드로 참가</span></div>

        <label htmlFor="demo-room-code">초대코드</label>
        <input
          id="demo-room-code"
          value={codeDraft}
          onChange={(event) => setCodeDraft(event.target.value.toUpperCase())}
          placeholder="예: AB12CD"
          maxLength={6}
          disabled={Boolean(invitedCode)}
        />
        <Button variant="secondary" onClick={handleJoin} disabled={busy}>방 참가하기</Button>
        {error && <p className="game-room-error" role="alert">{error}</p>}
      </Card>
    </PhoneFrame>
  )
}
