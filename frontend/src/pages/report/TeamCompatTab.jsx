import Card from '../../components/common/Card'
import { MOCK_REPORT, GRADE_LABEL } from '../../data/mockReport'
import './TeamCompatTab.css'

export default function TeamCompatTab() {
  return (
    <div className="compat-list">
      {MOCK_REPORT.compat.map((c) => (
        <Card key={c.with} className="compat-row">
          <div>
            <span className="compat-name">{c.with}</span>
            <span className="compat-grade-name">{GRADE_LABEL[c.grade]}</span>
          </div>
          <span className={`compat-grade compat-grade-${c.grade}`}>{c.grade}</span>
        </Card>
      ))}
    </div>
  )
}
