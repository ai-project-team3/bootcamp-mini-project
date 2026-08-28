import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createDemoRoom, getDemoRoom, joinDemoRoom } from '../../api/demoRooms'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import RoomEntryLayout from '../../components/room/RoomEntryLayout'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { normalizeDemoNickname, normalizeDemoRoomCode } from '../../data/gameDemo/gameDemoModels'

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
      <TopBar title="방 만들기" onBack={() => navigate('/')} />
      <RoomEntryLayout
        idPrefix="demo"
        eyebrow="ROOM"
        title={<>닉네임만 정하고<br />같이 모여요</>}
        lead="2명부터 10명까지 초대코드로 모인 다음, 방장이 게임을 골라요."
        nickname={nicknameDraft}
        onNicknameChange={setNicknameDraft}
        roomCode={codeDraft}
        onRoomCodeChange={setCodeDraft}
        codeLocked={Boolean(invitedCode)}
        onCreate={handleCreate}
        onJoin={handleJoin}
        busy={busy}
        error={error}
      />
    </PhoneFrame>
  )
}
