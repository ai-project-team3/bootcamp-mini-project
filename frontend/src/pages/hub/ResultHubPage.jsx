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
        <h1 className="hub-title">게임이 끝났어요</h1>
        <p className="hub-sub">결과를 확인해보세요</p>

        <Button onClick={() => navigate(`/room/${code}/report/me`)}>개인 리포트</Button>
        <Button variant="secondary" onClick={() => navigate(`/room/${code}/report/team`)}>
          팀 리포트
        </Button>
        {/* 페르소나가 나온 다음에 하는 게임들 — 기획안 §17. 방을 새로 만들고
            초대코드로 다시 모이되, 이 세션에서 나온 성향을 들고 간다. 게임들은
            닉네임으로 사람을 다시 찾는다 (services/persona_handoff). */}
        {/* 방부터 파게 하지 않는다. 무엇이 있는지 보고 하고 싶어지는 게
            먼저다 — 목록을 보여주고, 거기서 고른 뒤에 방을 만든다. */}
        <Button variant="ghost" onClick={() => navigate(`/games?from=${code}`)}>
          게임 더 하기
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')}>
          처음으로
        </Button>
      </div>
    </PhoneFrame>
  )
}
