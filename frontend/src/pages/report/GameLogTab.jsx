import Card from '../../components/common/Card'
import { MOCK_REPORT } from '../../data/mockReport'
import './GameLogTab.css'

export default function GameLogTab() {
  return (
    <div className="log-list">
      {MOCK_REPORT.gameLog.map((log) => (
        <Card key={log.stage} className="log-row">
          <span className="log-stage">STAGE {log.stage}</span>
          <p className="log-fact">{log.fact}</p>
        </Card>
      ))}
    </div>
  )
}
