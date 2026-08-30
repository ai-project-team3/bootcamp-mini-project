import { useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import { PROMPT_ONLY_GAME_CONTENT } from '../../../data/gameDemo/gameDemoData'

const PROMPTS = PROMPT_ONLY_GAME_CONTENT['name-chain']

export default function NameChainGame() {
  const [index, setIndex] = useState(0)
  const prompt = PROMPTS[index]
  const next = () => setIndex((value) => (value + 1) % PROMPTS.length)

  return <div className="party-play"><Card><h2>🔤 이름 끝말잇기</h2><p>첫 이름만 확인한 뒤 휴대폰을 내려놓고, 실존 인물 이름으로 계속 이어가세요.</p></Card><Card className="party-category"><small>START NAME</small><h1>{prompt.starter}</h1><b>{prompt.prompt}</b></Card><p className="party-alert">이름의 존재 여부와 두음법칙은 참가자끼리 합의해 주세요.</p><Button onClick={next}>다른 시작 이름</Button></div>
}
