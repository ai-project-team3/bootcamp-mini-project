import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import { useRoomFlow } from '../../context/RoomFlowContext'
import { getReport } from '../../api/report'
import { ABILITY_LABELS, ABILITY_ORDER, TYPES } from '../../data/types'
import AxisRadar from './AxisRadar'
import './PersonalReportPage.css'

export default function PersonalReportPage() {
  const { code } = useParams()
  const { playerId } = useRoomFlow()
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getReport(code).then(setReport).catch((err) => setError(err.message))
  }, [code])

  if (error) {
    return (
      <PhoneFrame>
        <TopBar title="개인 리포트" />
        <p className="report-error">{error}</p>
      </PhoneFrame>
    )
  }

  if (!report) {
    return (
      <PhoneFrame>
        <TopBar title="개인 리포트" />
        <p className="report-hint">불러오는 중...</p>
      </PhoneFrame>
    )
  }

  const me = report.players.find((p) => p.player_id === playerId) ?? report.players[0]
  const type = TYPES[me.type_code]
  const selfGuessType = me.self_guess ? TYPES[me.self_guess] : null

  const axes = ABILITY_ORDER.map((code_) => ({
    code: code_,
    label: ABILITY_LABELS[code_],
    self: me.abilities[code_],
    pre: me.impression_pre[code_],
    post: me.impression_post[code_],
  }))

  return (
    <PhoneFrame>
      <TopBar title="개인 리포트" />
      <div className="report-body">
        <div className="report-header" style={{ color: type.color }}>
          <span className="report-header-symbol">{type.symbol}</span>
          <h1 className="report-header-name">{type.name}</h1>
          <p className="report-header-subtitle">{me.type_subtitle || type.subtitle}</p>
          <p className="report-header-meta">
            {me.nickname} · {me.mbti || 'MBTI 미입력'}
          </p>
        </div>

        <AxisRadar axes={axes} />

        <div className="report-abilities">
          {ABILITY_ORDER.map((code_) => (
            <span key={code_} className="report-ability-chip">
              {ABILITY_LABELS[code_]} {me.abilities[code_].toFixed(1)}
            </span>
          ))}
        </div>

        <Card>
          {me.comment_lines.map((line, i) => (
            <p key={i} className="report-comment-line">{line}</p>
          ))}
        </Card>

        {me.quote && (
          <Card>
            <p className="report-quote">"{me.quote}"</p>
            <p className="report-quote-note">{me.quote_note}</p>
          </Card>
        )}

        <p className="report-section-title">팀원별 궁합</p>
        <div className="report-compat-list">
          {me.compat.map((c) => (
            <Card key={c.nickname} className="report-compat-card">
              <span className="report-compat-nickname">{c.nickname}</span>
              <span className="report-compat-grade">{c.grade}</span>
              <span className="report-compat-tag">{c.tag}</span>
              <span className="report-compat-note">{c.note}</span>
            </Card>
          ))}
        </div>

        <div className="report-badges">
          {me.badges.map((b) => (
            <Badge key={b} tone="positive">🏅 {b}</Badge>
          ))}
        </div>

        {selfGuessType && (
          <p className="report-self-guess">
            내가 찍은 나 — {selfGuessType.name} / 실제 — {type.name}
          </p>
        )}
      </div>
    </PhoneFrame>
  )
}
