import { useState } from 'react'

// 유형 카드 이미지. public/types/T1.png ~ T8.png 를 찾고, 없으면 이모지로
// 대신 그린다 — 여덟 장이 다 준비되기 전에도 화면이 비지 않게.
export default function TypeMark({ type, size = 72, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!type) return null
  if (failed || !type.image) {
    return (
      <span className={`type-mark type-mark-emoji ${className}`} style={{ fontSize: size * 0.72 }}>
        {type.symbol}
      </span>
    )
  }
  return (
    <img
      className={`type-mark ${className}`}
      src={type.image}
      alt={type.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  )
}
