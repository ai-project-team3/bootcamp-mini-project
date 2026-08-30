import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createDemoRoom, getDemoRoom, joinDemoRoom } from '../../api/demoRooms'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import RoomEntryLayout from '../../components/room/RoomEntryLayout'
import { useGameRoom } from '../../context/GameRoomContext'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { normalizeDemoNickname, normalizeDemoRoomCode } from '../../data/gameDemo/gameDemoModels'

export default function GameDemoEntryPage() {
  const navigate = useNavigate()
  const { code: invitedCode = '' } = useParams()
  // 얼음땡 리포트에서 넘어왔다면 그 방 코드가 붙어 온다. 게임들이 그 세션에서
  // 나온 성향을 닉네임으로 찾아 쓴다.
  const [searchParams] = useSearchParams()
  const sourceRoomCode = searchParams.get('from') ?? null
  const { setIsHost, setNickname, setPlayerId, setRoomCode } = useGameRoom()
  // 얼음땡을 방금 하고 넘어온 사람이면 그때 쓴 닉네임을 그대로 채워둔다.
  // 성향을 잇는 끈이 이름 하나뿐인데 손으로 다시 치게 하면 거기서 끊긴다.
  const { nickname: icebreakingNickname } = useRoomFlow()
  const [nicknameDraft, setNicknameDraft] = useState(
    sourceRoomCode ? (icebreakingNickname ?? '') : '',
  )
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
      const created = await createDemoRoom(nickname, sourceRoomCode)
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
      <TopBar
        title="방 만들기"
        onBack={() => navigate(sourceRoomCode ? `/games?from=${sourceRoomCode}` : '/games')}
      />
      <RoomEntryLayout
        idPrefix="demo"
        eyebrow="ROOM"
        title={<>닉네임만 정하고<br />같이 모여요</>}
        lead={sourceRoomCode
          ? '얼음땡에서 쓰던 닉네임을 그대로 채워뒀어요. 이대로 두면 그때 나온 성향이 따라옵니다.'
          : '2명부터 10명까지 초대코드로 모인 다음, 방장이 게임을 골라요.'}
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
