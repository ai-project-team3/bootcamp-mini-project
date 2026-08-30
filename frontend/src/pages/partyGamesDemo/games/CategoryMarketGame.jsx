import { useState } from 'react'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import { PROMPT_ONLY_GAME_CONTENT } from '../../../data/gameDemo/gameDemoData'

const CATEGORIES = PROMPT_ONLY_GAME_CONTENT['category-market']

export default function CategoryMarketGame() {
  const [index, setIndex] = useState(0)
  const category = CATEGORIES[index]
  const next = () => setIndex((value) => (value + 1) % CATEGORIES.length)

  return <div className="party-play"><Card><h2>🛒 카테고리 시장에 가면~</h2><p>주제를 확인하고 휴대폰을 내려놓으세요. 앞사람의 답을 모두 외운 뒤 하나씩 추가합니다.</p></Card><Card className="party-category"><small>오늘의 카테고리</small><h1>{category.topic}</h1><b>“{category.chant}”</b></Card><p className="party-alert">누군가 가져갈 수 있는 물건이 아니라, 실제로 이 장소에서 판매하거나 제공하는 항목만 인정해요.</p><Button onClick={next}>다음 주제</Button></div>
}
