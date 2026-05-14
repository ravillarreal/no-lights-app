import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Reporta en segundos',
    desc: 'Un toque desde tu teléfono registra el corte con tu ubicación exacta.',
  },
  {
    icon: '🗺️',
    title: 'Mapa en tiempo real',
    desc: 'Ve todos los reportes activos en tu zona. El círculo se vuelve rojo cuando hay 3 o más cortes cerca.',
  },
  {
    icon: '🤖',
    title: 'Alertas en Telegram',
    desc: 'Guarda una ubicación en el bot y recibe notificaciones cuando se vaya o llegue la luz.',
  },
  {
    icon: '📊',
    title: 'Historial y estadísticas',
    desc: 'Consulta cuántas veces se fue la luz en tu barrio, duración promedio y más.',
  },
]

export default function LandingPage() {
  const { user } = useAuth()
  const appLink = user ? '/mapa' : '/login'
  const appLabel = user ? 'Ir al mapa →' : 'Comenzar ahora →'

  return (
    <div style={s.root}>
      {/* Background blobs */}
      <div style={{ ...s.blob, top: '-20%', left: '-15%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)' }} />
      <div style={{ ...s.blob, bottom: '-20%', right: '-15%', background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 65%)' }} />
      <div style={{ ...s.blob, top: '40%', right: '10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)' }} />

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <div style={s.navIcon}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#f9fafb', letterSpacing: -0.5 }}>No Lights</span>
        </div>
        <Link to={appLink} style={s.navBtn}>{user ? 'Ir al mapa' : 'Iniciar sesión'}</Link>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.badge}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0 }} />
          Sistema activo en tiempo real
        </div>

        <h1 style={s.heroTitle}>
          Reporta los cortes de luz<br />
          <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            de tu comunidad
          </span>
        </h1>

        <p style={s.heroSub}>
          Plataforma colaborativa para mapear cortes de luz en tiempo real.<br />
          Reporta, consulta y recibe alertas directamente en Telegram.
        </p>

        <div style={s.heroCtas}>
          <Link to={appLink} style={s.ctaPrimary}>
            {appLabel}
          </Link>
          <a href="https://t.me/no_lights_bot" target="_blank" rel="noopener noreferrer" style={s.ctaSecondary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M22 2L11 13" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Bot de Telegram
          </a>
        </div>
      </section>

      {/* Features */}
      <section style={s.features}>
        {FEATURES.map(f => (
          <div key={f.title} style={s.featureCard}>
            <div style={s.featureIcon}>{f.icon}</div>
            <h3 style={s.featureTitle}>{f.title}</h3>
            <p style={s.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section style={s.footerCta}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb', margin: '0 0 12px', letterSpacing: -0.5 }}>
          ¿Se fue la luz?
        </h2>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 28px' }}>
          Reporta el corte en segundos y ayuda a tu comunidad.
        </p>
        <Link to={appLink} style={s.ctaPrimary}>
          {appLabel}
        </Link>
      </section>

      <footer style={s.footer}>
        <span>nolights.app · Platanus Build Night 2026 · Caracas, Venezuela</span>
      </footer>
    </div>
  )
}

const s = {
  root: {
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    background: '#080c10',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: '#f9fafb',
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    width: '70vw',
    height: '70vw',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  nav: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  navIcon: {
    width: 34, height: 34,
    borderRadius: 9,
    background: 'linear-gradient(135deg, #1e3a5f, #0d2040)',
    border: '1px solid rgba(59,130,246,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  },
  navBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e5e7eb',
    borderRadius: 10,
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 0.15s',
  },
  hero: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    padding: '80px 24px 64px',
    maxWidth: 720,
    margin: '0 auto',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#86efac',
    letterSpacing: 0.3,
    marginBottom: 28,
  },
  heroTitle: {
    fontSize: 'clamp(32px, 6vw, 56px)',
    fontWeight: 900,
    lineHeight: 1.15,
    margin: '0 0 20px',
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 17,
    color: '#6b7280',
    lineHeight: 1.7,
    margin: '0 0 36px',
  },
  heroCtas: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff',
    borderRadius: 14,
    padding: '14px 28px',
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
    letterSpacing: 0.2,
    transition: 'opacity 0.15s',
  },
  ctaSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(42,171,238,0.08)',
    border: '1px solid rgba(42,171,238,0.2)',
    color: '#7dd3fc',
    borderRadius: 14,
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
  },
  features: {
    position: 'relative',
    zIndex: 10,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    maxWidth: 900,
    margin: '0 auto',
    padding: '0 24px 80px',
  },
  featureCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: '28px 24px',
    transition: 'border-color 0.2s',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 14,
    display: 'block',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#f0f0f0',
    margin: '0 0 8px',
  },
  featureDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.6,
    margin: 0,
  },
  footerCta: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    padding: '60px 24px 80px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  footer: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    padding: '20px 24px',
    fontSize: 12,
    color: '#374151',
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },
}
