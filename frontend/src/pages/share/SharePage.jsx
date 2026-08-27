import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import { MOCK_REPORT } from '../../data/mockReport'
import './SharePage.css'

export default function SharePage() {
  const navigate = useNavigate()
  const { code } = useParams()
  const { type, badges, compat } = MOCK_REPORT
  const best = compat.reduce((a, b) => (b.total > a.total ? b : a))
  const worst = compat.reduce((a, b) => (b.total < a.total ? b : a))

  return (
    <PhoneFrame>
      <TopBar title="공유 카드" />

      <div className="share-card">
        <span className="share-tagline">TEAM PROJECT · 세션 결과</span>
        <div className="share-face" aria-hidden>
          🧢
        </div>
        <h2 className="share-name">{type.name}</h2>
        <p className="share-quote">
          “{type.quote}”<span>{type.quoteSub}</span>
        </p>
        <div className="share-badges">
          {badges.map((b) => (
            <span key={b} className="share-badge">
              {b}
            </span>
          ))}
        </div>
        <p className="share-strength">{type.strength}</p>
        <div className="share-pairs">
          <span>
            최고 궁합 · {best.with} <b>{best.grade}</b>
          </span>
          <span>
            최악 궁합 · {worst.with} <b>{worst.grade}</b>
          </span>
        </div>
        <div className="share-foot">
          <span>{new Date().toISOString().slice(0, 10).replace(/-/g, '.')}</span>
          <span>CREWVERSE</span>
        </div>
      </div>

      <Button variant="secondary" onClick={() => navigate(`/room/${code}/report`)}>
        리포트로 돌아가기
      </Button>
    </PhoneFrame>
  )
}
