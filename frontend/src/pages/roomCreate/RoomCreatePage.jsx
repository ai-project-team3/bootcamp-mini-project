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
import { getLanHost } from '../../api/health'
import { inviteUrl, isLoopback } from './inviteAddress'
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
  // 주소창이 이미 밖에서 닿는 주소면 물어볼 일이 없다. localhost일 때만 묻는다.
  const needsLanHost = isLoopback(window.location.hostname)
  // undefined = 아직 묻는 중, null = 물을 필요가 없거나 서버도 모름, 문자열 = 찾은 주소
  const [lanHost, setLanHost] = useState(() => (needsLanHost ? undefined : null))

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

  // 주소창이 localhost면 그 주소를 QR에 담을 수 없다 — 찍는 폰에서 localhost는
  // 폰 자신이다. 서버에게 같은 Wi-Fi에서 부를 수 있는 주소를 물어둔다.
  useEffect(() => {
    if (!needsLanHost) return
    let alive = true
    getLanHost()
      .then((host) => alive && setLanHost(host))
      .catch(() => alive && setLanHost(null))
    return () => {
      alive = false
    }
  }, [needsLanHost])

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

  // 랜 주소를 묻는 중(undefined)에는 QR을 그리지 않는다. 그리면 한순간
  // localhost가 담긴 QR이 떴다가 바뀌고, 그 사이에 찍은 사람은 못 들어온다.
  const joinUrl = roomCode && lanHost !== undefined ? inviteUrl(window.location, lanHost, roomCode) : null
  // 랜 주소를 못 찾았는데 주소창은 localhost다. QR을 줘도 아무도 못 들어온다.
  const unreachable = needsLanHost && lanHost === null

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
        {unreachable ? (
          <p className="rc-qr-warn">
            지금 <b>localhost</b>로 열려 있어 이 QR로는 다른 폰이 들어오지 못합니다. 서버를
            켠 터미널에 뜬 <b>Network</b> 주소로 다시 접속한 뒤 방을 만들어 주세요.
          </p>
        ) : (
          <p className="rc-qr-hint">초대코드나 QR로 팀원을 부르세요</p>
        )}
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
