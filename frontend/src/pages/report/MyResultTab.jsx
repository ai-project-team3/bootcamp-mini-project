import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import { MOCK_REPORT } from '../../data/mockReport'
import AxisRadar from './AxisRadar'
import './MyResultTab.css'

export default function MyResultTab() {
  const { type, badges, narrative, axes } = MOCK_REPORT

  return (
    <div className="my-result">
      <div className="my-illust" aria-hidden>
        🧢
      </div>
      <h2 className="my-type">{type.name}</h2>
      <p className="my-quote">
        “{type.quote}” <span>{type.quoteSub}</span>
      </p>

      <div className="my-badges">
        {badges.map((b) => (
          <Badge key={b} tone="positive">
            {b}
          </Badge>
        ))}
      </div>

      <Card className="my-strength">{type.strength}</Card>

      <AxisRadar axes={axes} />

      <Card>
        <p className="my-narrative">{narrative}</p>
      </Card>
    </div>
  )
}
