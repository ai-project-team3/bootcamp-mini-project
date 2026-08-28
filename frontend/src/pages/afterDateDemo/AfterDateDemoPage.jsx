import { useState } from 'react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { AFTER_DATE_CONTENTS } from '../../data/afterDateDemo/afterDateDemoData'
import { drawNextPrompt } from '../../data/afterDateDemo/afterDateDemoModels'
import './AfterDateDemoPage.css'

const EMPTY_SESSION = { queue: [], currentIndex: null }

export default function AfterDateDemoPage() {
  const [view, setView] = useState('home')
  const [contentKey, setContentKey] = useState(null)
  const [session, setSession] = useState(EMPTY_SESSION)
  const content = contentKey ? AFTER_DATE_CONTENTS[contentKey] : null
  const prompt = content && session.currentIndex !== null
    ? content.items[session.currentIndex]
    : null

  const openHowTo = (nextContentKey) => {
    setContentKey(nextContentKey)
    setSession(EMPTY_SESSION)
    setView('how-to')
  }

  const returnHome = () => {
    setView('home')
    setContentKey(null)
    setSession(EMPTY_SESSION)
  }

  const startContent = () => {
    setSession(drawNextPrompt(EMPTY_SESSION, content.items.length))
    setView('play')
  }

  const showNextPrompt = () => {
    setSession((current) => drawNextPrompt(current, content.items.length))
  }

  if (view === 'home') {
    return (
      <PhoneFrame>
        <TopBar title="AFTER DATE · DEMO" showBack={false} />
        <header className="after-date-hero">
          <span>FOR TWO</span>
          <h1>AFTER<br />DATE</h1>
          <p>폰은 잠깐만, 대화는 오래.</p>
        </header>

        <div className="after-date-list" aria-label="AFTER DATE 콘텐츠 선택">
          {Object.entries(AFTER_DATE_CONTENTS).map(([key, item]) => (
            <button key={key} className="after-date-card-button" type="button" onClick={() => openHowTo(key)}>
              <Card className={`after-date-card after-date-card-${key}`}>
                <span className="after-date-card-icon" aria-hidden="true">{item.icon}</span>
                <span className="after-date-card-copy">
                  <b>{item.title}</b>
                  <small>{item.description}</small>
                </span>
                <span className="after-date-card-arrow" aria-hidden="true">›</span>
              </Card>
            </button>
          ))}
        </div>
      </PhoneFrame>
    )
  }

  if (view === 'how-to') {
    return (
      <PhoneFrame>
        <TopBar title="AFTER DATE · DEMO" onBack={returnHome} />
        <main className="after-date-how-to">
          <span className="after-date-large-icon" aria-hidden="true">{content.icon}</span>
          <p className="after-date-kicker">하는 방법</p>
          <h1>{content.title}</h1>
          <div className="after-date-instructions">
            {content.instruction.map((line) => <p key={line}>{line}</p>)}
          </div>
        </main>
        <Button onClick={startContent}>시작하기</Button>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      <TopBar title={`${content.title} · DEMO`} onBack={returnHome} />
      <main className="after-date-play">
        <Card className="after-date-prompt-card">
          <span className="after-date-prompt-icon" aria-hidden="true">{prompt.icon || content.icon}</span>
          <h1>{prompt.question}</h1>

          {prompt.options && (
            <div className="after-date-options">
              {prompt.options.map((option, index) => (
                <div key={option} className="after-date-option">
                  <b>{index + 1}</b>
                  <span>{option}</span>
                </div>
              ))}
            </div>
          )}

          {content.note && <p className="after-date-note">{content.note}</p>}
        </Card>
      </main>
      <div className="after-date-actions">
        <Button onClick={showNextPrompt}>{content.nextLabel}</Button>
        <Button variant="secondary" onClick={returnHome}>메인으로</Button>
      </div>
    </PhoneFrame>
  )
}
