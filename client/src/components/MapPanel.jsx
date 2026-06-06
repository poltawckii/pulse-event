import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './MapPanel.module.css'

const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY

const CATEGORY_ICONS = {
  concert:           { emoji: '🎤', color: '#e53935' },
  music:             { emoji: '🎵', color: '#3949ab' },
  theater:           { emoji: '🎭', color: '#8e24aa' },
  exhibition:        { emoji: '🖼️', color: '#fb8c00' },
  cinema:            { emoji: '🎬', color: '#37474f' },
  festival:          { emoji: '🎪', color: '#e67e22' },
  sport:             { emoji: '⚽', color: '#43a047' },
  education:         { emoji: '📚', color: '#1e88e5' },
  tour:              { emoji: '🗺️', color: '#00897b' },
  party:             { emoji: '🎉', color: '#f9a825' },
  kids:              { emoji: '🧸', color: '#e91e63' },
  quest:             { emoji: '🔍', color: '#6d4c41' },
  entertainment:     { emoji: '🎡', color: '#ff5722' },
  recreation:        { emoji: '🏃', color: '#66bb6a' },
  standup:           { emoji: '🎙️', color: '#7b1fa2' },
  art:               { emoji: '🎨', color: '#d81b60' },
  holiday:           { emoji: '🎊', color: '#f9a825' },
  shopping:          { emoji: '🛍️', color: '#00acc1' },
  photo:             { emoji: '📷', color: '#546e7a' },
  'social-activity': { emoji: '🤝', color: '#26a69a' },
  fashion:           { emoji: '👗', color: '#ec407a' },
  food:              { emoji: '🍴', color: '#ff7043' },
  health:            { emoji: '💊', color: '#00897b' },
  dance:             { emoji: '💃', color: '#ab47bc' },
  default:           { emoji: '📍', color: '#2c6e6f' },
}

function getCategoryIcon(categories) {
  if (!Array.isArray(categories)) return CATEGORY_ICONS.default
  for (const cat of categories) {
    if (CATEGORY_ICONS[cat]) return CATEGORY_ICONS[cat]
  }
  return CATEGORY_ICONS.default
}

function MapPanel({
  center,
  radiusKm,
  events = [],
  showHeader = true,
  mapHeight = 320,
  className = '',
  resizeKey,
  isFullScreen = false,
  eventsVersion = 0,
  onSelectEvent,
}) {
  const mapRef = useRef(null)
  const mapCardRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const placemarkRef = useRef(null)
  const circleRef = useRef(null)
  const eventsLayerRef = useRef(null)
  const onSelectEventRef = useRef(onSelectEvent)
  const layoutCacheRef = useRef(new Map())
  const [status, setStatus] = useState('idle')
  const [mapReadyTick, setMapReadyTick] = useState(0)
  const [clusterMenu, setClusterMenu] = useState(null)

  useEffect(() => { onSelectEventRef.current = onSelectEvent }, [onSelectEvent])

  const heightValue = typeof mapHeight === 'number' ? `${mapHeight}px` : mapHeight
  const mapStyle = { height: '100%' }
  const cardStyle = { height: heightValue, minHeight: heightValue }
  const wrapperStyle = heightValue === '100%' ? { height: '100%' } : undefined

  const getIconLayout = useCallback((emoji, color) => {
    const key = `${emoji}:${color}`
    if (!layoutCacheRef.current.has(key)) {
      const layout = window.ymaps.templateLayoutFactory.createClass(
        `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${color};
          display:flex;align-items:center;justify-content:center;
          font-size:17px;line-height:1;
          box-shadow:0 2px 8px rgba(0,0,0,.28);
          border:2.5px solid #fff;
          margin-left:-18px;margin-top:-18px;
          cursor:pointer;
          user-select:none;
        ">${emoji}</div>`
      )
      layoutCacheRef.current.set(key, layout)
    }
    return layoutCacheRef.current.get(key)
  }, [])

  const geoToContainerPx = useCallback((coords) => {
    const map = mapInstanceRef.current
    if (!map) return null
    const projection = map.options.get('projection')
    const zoom = map.getZoom()
    const globalCenter = projection.toGlobalPixels(map.getCenter(), zoom)
    const globalPoint = projection.toGlobalPixels(coords, zoom)
    const size = map.container.getSize()
    return [
      Math.round(size[0] / 2 + (globalPoint[0] - globalCenter[0])),
      Math.round(size[1] / 2 + (globalPoint[1] - globalCenter[1])),
    ]
  }, [])

  const renderEventMarkers = useCallback(() => {
    if (!eventsLayerRef.current || status !== 'ready') return

    eventsLayerRef.current.removeAll()

    const placemarks = events
      .filter((event) => Array.isArray(event.coords))
      .map((event) => {
        const { emoji, color } = getCategoryIcon(event.categories)
        const placemark = new window.ymaps.Placemark(
          event.coords,
          { hintContent: event.title },
          {
            iconLayout: getIconLayout(emoji, color),
            iconShape: { type: 'Circle', coordinates: [0, 0], radius: 18 },
            openBalloonOnClick: false,
          }
        )
        placemark._mapEvent = event
        placemark.events.add('click', () => {
          setClusterMenu(null)
          onSelectEventRef.current?.(event)
        })
        return placemark
      })

    eventsLayerRef.current.add(placemarks)
  }, [events, status, getIconLayout])

  const forceRelayout = () => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current
    map.container.fitToViewport()
    map.setCenter(map.getCenter(), map.getZoom(), { duration: 0 })
  }

  useEffect(() => {
    if (!apiKey) { setStatus('missing-key'); return undefined }

    let mapInstance = null
    const scriptId = 'yandex-maps-script'

    const initMap = () => {
      if (!window.ymaps || !mapRef.current) return
      window.ymaps.ready(() => {
        mapInstance = new window.ymaps.Map(mapRef.current, {
          center,
          zoom: 12,
          controls: ['zoomControl', 'geolocationControl'],
        })
        mapInstanceRef.current = mapInstance

        placemarkRef.current = new window.ymaps.Placemark(center, {
          balloonContent: 'Текущее местоположение',
        })
        mapInstance.geoObjects.add(placemarkRef.current)

        circleRef.current = new window.ymaps.Circle(
          [center, radiusKm * 1000],
          { hintContent: `Радиус ${radiusKm} км` },
          { fillColor: 'rgba(59,139,140,0.25)', strokeColor: '#2c6e6f', strokeWidth: 2 }
        )
        mapInstance.geoObjects.add(circleRef.current)

        const clusterer = new window.ymaps.Clusterer({
          preset: 'islands#darkGreenClusterIcons',
          groupByCoordinates: false,
          clusterDisableClickZoom: true,
          clusterOpenBalloonOnClick: false,
        })

        clusterer.events.add('click', (e) => {
          const target = e.get('target')
          if (typeof target.getGeoObjects !== 'function') return

          const geoObjects = target.getGeoObjects()
          const clusterEvents = geoObjects.map((pm) => pm._mapEvent).filter(Boolean)
          if (!clusterEvents.length) return

          const coords = geoObjects.map((pm) => pm.geometry.getCoordinates())
          const [lat0, lng0] = coords[0]
          const allSameLocation = coords.every(
            ([lat, lng]) => Math.abs(lat - lat0) < 0.0001 && Math.abs(lng - lng0) < 0.0001
          )

          if (allSameLocation) {
            const pos = geoToContainerPx(target.geometry.getCoordinates())
            if (!pos) return

            const POPUP_W = 230
            const POPUP_H_EST = 280
            const MARGIN = 10
            const containerW = mapCardRef.current?.offsetWidth || 500
            const containerH = mapCardRef.current?.offsetHeight || 500

            // Зажимаем x, чтобы popup не вылетел за края
            const clampedX = Math.max(
              POPUP_W / 2 + MARGIN,
              Math.min(pos[0], containerW - POPUP_W / 2 - MARGIN)
            )

            // Сдвигаем стрелку внутри popup, чтобы она всё равно указывала на кластер
            const arrowShift = pos[0] - clampedX          // смещение в px относительно центра
            const arrowLeftPct = 50 + (arrowShift / POPUP_W) * 100
            const arrowLeft = Math.max(12, Math.min(arrowLeftPct, 88)) // не выходит за края popup

            const above = pos[1] - POPUP_H_EST - 16 > MARGIN
            const clampedY = Math.min(Math.max(pos[1], MARGIN), containerH - MARGIN)

            setClusterMenu({ events: clusterEvents, x: clampedX, y: clampedY, above, arrowLeft })
          } else {
            setClusterMenu(null)
            mapInstance.setBounds(target.getBounds(), { checkZoomRange: true, zoomMargin: 40 })
          }
        })

        mapInstance.events.add('click', () => setClusterMenu(null))
        mapInstance.events.add('boundschange', () => setClusterMenu(null))

        eventsLayerRef.current = clusterer
        mapInstance.geoObjects.add(clusterer)

        setStatus('ready')
        setMapReadyTick((prev) => prev + 1)
      })
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=en_US`
      script.async = true
      script.onload = initMap
      script.onerror = () => setStatus('error')
      document.body.appendChild(script)
    } else {
      initMap()
    }

    return () => { if (mapInstance) mapInstance.destroy() }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || status !== 'ready') return
    mapInstanceRef.current.setCenter(center, mapInstanceRef.current.getZoom())
    if (placemarkRef.current) placemarkRef.current.geometry.setCoordinates(center)
    if (circleRef.current) {
      circleRef.current.geometry.setCoordinates(center)
      circleRef.current.geometry.setRadius(radiusKm * 1000)
    }
  }, [center, radiusKm, status])

  useEffect(() => { renderEventMarkers() }, [renderEventMarkers, eventsVersion, mapReadyTick])

  useEffect(() => {
    if (status !== 'ready') return
    const t1 = window.setTimeout(() => renderEventMarkers(), 120)
    const t2 = window.setTimeout(() => renderEventMarkers(), 320)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [isFullScreen, mapReadyTick, renderEventMarkers, status])

  useEffect(() => {
    if (!mapInstanceRef.current || status !== 'ready') return
    const raf1 = window.requestAnimationFrame(() => {
      forceRelayout()
      window.requestAnimationFrame(forceRelayout)
    })
    const t1 = window.setTimeout(() => forceRelayout(), 80)
    const t2 = window.setTimeout(() => forceRelayout(), 200)
    return () => { window.cancelAnimationFrame(raf1); window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [resizeKey, mapHeight, status])

  useEffect(() => {
    if (!mapCardRef.current || !mapInstanceRef.current || status !== 'ready') return
    const observer = new ResizeObserver(() => forceRelayout())
    observer.observe(mapCardRef.current)
    return () => observer.disconnect()
  }, [status])

  useEffect(() => {
    if (status !== 'ready') return
    window.addEventListener('resize', forceRelayout)
    return () => window.removeEventListener('resize', forceRelayout)
  }, [status])

  return (
    <div className={`${styles.wrapper} ${className}`.trim()} style={wrapperStyle}>
      {showHeader && (
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Карта</h3>
            <p className="muted">Интеграция Яндекс.Карт с радиусным поиском.</p>
          </div>
          <span className="badge">Радиус: {radiusKm} км</span>
        </div>
      )}
      <div
        ref={mapCardRef}
        className={`${styles.mapCard} ${isFullScreen ? styles.mapCardFull : ''}`.trim()}
        style={cardStyle}
      >
        <div ref={mapRef} className={styles.map} style={mapStyle} />

        {clusterMenu && (
          <div
            className={`${styles.clusterPopup} ${clusterMenu.above ? '' : styles.clusterPopupBelow}`}
            style={{
              left: clusterMenu.x,
              top: clusterMenu.y,
              transform: clusterMenu.above
                ? 'translate(-50%, calc(-100% - 16px))'
                : 'translate(-50%, 16px)',
              '--arrow-left': `${clusterMenu.arrowLeft}%`,
            }}
          >
            <div className={styles.clusterPopupHeader}>
              <span>{clusterMenu.events.length} события в этой точке</span>
              <button
                className={styles.clusterPopupClose}
                type="button"
                onClick={() => setClusterMenu(null)}
              >
                ×
              </button>
            </div>
            <ul className={styles.clusterPopupList}>
              {clusterMenu.events.map((ev) => {
                const { emoji } = getCategoryIcon(ev.categories)
                return (
                  <li key={ev.id}>
                    <button
                      className={styles.clusterPopupItem}
                      type="button"
                      onClick={() => { onSelectEventRef.current?.(ev); setClusterMenu(null) }}
                    >
                      <span className={styles.clusterPopupEmoji}>{emoji}</span>
                      {ev.title}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {status !== 'ready' && (
          <div className={styles.yandexNote}>
            <strong>Yandex Maps API</strong>
            <p className="muted">
              {status === 'missing-key'
                ? 'Укажите VITE_YANDEX_MAPS_API_KEY в client/.env, чтобы включить карту.'
                : 'Карта загружается или недоступна.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapPanel
