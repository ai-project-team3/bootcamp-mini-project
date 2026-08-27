import './PhoneFrame.css'

export default function PhoneFrame({ children }) {
  return (
    <div className="phone">
      <div className="phone-body">{children}</div>
    </div>
  )
}
