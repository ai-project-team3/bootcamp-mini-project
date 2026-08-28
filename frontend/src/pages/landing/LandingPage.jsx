import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import Button from '../../components/common/Button'
import '../hub/ResultHubPage.css'
import './LandingPage.css'

/**
 * The app's landing screen.
 *
 * Deliberately the same UI as the screen the 얼음땡 game ends on
 * (`pages/hub/ResultHubPage`): the same PhoneFrame, TopBar, `hub-body` layout
 * and the same three buttons in the same order. Only the state differs — there
 * is no finished game here, so the two report buttons are disabled, and
 * "게임 바로가기", which is disabled on that screen, is the live one.
 */
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <PhoneFrame>
      <TopBar title="게임 종료" showBack={false} />
      <div className="hub-body">
        <h1 className="hub-title">18분이 끝났어요</h1>
        <p className="hub-sub">결과를 확인해보세요</p>

        <Button disabled>개인 리포트</Button>
        <Button variant="secondary" disabled>
          팀 리포트
        </Button>
        <Button variant="ghost" onClick={() => navigate('/games')}>
          게임 바로가기
        </Button>

        <button type="button" className="landing-start-link" onClick={() => navigate('/start')}>
          얼음땡부터 시작하기
        </button>
      </div>
    </PhoneFrame>
  )
}
