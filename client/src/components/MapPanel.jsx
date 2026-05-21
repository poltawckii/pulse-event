import { useEffect, useRef, useState } from 'react'
import styles from './MapPanel.module.css'

const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY

function MapPanel({
  center,
  radiusKm,
  events = [],
  showHeader = true,
  mapHeight = 320,
  className = '',
  onSelectEvent,
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const placemarkRef = useRef(null)
  const circleRef = useRef(null)
  const eventsLayerRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const heightValue = typeof mapHeight === 'number' ? `${mapHeight}px` : mapHeight
  const mapStyle = { height: heightValue }
  const cardStyle = { minHeight: heightValue }

  useEffect(() => {
    if (!apiKey) {
      setStatus('missing-key')
      return undefined
    }

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
          {
            hintContent: `Радиус ${radiusKm} км`,
          },
          {
            fillColor: 'rgba(59, 139, 140, 0.25)',
            strokeColor: '#2c6e6f',
            strokeWidth: 2,
          }
        )
        mapInstance.geoObjects.add(circleRef.current)
        eventsLayerRef.current = new window.ymaps.GeoObjectCollection()
        mapInstance.geoObjects.add(eventsLayerRef.current)
        setStatus('ready')
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

    return () => {
      if (mapInstance) {
        mapInstance.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || status !== 'ready') return

    mapInstanceRef.current.setCenter(center, mapInstanceRef.current.getZoom())
    if (placemarkRef.current) {
      placemarkRef.current.geometry.setCoordinates(center)
    }
    if (circleRef.current) {
      circleRef.current.geometry.setCoordinates(center)
      circleRef.current.geometry.setRadius(radiusKm * 1000)
    }
  }, [center, radiusKm, status])

  useEffect(() => {
    if (!eventsLayerRef.current || status !== 'ready') return

    eventsLayerRef.current.removeAll()

    events.forEach((event) => {
      if (!Array.isArray(event.coords)) return
      const placemark = new window.ymaps.Placemark(
        event.coords,
        {},
        {
          preset: 'islands#darkGreenDotIcon',
          openBalloonOnClick: false,
        }
      )
      placemark.events.add('click', () => {
        onSelectEvent?.(event)
      })
      eventsLayerRef.current.add(placemark)
    })
  }, [events, status, onSelectEvent])

  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      {showHeader && (
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Карта</h3>
            <p className="muted">Интеграция Яндекс.Карт с радиусным поиском.</p>
          </div>
          <span className="badge">Радиус: {radiusKm} км</span>
        </div>
      )}
      <div className={styles.mapCard} style={cardStyle}>
        <div ref={mapRef} className={styles.map} style={mapStyle} />
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
