import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  function handleSuccess(cred) {
    login(jwtDecode(cred.credential))
    navigate('/mapa', { replace: true })
  }

  return (
    <div style={s.root}>
      {/* Background blobs */}
      <div style={{ ...s.blob, top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(33,150,243,0.15) 0%, transparent 70%)' }} />
      <div style={{ ...s.blob, bottom: '-20%', right: '-10%', background: 'radial-gradient(circle, rgba(244,67,54,0.1) 0%, transparent 70%)' }} />

      <div style={s.card}>
        <div style={s.iconWrapper}>
          <span style={{ fontSize: 40 }}>⚡</span>
        </div>

        <h1 style={s.title}>No Lights</h1>
        <p style={s.subtitle}>
          Sistema de reportes de cortes de luz<br />en tiempo real
        </p>

        <div style={s.divider} />

        <p style={s.hint}>Ingresa con tu cuenta de Google para continuar</p>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.error('Google login failed')}
            theme="filled_black"
            shape="pill"
            size="large"
            locale="es"
          />
        </div>

        <p style={s.footer}>
          Tus reportes ayudan a mapear cortes en tu comunidad
        </p>
      </div>
    </div>
  )
}

const s = {
  root: {
    width: '100vw',
    height: '100dvh',
    background: 'linear-gradient(160deg, #080c14 0%, #0d1117 50%, #0a0e18 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: '60vw',
    height: '60vw',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 28,
    padding: '52px 44px 40px',
    maxWidth: 400,
    width: '88%',
    textAlign: 'center',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    position: 'relative',
    zIndex: 1,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    background: 'linear-gradient(135deg, #1a2a4a, #0d1f3c)',
    border: '1px solid rgba(33,150,243,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 8px 32px rgba(33,150,243,0.2)',
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 800,
    margin: '0 0 10px',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    margin: '0 0 28px',
    lineHeight: 1.6,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '0 0 24px',
  },
  hint: {
    color: '#4b5563',
    fontSize: 13,
    margin: '0 0 20px',
  },
  footer: {
    color: '#374151',
    fontSize: 12,
    margin: '24px 0 0',
    lineHeight: 1.5,
  },
}
