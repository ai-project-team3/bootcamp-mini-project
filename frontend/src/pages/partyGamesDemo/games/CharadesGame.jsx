import { useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import { FLAVORED_GAME_CONTENT } from '../../../data/gameDemo/gameDemoData'
import FlavorToggle from '../../../components/common/FlavorToggle'

export default function CharadesGame() {
  const [mode, setMode] = useState('mild')
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const words = FLAVORED_GAME_CONTENT.charades[mode]
  const word = words[index]
  const changeMode = (nextMode) => { setMode(nextMode); setIndex(0); setVisible(false) }
  const next = () => { setIndex((value) => (value + 1) % words.length); setVisible(false) }

  return <div className="party-play"><Card><h2>🎭 몸으로 말해요</h2><FlavorToggle value={mode} onChange={changeMode} /><p>출제자만 제시어를 확인하고 화면을 가린 뒤, 말하지 않고 몸으로 표현하세요.</p>{mode === 'spicy' && <p className="party-alert">실제 상대에게 접촉하지 않고 허공이나 가상의 상대를 두고 연기해도 돼요.</p>}</Card><Card>{visible ? <div className="party-secret"><small>SECRET WORD · {word.category}</small><strong>{word.emoji} {word.word}</strong><Button variant="secondary" onClick={() => setVisible(false)}>화면 가리기</Button></div> : <div className="party-cover">🔒 출제자만 화면을 확인하세요.<Button onClick={() => setVisible(true)}>제시어 확인</Button></div>}</Card><Button variant="ghost" onClick={next}>다음 제시어</Button></div>
}
