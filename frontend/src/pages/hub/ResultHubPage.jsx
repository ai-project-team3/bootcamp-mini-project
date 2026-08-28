import { useNavigate, useParams } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import './ResultHubPage.css'

export default function ResultHubPage() {
  const { code } = useParams()
  const navigate = useNavigate()

  return (
    <PhoneFrame>
      <TopBar title="게임 종료" showBack={false} />
      <div className="hub-body">
        <h1 className="hub-title">18분이 끝났어요</h1>
        <p className="hub-sub">결과를 확인해보세요</p>

        <Button onClick={() => navigate(`/room/${code}/report/me`)}>개인 리포트</Button>
        <Button variant="secondary" onClick={() => navigate(`/room/${code}/report/team`)}>
          팀 리포트
        </Button>
        <Button variant="ghost" disabled>
          게임으로 가기 (준비 중)
        </Button>
      </div>
    </PhoneFrame>
  )
}
