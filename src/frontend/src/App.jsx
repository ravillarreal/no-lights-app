import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const RADIUS_METERS = 500
const ALERT_THRESHOLD = 3
const DEFAULT_CENTER = [-58.3816, -34.6037] // Buenos Aires — cambiar según tu ciudad

// Genera un polígono GeoJSON circular con N vértices usando trigonometría esférica simplificada
function buildCircleGeoJSON(center, radiusMeters, steps = 72) {
  const [lng, lat] = center
  const latRad = (lat * Math.PI) / 180
  const dLng = radiusMeters / (111320 * Math.cos(latRad))
  const dLat = radiusMeters / 111320
  const coords = Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * (2 * Math.PI)
    return [lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]
  })
  coords.push(coords[0]) // cerrar polígono
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } }
}

const NORMAL_COLOR = '#2196f3'
const ALERT_COLOR = '#f44336'

export default function App() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const centerRef = useRef(DEFAULT_CENTER)
  const [usuarioId] = useState(() => {
    let id = localStorage.getItem('usuario_id')
    if (!id) {
      id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
      localStorage.setItem('usuario_id', id)
    }
    return id
  })
  const [hasActiveReport, setHasActiveReport] = useState(
    () => localStorage.getItem('has_active_report') === 'true'
  )
  const [reportCount, setReportCount] = useState(0)
  const [reporting, setReporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [hoveredIdx, setHoveredIdx] = useState(-1)
  const searchTimerRef = useRef(null)
  const isAlert = reportCount >= ALERT_THRESHOLD

  // ─── API helpers ──────────────────────────────────────────────────────────

  const queryRadius = useCallback(async (coords) => {
    try {
      const res = await fetch(`${API_BASE}/consultar-radio?lon=${coords[0]}&lat=${coords[1]}`)
      if (!res.ok) return
      const { count, points } = await res.json()
      setReportCount(count)

      const geojson = {
        type: 'FeatureCollection',
        features: points.map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.longitud, p.latitud] },
          properties: { usuario_id: p.usuario_id },
        })),
      }
      mapRef.current?.getSource('outage-points')?.setData(geojson)
    } catch {
      // silenciar errores de red — el servidor puede no estar listo aún
    }
  }, [])

  // ─── Inicialización del mapa ───────────────────────────────────────────────

  useEffect(() => {
    if (mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DEFAULT_CENTER,
      zoom: 14,
    })
    mapRef.current = map

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      // Geolocalización del usuario
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => {
          const pos = [coords.longitude, coords.latitude]
          centerRef.current = pos
          map.flyTo({ center: pos, zoom: 14 })
          updateCircle(pos)
          queryRadius(pos)
        },
        () => queryRadius(centerRef.current),
        { timeout: 5000 }
      )

      // Source y layers del círculo de radio
      map.addSource('radius-circle', {
        type: 'geojson',
        data: buildCircleGeoJSON(DEFAULT_CENTER, RADIUS_METERS),
      })

      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: { 'fill-color': NORMAL_COLOR, 'fill-opacity': 0.12 },
      })

      map.addLayer({
        id: 'radius-outline',
        type: 'line',
        source: 'radius-circle',
        paint: { 'line-color': NORMAL_COLOR, 'line-width': 2.5, 'line-opacity': 0.85 },
      })

      // Puntos individuales de reportes dentro del radio
      map.addSource('outage-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'outage-points-halo',
        type: 'circle',
        source: 'outage-points',
        paint: {
          'circle-radius': 14,
          'circle-color': '#ff6d00',
          'circle-opacity': 0.2,
          'circle-blur': 0.8,
        },
      })

      map.addLayer({
        id: 'outage-points',
        type: 'circle',
        source: 'outage-points',
        paint: {
          'circle-radius': 7,
          'circle-color': '#ffeb3b',
          'circle-stroke-color': '#e65100',
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

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [queryRadius])

  // ─── Actualizar posición del círculo ──────────────────────────────────────

  function updateCircle(pos) {
    mapRef.current?.getSource('radius-circle')?.setData(
      buildCircleGeoJSON(pos, RADIUS_METERS)
    )
  }

  // ─── Cambiar color del círculo según estado de alerta ─────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const color = isAlert ? ALERT_COLOR : NORMAL_COLOR
    map.setPaintProperty('radius-fill', 'fill-color', color)
    map.setPaintProperty('radius-outline', 'line-color', color)
  }, [isAlert])

  // ─── Búsqueda de direcciones (Photon / OpenStreetMap — gratuito, sin API key) ──

  function getPlaceLabel(feature) {
    const { name, street, housenumber, city, state, country } = feature.properties
    const street_full = [street, housenumber].filter(Boolean).join(' ')
    return [name || street_full, city, state, country].filter(Boolean).join(', ')
  }

  function handleSearchInput(e) {
    const value = e.target.value
    setSearchQuery(value)
    clearTimeout(searchTimerRef.current)
    if (value.length < 3) { setSuggestions([]); return }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=6`,
        )
        const data = await res.json()
        setSuggestions(data.features ?? [])
      } catch {
        setSuggestions([])
      }
    }, 350)
  }

  function selectSuggestion(feature) {
    const [lon, lat] = feature.geometry.coordinates
    const pos = [lon, lat]
    centerRef.current = pos
    setSearchQuery(getPlaceLabel(feature))
    setSuggestions([])
    setHoveredIdx(-1)
    mapRef.current?.flyTo({ center: pos, zoom: 15 })
    updateCircle(pos)
    queryRadius(pos)
  }

  // ─── Reporte / cancelar reporte ──────────────────────────────────────────

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

    // "Ya tengo luz" — no necesita GPS, el backend solo usa usuario_id para zrem
    if (hasActiveReport) {
      const [longitud, latitud] = centerRef.current
      try {
        await sendReport(longitud, latitud, true)
        setHasActiveReport(false)
        localStorage.setItem('has_active_report', 'false')
        await queryRadius(centerRef.current)
      } catch (err) {
        console.error('Error al cancelar reporte:', err)
      } finally {
        setReporting(false)
      }
      return
    }

    // "Reportar corte" — pide GPS real antes de enviar
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
          localStorage.setItem('has_active_report', 'true')
          await queryRadius(pos)
        } catch (err) {
          console.error('Error al reportar:', err)
        } finally {
          setReporting(false)
        }
      },
      (err) => {
        console.error('GPS denegado o timeout:', err)
        setReporting(false)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      <div ref={containerRef} style={styles.map} />

      {/* Barra de búsqueda */}
      <div style={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Buscar dirección…"
          value={searchQuery}
          onChange={handleSearchInput}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          style={styles.searchInput}
          autoComplete="off"
          spellCheck={false}
        />
        {suggestions.length > 0 && (
          <ul style={styles.suggestionList}>
            {suggestions.map((f, i) => (
              <li
                key={i}
                onMouseDown={() => selectSuggestion(f)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(-1)}
                style={{
                  ...styles.suggestionItem,
                  background: hoveredIdx === i ? 'rgba(255,255,255,0.09)' : 'transparent',
                }}
              >
                <span style={styles.suggestionIcon}>📍</span>
                {getPlaceLabel(f)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Badge contador */}
      <div style={{ ...styles.badge, background: isAlert ? 'rgba(244,67,54,0.92)' : 'rgba(18,18,18,0.82)' }}>
        {isAlert && <span style={styles.alertIcon}>⚡</span>}
        <span>
          {isAlert ? 'ALERTA — ' : ''}
          {reportCount} reporte{reportCount !== 1 ? 's' : ''} en 500 m
        </span>
      </div>

      {/* Botón flotante — cambia según estado del reporte activo */}
      <button
        onClick={toggleReport}
        disabled={reporting}
        style={{
          ...(hasActiveReport ? styles.fabLight : styles.fab),
          opacity: reporting ? 0.6 : 1,
        }}
      >
        {reporting
          ? hasActiveReport ? 'Enviando…' : '📍 Obteniendo ubicación…'
          : hasActiveReport ? '💡 Ya tengo luz' : '⚡ Reportar Corte de Luz'}
      </button>
    </div>
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  map: { width: '100%', height: '100%' },
  searchWrapper: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 56,           // deja espacio para los controles de navegación de Mapbox
    zIndex: 10,
  },
  searchInput: {
    width: '100%',
    padding: '11px 16px',
    borderRadius: 24,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    background: 'rgba(18,18,18,0.88)',
    color: '#fff',
    boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)',
    WebkitTapHighlightColor: 'transparent',
  },
  suggestionList: {
    listStyle: 'none',
    background: 'rgba(22,22,22,0.97)',
    borderRadius: 12,
    marginTop: 6,
    boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: 13,
    color: '#e0e0e0',
    lineHeight: 1.4,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.12s ease',
  },
  suggestionIcon: { flexShrink: 0, marginTop: 1 },
  badge: {
    position: 'absolute',
    top: 72,             // debajo de la barra de búsqueda
    left: 16,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#fff',
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.3,
    boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
    transition: 'background 0.35s ease',
    backdropFilter: 'blur(4px)',
  },
  alertIcon: { fontSize: 16 },
  fab: {
    position: 'absolute',
    // env(safe-area-inset-bottom) cubre notch/gestures en Android e iOS
    bottom: 'calc(36px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    background: 'linear-gradient(135deg, #ff6d00, #ff3d00)',
    color: '#fff',
    border: 'none',
    borderRadius: 28,
    padding: '15px 32px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    letterSpacing: 0.4,
    boxShadow: '0 6px 20px rgba(255,61,0,0.5)',
    transition: 'opacity 0.2s ease, transform 0.15s ease',
    WebkitTapHighlightColor: 'transparent',
  },
  fabLight: {
    position: 'absolute',
    bottom: 'calc(36px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
    color: '#fff',
    border: 'none',
    borderRadius: 28,
    padding: '15px 32px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    letterSpacing: 0.4,
    boxShadow: '0 6px 20px rgba(46,125,50,0.55)',
    transition: 'opacity 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  },
}
