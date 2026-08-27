import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../../components/layout/PhoneFrame'
import TopBar from '../../components/layout/TopBar'
import { CATEGORY_GROUPS } from '../../data/categories'
import { useRoomFlow } from '../../context/RoomFlowContext'
import './CategoryPage.css'

export default function CategoryPage() {
  const navigate = useNavigate()
  const { setCategory } = useRoomFlow()
  const [group, setGroup] = useState(null)

  const handleGroupSelect = (g) => setGroup(g)

  const handleLeafSelect = (leaf) => {
    setCategory(leaf)
    navigate('/entry')
  }

  const handleBack = () => {
    if (group) {
      setGroup(null)
      return
    }
    navigate(-1)
  }

  return (
    <PhoneFrame>
      <TopBar title="1단계 · 어떤 자리인가요" onBack={handleBack} />
      <h1 className="cat-title">{group ? group.label : '어떤 자리인가요?'}</h1>

      {!group && (
        <div className="cat-grid">
          {CATEGORY_GROUPS.map((g) => (
            <button key={g.id} className="cat-btn" onClick={() => handleGroupSelect(g)}>
              <span className="cat-btn-name">{g.label}</span>
              <span className="cat-btn-desc">{g.size}</span>
            </button>
          ))}
        </div>
      )}

      {group && (
        <div className="cat-grid">
          {group.leaves.map((leaf) => (
            <button key={leaf.code} className="cat-btn" onClick={() => handleLeafSelect(leaf)}>
              <span className="cat-btn-name">{leaf.label}</span>
              <span className="cat-btn-desc">{leaf.desc}</span>
              <span className="cat-btn-size">{leaf.size}</span>
            </button>
          ))}
        </div>
      )}

      <p className="cat-note">준비 중인 카테고리는 곧 열립니다.</p>
    </PhoneFrame>
  )
}
