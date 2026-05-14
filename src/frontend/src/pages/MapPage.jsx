import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useAuth } from '../contexts/AuthContext'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

const API_BASE = '/api'
const RADIUS_METERS = 500
const ALERT_THRESHOLD = 3
const DEFAULT_CENTER = [-66.9036, 10.4806] // Caracas

const NORMAL_COLOR = '#3b82f6'
const ALERT_COLOR  = '#ef4444'

function buildCircleGeoJSON(center, radiusMeters, steps = 72) {
  const [lng, lat] = center
  const latRad = (lat * Math.PI) / 180
  const dLng = radiusMeters / (111320 * Math.cos(latRad))
  const dLat = radiusMeters / 111320
  const coords = Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * (2 * Math.PI)
    return [lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]
  })
  coords.push(coords[0])
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } }
}

export default function MapPage() {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const centerRef     = useRef(DEFAULT_CENTER)
  const searchTimerRef = useRef(null)

  const { user } = useAuth()
  // Usa el ID único de Google (sub) como identificador del usuario en Redis
  const usuarioId = user?.sub ?? user?.email
  // Clave de localStorage por usuario para soportar múltiples cuentas en el mismo browser
  const reportKey = `has_active_report_${usuarioId}`

  const [hasActiveReport, setHasActiveReport] = useState(
    () => localStorage.getItem(`has_active_report_${user?.sub ?? user?.email}`) === 'true'
  )
  const [reportCount,   setReportCount]   = useState(0)
  const [reporting,     setReporting]     = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [suggestions,   setSuggestions]   = useState([])
  const [hoveredIdx,    setHoveredIdx]    = useState(-1)
  const isAlert = reportCount >= ALERT_THRESHOLD

  // ─── Consulta API ─────────────────────────────────────────────────────────

  const queryRadius = useCallback(async (coords) => {
    try {
      const res = await fetch(`${API_BASE}/consultar-radio?lon=${coords[0]}&lat=${coords[1]}`)
      if (!res.ok) return
      const { count, points } = await res.json()
      setReportCount(count)
      mapRef.current?.getSource('outage-points')?.setData({
        type: 'FeatureCollection',
        features: points.map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.longitud, p.latitud] },
          properties: { usuario_id: p.usuario_id },
        })),
      })
    } catch { /* servidor no disponible aún */ }
  }, [])

  // ─── Inicialización del mapa ──────────────────────────────────────────────

  useEffect(() => {
    if (mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DEFAULT_CENTER,
      zoom: 14,
    })
    mapRef.current = map
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => {
          const pos = [coords.longitude, coords.latitude]
          centerRef.current = pos
          map.flyTo({ center: pos, zoom: 15 })
          updateCircle(pos)
          queryRadius(pos)
        },
        () => queryRadius(centerRef.current),
        { timeout: 5000 },
      )

      map.addSource('radius-circle', {
        type: 'geojson',
        data: buildCircleGeoJSON(DEFAULT_CENTER, RADIUS_METERS),
      })
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: { 'fill-color': NORMAL_COLOR, 'fill-opacity': 0.1 },
      })
      map.addLayer({
        id: 'radius-outline',
        type: 'line',
        source: 'radius-circle',
        paint: { 'line-color': NORMAL_COLOR, 'line-width': 2, 'line-opacity': 0.8,
                 'line-dasharray': [2, 1] },
      })

      map.addSource('outage-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'outage-points-halo',
        type: 'circle',
        source: 'outage-points',
        paint: { 'circle-radius': 16, 'circle-color': '#f97316', 'circle-opacity': 0.18, 'circle-blur': 1 },
      })
      map.addLayer({
        id: 'outage-points',
        type: 'circle',
        source: 'outage-points',
        paint: {
          'circle-radius': 7,
          'circle-color': '#fbbf24',
          'circle-stroke-color': '#ea580c',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      })

      queryRadius(centerRef.current)
    })

    map.on('moveend', () => {
      const { lng, lat } = map.getCenter()
      const pos = [lng, lat]
      centerRef.current = pos
      updateCircle(pos)
      queryRadius(pos)
    })

    return () => { map.remove(); mapRef.current = null }
  }, [queryRadius])

  function updateCircle(pos) {
    mapRef.current?.getSource('radius-circle')?.setData(buildCircleGeoJSON(pos, RADIUS_METERS))
  }

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const color = isAlert ? ALERT_COLOR : NORMAL_COLOR
    map.setPaintProperty('radius-fill', 'fill-color', color)
    map.setPaintProperty('radius-outline', 'line-color', color)
  }, [isAlert])

  // ─── Búsqueda Photon ──────────────────────────────────────────────────────

  function getPlaceLabel(f) {
    const { name, street, housenumber, city, state, country } = f.properties
    return [name || [street, housenumber].filter(Boolean).join(' '), city, state, country]
      .filter(Boolean).join(', ')
  }

  function handleSearchInput(e) {
    const v = e.target.value
    setSearchQuery(v)
    clearTimeout(searchTimerRef.current)
    if (v.length < 3) { setSuggestions([]); return }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(v)}&limit=6`)
        setSuggestions((await r.json()).features ?? [])
      } catch { setSuggestions([]) }
    }, 350)
  }

  function selectSuggestion(f) {
    const pos = [f.geometry.coordinates[0], f.geometry.coordinates[1]]
    centerRef.current = pos
    setSearchQuery(getPlaceLabel(f))
    setSuggestions([])
    setHoveredIdx(-1)
    mapRef.current?.flyTo({ center: pos, zoom: 15 })
    updateCircle(pos)
    queryRadius(pos)
  }

  // ─── Reportar / cancelar ──────────────────────────────────────────────────

  async function sendReport(longitud, latitud, tiene_luz) {
    const res = await fetch(`${API_BASE}/reportar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, longitud, latitud, tiene_luz }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }

  async function toggleReport() {
    if (reporting) return
    setReporting(true)

    if (hasActiveReport) {
      const [lon, lat] = centerRef.current
      try {
        await sendReport(lon, lat, true)
        setHasActiveReport(false)
        localStorage.setItem(reportKey, 'false')
        await queryRadius(centerRef.current)
      } catch (e) { console.error(e) }
      finally { setReporting(false) }
      return
    }

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.')
      setReporting(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const pos = [coords.longitude, coords.latitude]
        centerRef.current = pos
        mapRef.current?.flyTo({ center: pos, zoom: 15 })
        updateCircle(pos)
        try {
          await sendReport(pos[0], pos[1], false)
          setHasActiveReport(true)
          localStorage.setItem(reportKey, 'true')
          await queryRadius(pos)
        } catch (e) { console.error(e) }
        finally { setReporting(false) }
      },
      (e) => { console.error(e); setReporting(false) },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const fabColor  = hasActiveReport ? '#16a34a' : '#ea580c'
  const fabShadow = hasActiveReport ? 'rgba(22,163,74,0.45)' : 'rgba(234,88,12,0.45)'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Search */}
      <div style={{ position: 'absolute', top: 16, left: 68, right: 60, zIndex: 20 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar dirección…"
            value={searchQuery}
            onChange={handleSearchInput}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%',
              padding: '11px 16px 11px 38px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              outline: 'none',
              fontSize: 14,
              background: 'rgba(10,10,10,0.9)',
              color: '#e5e7eb',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
              WebkitTapHighlightColor: 'transparent',
              boxSizing: 'border-box',
            }}
          />
        </div>
        {suggestions.length > 0 && (
          <ul style={{
            listStyle: 'none', margin: '6px 0 0', padding: 0,
            background: 'rgba(12,12,12,0.97)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            backdropFilter: 'blur(16px)',
          }}>
            {suggestions.map((f, i) => (
              <li
                key={i}
                onMouseDown={() => selectSuggestion(f)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(-1)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '11px 16px',
                  cursor: 'pointer', fontSize: 13, color: '#d1d5db',
                  lineHeight: 1.4,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: hoveredIdx === i ? 'rgba(59,130,246,0.12)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ flexShrink: 0, opacity: 0.6, marginTop: 1 }}>📍</span>
                {getPlaceLabel(f)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Badge */}
      <div style={{
        position: 'absolute', top: 72, left: 68, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 13px', borderRadius: 10,
        background: isAlert ? 'rgba(239,68,68,0.9)' : 'rgba(10,10,10,0.85)',
        border: `1px solid ${isAlert ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}`,
        color: '#f9fafb', fontSize: 13, fontWeight: 600,
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease',
      }}>
        {isAlert && <span style={{ fontSize: 13 }}>⚡</span>}
        <span>{isAlert ? 'ALERTA — ' : ''}{reportCount} reporte{reportCount !== 1 ? 's' : ''} · 500 m</span>
      </div>

      {/* FAB */}
      <button
        onClick={toggleReport}
        disabled={reporting}
        style={{
          position: 'absolute',
          bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: `linear-gradient(135deg, ${fabColor}, ${fabColor}cc)`,
          color: '#fff',
          border: 'none',
          borderRadius: 50,
          padding: '16px 36px',
          fontSize: 15,
          fontWeight: 700,
          cursor: reporting ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: 0.3,
          boxShadow: `0 8px 28px ${fabShadow}, 0 2px 8px rgba(0,0,0,0.3)`,
          opacity: reporting ? 0.65 : 1,
          transition: 'opacity 0.2s, box-shadow 0.3s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {reporting
          ? hasActiveReport ? 'Enviando…' : '📍 Obteniendo ubicación…'
          : hasActiveReport ? '💡 Ya tengo luz' : '⚡ Reportar Corte de Luz'}
      </button>
    </div>
  )
}
