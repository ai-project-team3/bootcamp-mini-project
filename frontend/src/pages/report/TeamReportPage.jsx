import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/common/Card'
import { getReport } from '../../api/report'
import { shareCurrentPage } from '../../utils/share'
import './TeamReportPage.css'

export default function TeamReportPage() {
  const { code } = useParams()
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [shareNote, setShareNote] = useState(null)

  useEffect(() => {
    getReport(code).then(setReport).catch((err) => setError(err.message))
  }, [code])

  if (error) {
    return (
      <PhoneFrame>
        <TopBar title="팀 리포트" />
        <p className="report-error">{error}</p>
      </PhoneFrame>
    )
  }

  if (!report) {
    return (
      <PhoneFrame>
        <TopBar title="팀 리포트" />
        <p className="report-hint">불러오는 중...</p>
      </PhoneFrame>
    )
  }

  const { team } = report

  const handleShare = async () => {
    const result = await shareCurrentPage('얼음땡 · 우리 팀 리포트', `우리 팀 등급은 ${team.rank}! 얼음땡 팀 리포트를 확인해보세요.`)
    if (result === 'copied') setShareNote('링크를 복사했어요')
    if (result === 'failed') setShareNote('공유에 실패했어요')
    if (result !== 'cancelled') setTimeout(() => setShareNote(null), 2000)
  }

  return (
    <PhoneFrame>
      <TopBar
        title="팀 리포트"
        right={
          <button type="button" className="report-share-btn" onClick={handleShare}>
            {shareNote ?? '공유'}
          </button>
        }
      />
      <div className="team-body">
        <div className="team-rank">{team.rank}</div>
        <p className="team-summary">{team.summary}</p>

        <p className="report-section-title">이 등급이 나온 이유</p>
        <Card>
          {team.reasons.map((r, i) => (
            <p key={i} className="team-reason-line">{r}</p>
          ))}
        </Card>

        <p className="report-section-title">추천 역할</p>
        <div className="team-roles">
          {team.roles.map((role) => (
            <Card key={role.role} className="team-role-card">
              <span className="team-role-name">{role.role}</span>
              <span className="team-role-nickname">{role.nickname}</span>
              <span className="team-role-why">{role.why}</span>
            </Card>
          ))}
        </div>

        <p className="report-section-title">오늘의 장면</p>
        <Card>
          {team.highlights.map((h, i) => (
            <p key={i} className="team-highlight-line">{h}</p>
          ))}
        </Card>
      </div>
    </PhoneFrame>
  )
}
