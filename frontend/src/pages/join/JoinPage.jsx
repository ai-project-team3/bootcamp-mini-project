import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import ProfileFields, { mbtiOf, toggleMbti } from '../../components/common/ProfileFields'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getRoom } from '../../api/rooms'
import { joinRoom } from '../../api/players'
import './JoinPage.css'

// QR을 찍고 들어오는 자리. 묻는 것은 첫 화면과 똑같으므로 같은 폼을 쓴다 —
// 각자 들고 있었더니 한쪽만 고쳐져서, 여기로 들어온 사람만 MBTI를 손으로
// 타이핑하고 있었다.
export default function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { setNickname, setGender, setMbti, setRoomCode, setPlayerId, setIsHost } = useRoomFlow()
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [genderDraft, setGenderDraft] = useState('M')
  const [mbtiPicks, setMbtiPicks] = useState([null, null, null, null])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // 닉네임은 필수다. 없으면 첫인상 투표도 유형 맞히기도 "누구를" 고르는지
  // 알 수 없고, 리포트에는 이름 없는 사람이 남는다.
  const named = nicknameDraft.trim().length > 0

  const handleJoin = async () => {
    if (!named) {
      // 버튼을 죽여두면 왜 안 되는지 알 수 없다. 누를 수 있게 두고 이유를
      // 말한 뒤 그 칸으로 데려간다.
      setError('닉네임을 입력해주세요')
      document.getElementById('join-nickname')?.focus()
      return
    }
    const nickname = nicknameDraft.trim()
    const mbti = mbtiOf(mbtiPicks)
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

        <ProfileFields
          idPrefix="join"
          nickname={nicknameDraft}
          onNicknameChange={setNicknameDraft}
          gender={genderDraft}
          onGenderChange={setGenderDraft}
          mbtiPicks={mbtiPicks}
          onMbtiPick={(axis, letter) => setMbtiPicks((c) => toggleMbti(c, axis, letter))}
        />

        {error && <p className="join-error">{error}</p>}
      </div>
      <Button onClick={handleJoin} disabled={loading}>
        {loading ? '참가하는 중...' : '참가하기'}
      </Button>
    </PhoneFrame>
  )
}
