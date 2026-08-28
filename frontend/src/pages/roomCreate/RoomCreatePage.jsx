import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { createRoom } from '../../api/rooms'
import { getPlayers } from '../../api/players'
import { DEFAULT_PLAYER_LIMIT, MAX_PLAYERS, MIN_PLAYERS } from '../../data/gameConfig'
import './RoomCreatePage.css'

const PROJECT_TEXT_PLACEHOLDER =
  '예) 교내 해커톤 참가 팀입니다. 48시간 안에 앱 하나를 만들어야 하고,\n다섯 명 중 셋은 오늘 처음 봅니다.'

export default function RoomCreatePage() {
  const navigate = useNavigate()
  const { nickname, gender, mbti, roomCode, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const [projectText, setProjectText] = useState('')
  const [playerLimit, setPlayerLimit] = useState(DEFAULT_PLAYER_LIMIT)
  const [submittedProjectText, setSubmittedProjectText] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (roomCode || submittedProjectText === null) return
    setError(null)
    createRoom(nickname || '플레이어', gender, mbti, submittedProjectText, playerLimit)
      .then(async (room) => {
        setIsHost(true)
        const players = await getPlayers(room.code)
        setPlayerId(players[0]?.id ?? null)
        setRoomCode(room.code)
      })
      .catch((err) => setError(err.message))
  }, [nickname, gender, mbti, roomCode, submittedProjectText, playerLimit, setIsHost, setPlayerId, setRoomCode])

  if (submittedProjectText === null) {
    return (
      <PhoneFrame>
        <TopBar title="방 만들기" />
        <h1 className="rc-title">
          지금 무슨 프로젝트를
          <br />
          하고 있나요?
        </h1>
        <p className="rc-project-hint">두세 문장이면 충분해요. 그 팀에 맞는 문항을 만들어드려요.</p>
        <textarea
          className="rc-project-input"
          rows={5}
          placeholder={PROJECT_TEXT_PLACEHOLDER}
          value={projectText}
          onChange={(e) => setProjectText(e.target.value)}
        />

        <label className="rc-player-limit-label" htmlFor="player-limit">
          인원 수
        </label>
        <div className="rc-player-limit-row">
          <button
            type="button"
            className="rc-player-limit-btn"
            onClick={() => setPlayerLimit((n) => Math.max(MIN_PLAYERS, n - 1))}
            disabled={playerLimit <= MIN_PLAYERS}
          >
            −
          </button>
          <span id="player-limit" className="rc-player-limit-value">
            {playerLimit}명
          </span>
          <button
            type="button"
            className="rc-player-limit-btn"
            onClick={() => setPlayerLimit((n) => Math.min(MAX_PLAYERS, n + 1))}
            disabled={playerLimit >= MAX_PLAYERS}
          >
            +
          </button>
        </div>

        <Button onClick={() => setSubmittedProjectText(projectText.trim())}>방 만들기</Button>
      </PhoneFrame>
    )
  }

  const joinUrl = roomCode ? `${window.location.origin}/join/${roomCode}` : null

  const handleRetry = () => {
    setRoomCode(null)
  }

  const handleNext = () => {
    navigate(`/room/${roomCode}/waiting`)
  }

  return (
    <PhoneFrame>
      <TopBar title="방 만들기" />
      <h1 className="rc-title">
        얼음땡 방을
        <br />
        만들어요
      </h1>

      <Card className="rc-qr-card">
        {joinUrl ? (
          <QRCodeSVG value={joinUrl} size={140} bgColor="transparent" fgColor="var(--ink)" />
        ) : (
          <div className="rc-qr" aria-hidden>
            QR
          </div>
        )}
        <p className="rc-qr-hint">초대코드나 QR로 팀원을 부르세요</p>
      </Card>

      <Card>
        <span className="rc-code-label">초대코드</span>
        <span className="rc-code">{roomCode ?? (error ? '오류' : '생성 중...')}</span>
      </Card>

      {error && <p className="rc-error">{error}</p>}

      {error ? (
        <Button onClick={handleRetry}>다시 시도</Button>
      ) : (
        <Button onClick={handleNext} disabled={!roomCode}>
          대기실로 이동
        </Button>
      )}
    </PhoneFrame>
  )
}
