import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { saveProfile } from '../../api/session'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './StartPage.css'

const GENDERS = [
  { key: 'FEMALE', label: '여성' },
  { key: 'MALE', label: '남성' },
  { key: 'UNSET', label: '선택 안 함' },
]

export default function StartPage() {
  const navigate = useNavigate()
  const { user, userId, userError, setUser } = useRoomFlow()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // null means "not edited yet", so the saved profile shows through as soon as
  // it loads without an effect having to copy it into state.
  const [draftNick, setDraftNick] = useState(null)
  const [draftGender, setDraftGender] = useState(null)
  const draft = draftNick ?? user?.nickname ?? ''
  const gender = draftGender ?? user?.gender ?? 'UNSET'

  const handleNext = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const saved = await saveProfile(userId, { nickname: draft.trim() || '플레이어', gender })
      setUser(saved)
      navigate('/category')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PhoneFrame>
      <TopBar showBack={false} title="얼음땡" />
      <div className="start-body">
        <h1 className="start-title">
          같이 놀고,
          <br />
          내 캐릭터로 남는다
        </h1>
        <div className="start-avatar" aria-hidden>
          🧊
        </div>

        <label className="start-label" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          className="start-input"
          placeholder="닉네임을 입력하세요"
          value={draft}
          onChange={(e) => setDraftNick(e.target.value)}
          maxLength={12}
        />

        <span className="start-label">성별</span>
        <div className="start-seg" role="radiogroup" aria-label="성별">
          {GENDERS.map((g) => (
            <button
              key={g.key}
              type="button"
              role="radio"
              aria-checked={gender === g.key}
              className={`start-seg-btn${gender === g.key ? ' is-on' : ''}`}
              onClick={() => setDraftGender(g.key)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {(error || userError) && <p className="start-error">{error ?? userError}</p>}
        <p className="start-hint">로그인 없이 바로 시작합니다</p>
      </div>

      <Button onClick={handleNext} disabled={!userId || saving}>
        {userId ? (saving ? '저장 중…' : '다음') : '준비 중…'}
      </Button>
      <button type="button" className="start-join" onClick={() => navigate('/join')}>
        초대코드로 참여하기
      </button>
    </PhoneFrame>
  )
}
