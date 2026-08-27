import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Tabs from '../../components/common/Tabs'
import Button from '../../components/common/Button'
import MyResultTab from './MyResultTab'
import TeamCompatTab from './TeamCompatTab'
import GameLogTab from './GameLogTab'
import { REPORT_TABS } from './reportTabs'
import './ReportPage.css'

export default function ReportPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [active, setActive] = useState(REPORT_TABS[0].id)

  const handleShare = () => navigate(`/room/${code}/share`)

  return (
    <PhoneFrame>
      <TopBar title={`리포트 · ${code}`} />
      <Tabs tabs={REPORT_TABS} active={active} onChange={setActive} />

      <div className="report-tab-body">
        {active === 'me' && <MyResultTab />}
        {active === 'compat' && <TeamCompatTab />}
        {active === 'log' && <GameLogTab />}
      </div>

      <Button onClick={handleShare}>공유 카드 보기</Button>
    </PhoneFrame>
  )
}
