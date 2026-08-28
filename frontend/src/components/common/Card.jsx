import './Card.css'

export default function Card({ children, className = '' }) {
  return <div className={`pcard ${className}`}>{children}</div>
}
