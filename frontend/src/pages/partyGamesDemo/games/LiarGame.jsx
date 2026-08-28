import { useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import FlavorToggle from '../../../components/common/FlavorToggle'
import { DemoPlayerTabs } from '../../../components/common/GameDemoControls'
import { DEMO_PLAYERS, FLAVORED_GAME_CONTENT } from '../../../data/gameDemo/gameDemoData'

export default function LiarGame() {
  const [mode, setMode] = useState('mild')
  const [round, setRound] = useState(0)
  const [activeId, setActiveId] = useState('seojun')
  const [seen, setSeen] = useState([])
  const [openId, setOpenId] = useState(null)
  const [started, setStarted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const content = FLAVORED_GAME_CONTENT.liar[mode]
  const topic = content[round]
  const liar = DEMO_PLAYERS[(round + 2) % DEMO_PLAYERS.length]
  const active = DEMO_PLAYERS.find((player) => player.id === activeId)

  const resetRound = () => {
    setActiveId('seojun')
    setSeen([])
    setOpenId(null)
    setStarted(false)
    setRevealed(false)
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setRound(0)
    resetRound()
  }

  const changePlayer = (playerId) => {
    setActiveId(playerId)
    setOpenId(null)
  }

  const seeRole = () => {
    setSeen((current) => current.includes(activeId) ? current : [...current, activeId])
    setOpenId(activeId)
  }

  const next = () => {
    setRound((value) => (value + 1) % content.length)
    resetRound()
  }

  return (
    <div className="party-play">
      <Card>
        <h2>🕵️ 라이어게임</h2>
        <FlavorToggle value={mode} onChange={changeMode} />
        <p>각자 역할을 확인한 뒤 폰을 내려놓고 제시어를 직접 말하지 않으며 대화하세요.</p>
      </Card>

      {!started ? (
        <>
          <DemoPlayerTabs players={DEMO_PLAYERS} activeId={activeId} onChange={changePlayer} />
          <Card>
            {openId !== activeId ? (
              <div className="party-cover">
                🔒 {active.name}만 확인하세요.
                <Button onClick={seeRole}>{seen.includes(activeId) ? '역할 다시 확인' : '내 역할 확인'}</Button>
              </div>
            ) : (
              <div className="party-secret">
                <small>PRIVATE ROLE · {topic.category}</small>
                <strong>{activeId === liar.id ? 'LIAR' : topic.word}</strong>
                <p>{activeId === liar.id ? '제시어를 모르는 척 숨기고 대화하세요.' : '제시어를 직접 말하지 말고 설명하세요.'}</p>
                <Button variant="secondary" onClick={() => setOpenId(null)}>화면 가리기</Button>
              </div>
            )}
          </Card>
          <Button disabled={seen.length < DEMO_PLAYERS.length} onClick={() => { setStarted(true); setOpenId(null) }}>
            폰 내려놓고 게임 시작
          </Button>
        </>
      ) : (
        <Card className={revealed ? 'party-reveal' : ''}>
          {revealed ? (
            <>
              <span>LIAR REVEAL</span>
              <h1>{liar.name}이 Liar!</h1>
              <p>제시어는 <b>{topic.word}</b>였습니다.</p>
              <Button onClick={next}>다음 주제</Button>
            </>
          ) : (
            <>
              <h2>누가 Liar일까요?</h2>
              <p>대화와 지목은 화면 밖에서 진행하세요. 합의가 끝나면 정답만 공개합니다.</p>
              <Button onClick={() => setRevealed(true)}>Liar와 제시어 공개</Button>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
