import { useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import { PROMPT_ONLY_GAME_CONTENT } from '../../../data/gameDemo/gameDemoData'
import { buildForbiddenWordSet, getVisibleForbiddenAssignments } from '../../../data/gameDemo/gameDemoModels'
import { useRoomFlow } from '../../../context/RoomFlowContext'
import { getPrivateDemoPlayerId } from '../../../data/gameDemo/gameDemoModels'

const WORD_POOLS = PROMPT_ONLY_GAME_CONTENT['forbidden-word']

export default function ForbiddenWordGame({ players }) {
  const { playerId } = useRoomFlow()
  const [round, setRound] = useState(0)
  const activeId = getPrivateDemoPlayerId(players, playerId)
  const [visible, setVisible] = useState(false)
  const active = players.find((player) => player.id === activeId)
  const words = buildForbiddenWordSet(WORD_POOLS, round)
  const visibleAssignments = getVisibleForbiddenAssignments(players, words, activeId)

  const reroll = () => {
    setRound((value) => value + 1)
    setVisible(false)
  }

  return (
    <div className="party-play">
      <Card>
        <h2>🚫 금지어 게임</h2>
        <p>자신의 금지어는 볼 수 없습니다. 다른 3명의 금지어만 확인하고 대화하세요.</p>
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
