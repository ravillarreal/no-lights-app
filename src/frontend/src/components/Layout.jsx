import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Hamburger — fijo para que funcione en mapa y dashboard */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        style={{
          position: 'fixed',
          top: 16, left: 16,
          zIndex: 50,
          width: 44, height: 44,
          background: 'rgba(10,10,10,0.88)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          color: '#e0e0e0',
          cursor: 'pointer',
          fontSize: 19,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          transition: 'background 0.15s, transform 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,30,30,0.95)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,10,10,0.88)'}
      >
        ☰
      </button>

      {children}
    </div>
  )
}
