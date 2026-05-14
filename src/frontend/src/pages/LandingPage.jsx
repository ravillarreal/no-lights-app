import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const FEATURES = [
  { icon: '⚡', title: 'Reporta en segundos', desc: 'Un toque desde tu teléfono registra el corte con tu ubicación GPS exacta. Sin formularios, sin complicaciones.' },
  { icon: '🗺️', title: 'Mapa en tiempo real', desc: 'Visualiza todos los reportes activos en tu zona. El círculo se vuelve rojo cuando hay 3 o más cortes cerca.' },
  { icon: '🤖', title: 'Alertas en Telegram', desc: 'Guarda una o varias ubicaciones y recibe notificaciones automáticas cuando se vaya o llegue la luz.' },
  { icon: '📊', title: 'Historial completo', desc: 'Consulta cuántas veces se fue la luz en tu barrio, duración promedio y tendencias por zona.' },
]

const STEPS = [
  { n: '01', title: 'Inicia sesión', desc: 'Entra con tu cuenta de Google en segundos. Sin contraseñas que recordar.' },
  { n: '02', title: 'Abre el mapa', desc: 'Ve los reportes activos en tu zona y el estado del suministro eléctrico en tiempo real.' },
  { n: '03', title: 'Reporta o recibe alertas', desc: 'Toca el botón para reportar un corte o suscríbete en el bot de Telegram para recibir notificaciones.' },
]

const TESTIMONIALS = [
  {
    name: 'María G.',
    location: 'Chacao, Caracas',
    avatar: '👩',
    text: 'Ahora sé exactamente cuándo vuelve la luz en mi edificio. Le avisé a mis vecinos del corte y todos se suscribieron al bot.',
  },
  {
    name: 'Carlos R.',
    location: 'Maracaibo',
    avatar: '👨',
    text: 'El dashboard me mostró que en mi urbanización se va la luz en promedio 4 veces por semana. Información que nunca había tenido.',
  },
  {
    name: 'Ana P.',
    location: 'Barquisimeto',
    avatar: '👩‍💼',
    text: 'Uso el bot de Telegram para saber cuándo hay luz antes de salir a comprar. Me ha salvado más de una vez.',
  },
]

const STATS = [
  { value: 'Real time', label: 'Datos actualizados' },
  { value: '500m', label: 'Radio de detección' },
  { value: '24/7', label: 'Bot de alertas activo' },
  { value: '100%', label: 'Gratuito' },
]

function AppMockup() {
  return (
    <div style={s.mockupWrapper}>
      {/* Phone frame */}
      <div style={s.phone}>
        <div style={s.phoneSpeaker} />
        <div style={s.phoneScreen}>
          {/* Map bg */}
          <div style={s.mapBg}>
            {/* Grid lines simulating map */}
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 20}%`, height: 1, background: 'rgba(255,255,255,0.04)' }} />
            ))}
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i * 25}%`, width: 1, background: 'rgba(255,255,255,0.04)' }} />
            ))}
            {/* Search bar */}
            <div style={s.mockSearchBar}>
              <span style={{ fontSize: 10, opacity: 0.5 }}>🔍</span>
              <span style={{ fontSize: 10, color: '#6b7280' }}>Buscar dirección…</span>
            </div>
            {/* Badge */}
            <div style={s.mockBadge}>⚡ 2 reportes · 500m</div>
            {/* Circle */}
            <div style={s.mockCircle} />
            {/* Points */}
            <div style={{ ...s.mockDot, top: '42%', left: '48%' }} />
            <div style={{ ...s.mockDot, top: '50%', left: '55%', width: 8, height: 8 }} />
            {/* FAB */}
            <div style={s.mockFab}>⚡ Reportar Corte</div>
          </div>
        </div>
        <div style={s.phoneHome} />
      </div>
      {/* Glow behind phone */}
      <div style={s.phoneGlow} />
    </div>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const appLink  = user ? '/mapa' : '/login'
  const appLabel = user ? 'Ir al mapa →' : 'Comenzar ahora →'

  return (
    <div style={s.root}>
      {/* Blobs */}
      <div style={{ ...s.blob, top: '-10%', left: '-15%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)' }} />
      <div style={{ ...s.blob, top: '30%',  right: '-15%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)' }} />
      <div style={{ ...s.blob, bottom: '10%', left: '10%', background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 65%)' }} />

      {/* ── Nav ── */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <div style={s.navIcon}>⚡</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#f9fafb', letterSpacing: -0.5 }}>No Lights</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="https://t.me/no_lights_bot" target="_blank" rel="noopener noreferrer" style={{ ...s.navBtn, color: '#7dd3fc', borderColor: 'rgba(42,171,238,0.2)' }}>Bot Telegram</a>
          <Link to={appLink} style={{ ...s.navBtn, background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', color: '#93c5fd' }}>
            {user ? 'Ir al mapa' : 'Iniciar sesión'}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.badge}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0, display: 'inline-block' }} />
          Sistema activo en tiempo real
        </div>
        <h1 style={s.heroTitle}>
          Deja de adivinar<br />
          <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            cuándo vuelve la luz
          </span>
        </h1>
        <p style={s.heroSub}>
          Plataforma colaborativa para reportar y monitorear cortes eléctricos en tiempo real.<br />
          Construida por y para comunidades en Venezuela.
        </p>
        <div style={s.heroCtas}>
          <Link to={appLink} style={s.ctaPrimary}>{appLabel}</Link>
          <a href="https://t.me/no_lights_bot" target="_blank" rel="noopener noreferrer" style={s.ctaSecondary}>
            <TelegramIcon /> Activar alertas gratis
          </a>
        </div>
        <p style={{ fontSize: 12, color: '#374151', marginTop: 16 }}>Sin costo · Sin registro complicado · Funciona desde el teléfono</p>
      </section>

      {/* ── App mockup ── */}
      <section style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', padding: '0 24px 80px' }}>
        <AppMockup />
      </section>

      {/* ── Stats ── */}
      <section style={s.statsRow}>
        {STATS.map(st => (
          <div key={st.label} style={s.statCard}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#f9fafb', letterSpacing: -1 }}>{st.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{st.label}</div>
          </div>
        ))}
      </section>

      {/* ── Cómo funciona ── */}
      <section style={s.section}>
        <SectionLabel>Cómo funciona</SectionLabel>
        <h2 style={s.sectionTitle}>Tres pasos y listo</h2>
        <div style={s.stepsRow}>
          {STEPS.map(step => (
            <div key={step.n} style={s.stepCard}>
              <div style={s.stepNum}>{step.n}</div>
              <h3 style={s.stepTitle}>{step.title}</h3>
              <p style={s.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={s.section}>
        <SectionLabel>Funcionalidades</SectionLabel>
        <h2 style={s.sectionTitle}>Todo lo que necesitas</h2>
        <div style={s.featuresGrid}>
          {FEATURES.map(f => (
            <div key={f.title} style={s.featureCard}>
              <div style={s.featureIcon}>{f.icon}</div>
              <h3 style={s.featureTitle}>{f.title}</h3>
              <p style={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={s.section}>
        <SectionLabel>Historias de usuarios</SectionLabel>
        <h2 style={s.sectionTitle}>Lo que dicen en la comunidad</h2>
        <div style={s.testimonialsRow}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={s.testimonialCard}>
              <p style={s.testimonialText}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
                <div style={s.testimonialAvatar}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Telegram CTA ── */}
      <section style={s.telegramSection}>
        <div style={s.telegramCard}>
          <div style={s.telegramIcon}><TelegramIcon size={28} /></div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f9fafb', margin: '0 0 10px', letterSpacing: -0.5 }}>
            Recibe alertas en Telegram
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6, maxWidth: 400 }}>
            Guarda la ubicación de tu casa, trabajo o cualquier lugar importante. Te avisamos cuando se vaya o llegue la luz.
          </p>
          <a href="https://t.me/no_lights_bot" target="_blank" rel="noopener noreferrer" style={s.telegramBtn}>
            Abrir @no_lights_bot →
          </a>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={s.finalCta}>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: '#f9fafb', margin: '0 0 12px', letterSpacing: -0.5, textAlign: 'center' }}>
          ¿Se fue la luz?
        </h2>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 32px', textAlign: 'center' }}>
          Reporta el corte en segundos y ayuda a tu comunidad a estar informada.
        </p>
        <Link to={appLink} style={{ ...s.ctaPrimary, fontSize: 16, padding: '16px 36px' }}>
          {appLabel}
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerBrand}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ ...s.navIcon, width: 28, height: 28, fontSize: 13 }}>⚡</div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#e5e7eb' }}>No Lights</span>
            </div>
            <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6, maxWidth: 220 }}>
              Sistema colaborativo de reportes de cortes eléctricos en tiempo real.
            </p>
          </div>

          <div style={s.footerLinks}>
            <div style={s.footerCol}>
              <div style={s.footerColTitle}>App</div>
              <Link to={appLink} style={s.footerLink}>Mapa</Link>
              <Link to="/dashboard" style={s.footerLink}>Dashboard</Link>
              <Link to="/login" style={s.footerLink}>Iniciar sesión</Link>
            </div>
            <div style={s.footerCol}>
              <div style={s.footerColTitle}>Alertas</div>
              <a href="https://t.me/no_lights_bot" target="_blank" rel="noopener noreferrer" style={s.footerLink}>Bot de Telegram</a>
              <a href="https://t.me/no_lights_bot" target="_blank" rel="noopener noreferrer" style={s.footerLink}>@no_lights_bot</a>
            </div>
          </div>
        </div>

        <div style={s.footerBottom}>
          <span>© {new Date().getFullYear()} No Lights App · Todos los derechos reservados</span>
          <span>Hecho con ❤️ en Caracas, Venezuela · Platanus Build Night 2026</span>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: 1.5, textTransform: 'uppercase', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 20, padding: '4px 14px' }}>
        {children}
      </span>
    </div>
  )
}

function TelegramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M22 2L11 13" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
    width: '70vw', height: '70vw',
    borderRadius: '50%',
    pointerEvents: 'none', zIndex: 0,
  },

  // Nav
  nav: {
    position: 'relative', zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10 },
  navIcon: {
    width: 34, height: 34, borderRadius: 9,
    background: 'linear-gradient(135deg, #1e3a5f, #0d2040)',
    border: '1px solid rgba(59,130,246,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  },
  navBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#9ca3af', borderRadius: 10,
    padding: '8px 16px', fontSize: 13, fontWeight: 500,
    textDecoration: 'none',
  },

  // Hero
  hero: {
    position: 'relative', zIndex: 10,
    textAlign: 'center',
    padding: '72px 24px 56px',
    maxWidth: 780, margin: '0 auto',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 600,
    color: '#86efac', letterSpacing: 0.3, marginBottom: 24,
  },
  heroTitle: {
    fontSize: 'clamp(34px, 6vw, 60px)',
    fontWeight: 900, lineHeight: 1.12,
    margin: '0 0 18px', letterSpacing: -1.5,
  },
  heroSub: {
    fontSize: 16, color: '#6b7280',
    lineHeight: 1.75, margin: '0 0 32px',
  },
  heroCtas: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 12, flexWrap: 'wrap',
  },
  ctaPrimary: {
    display: 'inline-flex', alignItems: 'center',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff', borderRadius: 14,
    padding: '14px 28px', fontSize: 15, fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
    letterSpacing: 0.2,
  },
  ctaSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(42,171,238,0.08)', border: '1px solid rgba(42,171,238,0.2)',
    color: '#7dd3fc', borderRadius: 14,
    padding: '14px 22px', fontSize: 15, fontWeight: 600,
    textDecoration: 'none',
  },

  // Stats
  statsRow: {
    position: 'relative', zIndex: 10,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 1,
    maxWidth: 800, margin: '0 auto 80px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18, overflow: 'hidden',
    marginLeft: 24, marginRight: 24,
  },
  statCard: {
    padding: '28px 20px', textAlign: 'center',
    background: 'rgba(255,255,255,0.02)',
  },

  // Sections
  section: {
    position: 'relative', zIndex: 10,
    maxWidth: 960, margin: '0 auto 80px',
    padding: '0 24px',
  },
  sectionTitle: {
    fontSize: 'clamp(22px, 3vw, 34px)',
    fontWeight: 800, color: '#f9fafb',
    margin: '0 0 36px', textAlign: 'center',
    letterSpacing: -0.5,
  },

  // Steps
  stepsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  stepCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18, padding: '28px 24px',
  },
  stepNum: {
    fontSize: 11, fontWeight: 800, color: '#3b82f6',
    letterSpacing: 1, marginBottom: 14,
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 8, display: 'inline-block',
    padding: '4px 10px',
  },
  stepTitle: { fontSize: 16, fontWeight: 700, color: '#f0f0f0', margin: '0 0 8px' },
  stepDesc: { fontSize: 13, color: '#6b7280', lineHeight: 1.65, margin: 0 },

  // Features
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 16,
  },
  featureCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18, padding: '26px 22px',
  },
  featureIcon: { fontSize: 30, marginBottom: 14, display: 'block' },
  featureTitle: { fontSize: 15, fontWeight: 700, color: '#f0f0f0', margin: '0 0 8px' },
  featureDesc: { fontSize: 13, color: '#6b7280', lineHeight: 1.65, margin: 0 },

  // Testimonials
  testimonialsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 16,
  },
  testimonialCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 18, padding: '26px 22px',
  },
  testimonialText: {
    fontSize: 14, color: '#d1d5db',
    lineHeight: 1.7, margin: 0,
    fontStyle: 'italic',
  },
  testimonialAvatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },

  // Telegram section
  telegramSection: {
    position: 'relative', zIndex: 10,
    padding: '0 24px 80px',
    maxWidth: 700, margin: '0 auto',
  },
  telegramCard: {
    background: 'linear-gradient(135deg, rgba(42,171,238,0.1) 0%, rgba(33,150,243,0.05) 100%)',
    border: '1px solid rgba(42,171,238,0.2)',
    borderRadius: 24, padding: '48px 32px',
    textAlign: 'center',
    boxShadow: '0 0 60px rgba(42,171,238,0.08)',
  },
  telegramIcon: {
    width: 56, height: 56, borderRadius: 16,
    background: 'linear-gradient(145deg, #2AABEE, #1a8fd1)',
    boxShadow: '0 8px 24px rgba(42,171,238,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 20px',
  },
  telegramBtn: {
    display: 'inline-flex', alignItems: 'center',
    background: 'linear-gradient(135deg, #2AABEE, #1a8fd1)',
    color: '#fff', borderRadius: 12,
    padding: '13px 28px', fontSize: 14, fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 6px 24px rgba(42,171,238,0.4)',
    letterSpacing: 0.2,
  },

  // Final CTA
  finalCta: {
    position: 'relative', zIndex: 10,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 24px 80px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },

  // Footer
  footer: {
    position: 'relative', zIndex: 10,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.3)',
  },
  footerInner: {
    maxWidth: 960, margin: '0 auto',
    padding: '48px 32px 32px',
    display: 'flex', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 40,
  },
  footerBrand: { maxWidth: 240 },
  footerLinks: { display: 'flex', gap: 48, flexWrap: 'wrap' },
  footerCol: { display: 'flex', flexDirection: 'column', gap: 10 },
  footerColTitle: {
    fontSize: 11, fontWeight: 700, color: '#4b5563',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  footerLink: {
    fontSize: 13, color: '#6b7280',
    textDecoration: 'none',
  },
  footerBottom: {
    maxWidth: 960, margin: '0 auto',
    padding: '20px 32px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    display: 'flex', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
    fontSize: 11, color: '#374151',
  },

  // Mockup
  mockupWrapper: {
    position: 'relative',
    display: 'inline-block',
  },
  phoneGlow: {
    position: 'absolute',
    inset: '-20%',
    background: 'radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)',
    zIndex: 0, pointerEvents: 'none',
    borderRadius: '50%',
  },
  phone: {
    position: 'relative', zIndex: 1,
    width: 260, borderRadius: 36,
    background: '#111',
    border: '2px solid rgba(255,255,255,0.1)',
    padding: '16px 10px 20px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  phoneSpeaker: {
    width: 50, height: 5, borderRadius: 10,
    background: 'rgba(255,255,255,0.12)',
    margin: '0 auto 12px',
  },
  phoneScreen: {
    borderRadius: 24, overflow: 'hidden',
    height: 420,
  },
  phoneHome: {
    width: 90, height: 4, borderRadius: 10,
    background: 'rgba(255,255,255,0.15)',
    margin: '14px auto 0',
  },
  mapBg: {
    width: '100%', height: '100%',
    background: 'linear-gradient(160deg, #0d1b2e 0%, #0a1520 50%, #0d1f35 100%)',
    position: 'relative', overflow: 'hidden',
  },
  mockSearchBar: {
    position: 'absolute', top: 10, left: 10, right: 10,
    background: 'rgba(10,10,10,0.9)',
    borderRadius: 12, padding: '7px 12px',
    display: 'flex', alignItems: 'center', gap: 6,
    border: '1px solid rgba(255,255,255,0.07)',
  },
  mockBadge: {
    position: 'absolute', top: 46, left: 10,
    background: 'rgba(10,10,10,0.85)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, padding: '4px 8px',
    fontSize: 9, color: '#e5e7eb', fontWeight: 600,
  },
  mockCircle: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 140, height: 140, borderRadius: '50%',
    border: '2px dashed rgba(59,130,246,0.6)',
    background: 'rgba(59,130,246,0.07)',
  },
  mockDot: {
    position: 'absolute',
    width: 10, height: 10, borderRadius: '50%',
    background: '#fbbf24',
    border: '2px solid #ea580c',
    boxShadow: '0 0 8px rgba(251,191,36,0.6)',
    transform: 'translate(-50%, -50%)',
  },
  mockFab: {
    position: 'absolute', bottom: 16,
    left: '50%', transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #ea580c, #dc2626)',
    color: '#fff', borderRadius: 20,
    padding: '9px 18px', fontSize: 10, fontWeight: 700,
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(234,88,12,0.5)',
  },
}
