import { useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import { DemoPlayerTabs } from '../../../components/common/GameDemoControls'
import { DEMO_PLAYERS, PROMPT_ONLY_GAME_CONTENT } from '../../../data/gameDemo/gameDemoData'
import { buildForbiddenWordSet, getVisibleForbiddenAssignments } from '../../../data/gameDemo/gameDemoModels'

const WORD_POOLS = PROMPT_ONLY_GAME_CONTENT['forbidden-word']

export default function ForbiddenWordGame() {
  const [round, setRound] = useState(0)
  const [activeId, setActiveId] = useState('seojun')
  const [visible, setVisible] = useState(false)
  const active = DEMO_PLAYERS.find((player) => player.id === activeId)
  const words = buildForbiddenWordSet(WORD_POOLS, round)
  const visibleAssignments = getVisibleForbiddenAssignments(DEMO_PLAYERS, words, activeId)

  const changePlayer = (playerId) => {
    setActiveId(playerId)
    setVisible(false)
  }

  const reroll = () => {
    setRound((value) => value + 1)
    setVisible(false)
    setActiveId('seojun')
  }

  return (
    <div className="party-play">
      <Card>
        <h2>🚫 금지어 게임</h2>
        <p>자신의 금지어는 볼 수 없습니다. 다른 3명의 금지어만 확인하고 대화하세요.</p>
        <DemoPlayerTabs players={DEMO_PLAYERS} activeId={activeId} onChange={changePlayer} />
      </Card>
      <Card>
        {visible ? (
          <div>
            <small>{active.name} 화면 · 다른 플레이어의 금지어</small>
            <div className="forbidden-list">
              {visibleAssignments.map((assignment) => (
                <div key={assignment.playerId}>
                  <b>{assignment.playerName}</b>
                  <span>{assignment.word}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setVisible(false)}>화면 가리기</Button>
          </div>
        ) : (
          <div className="party-cover">
            🔒 {active.name}만 확인하세요.
            <Button onClick={() => setVisible(true)}>다른 사람 금지어 확인</Button>
          </div>
        )}
      </Card>
      <Button variant="ghost" onClick={reroll}>금지어 다시 돌리기</Button>
    </div>
  )
}
