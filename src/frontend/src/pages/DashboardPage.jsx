import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const API = '/api'

const DAYS_OPTIONS  = [{ label: '7 días', value: 7 }, { label: '30 días', value: 30 }, { label: '90 días', value: 90 }]
const ZONE_OPTIONS  = [
  { label: 'Barrio',    value: 'neighborhood' },
  { label: 'Municipio', value: 'municipality' },
  { label: 'Estado',    value: 'state' },
]

export default function DashboardPage() {
  const [days,     setDays]     = useState(30)
  const [zoneField,setZoneField]= useState('neighborhood')
  const [summary,  setSummary]  = useState(null)
  const [byDay,    setByDay]    = useState([])
  const [byZone,   setByZone]   = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/stats/summary?days=${days}`).then(r => r.json()),
      fetch(`${API}/stats/by-day?days=${days}`).then(r => r.json()),
      fetch(`${API}/stats/by-zone?field=${zoneField}&days=${days}&limit=10`).then(r => r.json()),
    ])
      .then(([s, d, z]) => { setSummary(s); setByDay(d); setByZone(z) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [days, zoneField])

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.subtitle}>Histórico de cortes de luz</p>
        </div>
        <div style={s.filters}>
          <FilterGroup
            options={DAYS_OPTIONS}
            value={days}
            onChange={setDays}
          />
          <FilterGroup
            options={ZONE_OPTIONS}
            value={zoneField}
            onChange={setZoneField}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div style={s.kpiRow}>
        <KPICard icon="⚡" label="Cortes totales"    value={summary?.total_completed  ?? '—'} color="#3b82f6" loading={loading} />
        <KPICard icon="⏱" label="Duración promedio" value={summary?.avg_duration_min ? `${summary.avg_duration_min} min` : '—'} color="#a855f7" loading={loading} />
        <KPICard icon="🔴" label="Cortes activos"   value={summary?.active_outages   ?? '—'} color="#ef4444" loading={loading} />
        <KPICard icon="📍" label="Zonas afectadas"  value={summary?.affected_zones   ?? '—'} color="#f59e0b" loading={loading} />
      </div>

      {/* Charts */}
      <div style={s.chartsRow}>
        {/* Timeline */}
        <div style={s.chartCard}>
          <h2 style={s.chartTitle}>Cortes por día</h2>
          {byDay.length === 0 && !loading
            ? <EmptyState />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={byDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13 }}
                    labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#e5e7eb' }}
                    formatter={(v, n) => [v, n === 'outages' ? 'Cortes' : 'Min promedio']}
                  />
                  <Area type="monotone" dataKey="outages" stroke="#3b82f6" strokeWidth={2} fill="url(#blueGrad)" dot={false} activeDot={{ r: 5, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* By zone */}
        <div style={s.chartCard}>
          <h2 style={s.chartTitle}>Top {ZONE_OPTIONS.find(o => o.value === zoneField)?.label}s</h2>
          {byZone.length === 0 && !loading
            ? <EmptyState />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byZone} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="zone" width={110} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.length > 16 ? v.slice(0, 15) + '…' : v} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13 }}
                    labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#e5e7eb' }}
                    formatter={(v, n) => [v, n === 'outages' ? 'Cortes' : 'Min promedio']}
                  />
                  <Bar dataKey="outages" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={20} activeBar={{ fill: '#60a5fa' }} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Duration chart */}
      {byDay.length > 0 && (
        <div style={{ ...s.chartCard, marginTop: 16 }}>
          <h2 style={s.chartTitle}>Duración promedio por día (minutos)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={byDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13 }}
                labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#e5e7eb' }}
                formatter={v => [`${v} min`, 'Duración promedio']}
              />
              <Area type="monotone" dataKey="avg_duration_min" stroke="#a855f7" strokeWidth={2} fill="url(#purpleGrad)" dot={false} activeDot={{ r: 5, fill: '#a855f7' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ icon, label, value, color, loading }) {
  return (
    <div style={s.kpiCard}>
      <div style={{ ...s.kpiIcon, background: `${color}18`, border: `1px solid ${color}30` }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: loading ? '#333' : '#f9fafb', letterSpacing: -0.5, lineHeight: 1 }}>
          {loading ? '…' : value}
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            background: value === o.value ? 'rgba(59,130,246,0.2)' : 'transparent',
            border: `1px solid ${value === o.value ? 'rgba(59,130,246,0.4)' : 'transparent'}`,
            color: value === o.value ? '#93c5fd' : '#6b7280',
            borderRadius: 7,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: value === o.value ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#374151' }}>
      <span style={{ fontSize: 36 }}>📭</span>
      <p style={{ fontSize: 13, margin: 0 }}>Sin datos para este período</p>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100%',
    background: '#080c10',
    padding: '80px 24px 40px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  title: {
    color: '#f9fafb',
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    margin: '4px 0 0',
  },
  filters: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: '20px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  kpiIcon: {
    width: 48, height: 48,
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16,
  },
  chartCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: '20px 20px 16px',
  },
  chartTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: 600,
    margin: '0 0 16px',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
}
