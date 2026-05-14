import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  function handleLogout() {
    logout()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 90,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 264,
        background: '#0d0d0d',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 100,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: open ? '12px 0 48px rgba(0,0,0,0.7)' : 'none',
      }}>

        {/* Header */}
        <div style={{
          padding: '28px 20px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #1a3a5c, #0d2040)',
              border: '1px solid rgba(33,150,243,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0f0', letterSpacing: -0.3 }}>
                No Lights
              </div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 1 }}>
                Reportes en tiempo real
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#666', width: 30, height: 30, borderRadius: 8,
            cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}>✕</button>
        </div>

        {/* Section label */}
        <div style={{ padding: '20px 20px 6px', fontSize: 10, fontWeight: 700, color: '#333', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Navegación
        </div>

        {/* Nav */}
        <nav style={{ padding: '0 8px' }}>
          <NavItem to="/mapa"      icon="🗺️" label="Mapa"      sub="Ver y reportar cortes"       active={location.pathname === '/mapa'}      onClick={onClose} />
          <NavItem to="/dashboard" icon="📊" label="Dashboard" sub="Estadísticas y reportería"   active={location.pathname === '/dashboard'} onClick={onClose} />
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Telegram bot card */}
        <TelegramCard />

        {/* User */}
        <div style={{ padding: '16px 20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            {user?.picture
              ? <img src={user.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', flexShrink: 0 }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
            }
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d0d0d0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name ?? 'Usuario'}
              </div>
              <div style={{ fontSize: 11, color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#555', borderRadius: 8, padding: '8px 0',
              fontSize: 12, cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = '#888' }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.color = '#555' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}

function TelegramCard() {
  const username = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? ''
  const href = username ? `https://t.me/${username.replace('@', '')}` : '#'

  return (
    <div style={{ padding: '0 12px 14px' }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          textDecoration: 'none',
          borderRadius: 14,
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(42,171,238,0.13) 0%, rgba(33,150,243,0.07) 100%)',
          border: '1px solid rgba(42,171,238,0.22)',
          padding: '14px 14px 13px',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(42,171,238,0.5)'
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42,171,238,0.2) 0%, rgba(33,150,243,0.12) 100%)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(42,171,238,0.22)'
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42,171,238,0.13) 0%, rgba(33,150,243,0.07) 100%)'
        }}
      >
        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(42,171,238,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(145deg, #2AABEE, #1a8fd1)',
            boxShadow: '0 4px 16px rgba(42,171,238,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Paper plane SVG — logo de Telegram */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f4fd', letterSpacing: -0.2 }}>
              Bot de Alertas
            </div>
            <div style={{ fontSize: 11, color: '#5bb8f5', marginTop: 2, lineHeight: 1.3 }}>
              Recibe avisos en Telegram
            </div>
          </div>

          {/* Arrow */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.6 }}>
            <path d="M9 18l6-6-6-6" stroke="#2AABEE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Bottom tag */}
        <div style={{
          marginTop: 10,
          paddingTop: 9,
          borderTop: '1px solid rgba(42,171,238,0.12)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2AABEE', boxShadow: '0 0 6px #2AABEE', flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#5bb8f5', letterSpacing: 0.3 }}>
            Activo · Notificaciones en tiempo real
          </span>
        </div>
      </a>
    </div>
  )
}

function NavItem({ to, icon, label, sub, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 13,
        padding: '11px 12px', borderRadius: 10, marginBottom: 2,
        textDecoration: 'none',
        background: active ? 'rgba(33,150,243,0.1)' : 'transparent',
        border: `1px solid ${active ? 'rgba(33,150,243,0.2)' : 'transparent'}`,
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#e0e0e0' : '#777', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 11, color: active ? '#2196f3' : '#333', marginTop: 2 }}>{sub}</div>
      </div>
    </Link>
  )
}
