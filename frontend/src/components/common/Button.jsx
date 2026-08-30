import './Button.css'

export default function Button({ children, variant = 'primary', className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </button>
  )
}
