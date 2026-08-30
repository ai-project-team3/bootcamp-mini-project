import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import IceScene from '../../components/common/IceScene'
import ProfileFields, { mbtiOf, toggleMbti } from '../../components/common/ProfileFields'
import IceLogo from '../../components/common/IceLogo'
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
  const [mbtiPicks, setMbtiPicks] = useState([null, null, null, null])
  const [codeDraft, setCodeDraft] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const mbti = mbtiOf(mbtiPicks)
  // 닉네임은 필수다. 이게 없으면 첫인상 투표도 유형 맞히기도 "누구를"
  // 고르는지 알 수 없고, 리포트에는 이름 없는 사람이 남는다.
  const named = nicknameDraft.trim().length > 0

  const pickMbti = (axis, letter) => setMbtiPicks((current) => toggleMbti(current, axis, letter))

  const commitProfile = () => {
    const nickname = nicknameDraft.trim()
    setNickname(nickname)
    setGender(genderDraft)
    setMbti(mbti)
    return { nickname, gender: genderDraft, mbti }
  }

  const handleCreate = () => {
    if (!named) {
      // 버튼을 죽여두면 왜 안 되는지 알 수 없다. 누를 수 있게 두고 이유를
      // 말한 뒤 그 칸으로 데려간다.
      setError('닉네임을 입력해주세요')
      document.getElementById('start-nickname')?.focus()
      return
    }
    setError(null)
    commitProfile()
    setRoomCode(null)
    setIsHost(true)
    navigate('/room/create')
  }

  const handleJoin = async () => {
    if (!named) {
      // 버튼을 죽여두면 왜 안 되는지 알 수 없다. 누를 수 있게 두고 이유를
      // 말한 뒤 그 칸으로 데려간다.
      setError('닉네임을 입력해주세요')
      document.getElementById('start-nickname')?.focus()
      return
    }
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
          {/* 눈빛 — 로고 아래에서 피어오르는 바닥의 반사. 잘리지 않아야
              테두리가 안 생긴다. */}
          <span className="start-snow" aria-hidden />
          <IceScene />
          <h1 className="start-wordmark">
            <IceLogo />
          </h1>
        </header>
        <p className="start-tagline">처음 만난 사람들, 잠시 뒤엔 서로를 놀립니다</p>

        <ProfileFields
          idPrefix="start"
          nickname={nicknameDraft}
          onNicknameChange={setNicknameDraft}
          gender={genderDraft}
          onGenderChange={setGenderDraft}
          mbtiPicks={mbtiPicks}
          onMbtiPick={pickMbti}
        />

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
