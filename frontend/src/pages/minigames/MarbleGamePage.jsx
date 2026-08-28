import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { MarbleApp } from '../marble/MarbleApp'
import '../marble/styles/global.css'
import './MinigamePage.css'

/**
 * Couple marble inside the app's phone shell.
 *
 * The game runs light in 일반 모드 and dark in 19금 모드, so the shell follows
 * whichever mode the room is in. The game reports that through `onToneChange`
 * rather than the shell reaching into the game's state.
 */
export default function MarbleGamePage() {
  const navigate = useNavigate()
  const [tone, setTone] = useState('light')

  return (
    <PhoneFrame tone={tone}>
      <TopBar title="커플 브루마블" onBack={() => navigate('/')} />
      <div className="minigame-slot">
        <MarbleApp onToneChange={setTone} />
      </div>
    </PhoneFrame>
  )
}
