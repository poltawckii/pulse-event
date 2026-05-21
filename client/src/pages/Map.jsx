import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MapPanel from '../components/MapPanel.jsx'
import pickDateLabel from '../utils/formatEventDateLabel.js'
import styles from './Map.module.css'

const fallbackCenter = [55.751244, 37.618423]
const mapStateKey = 'map_state'
const socialGroupMap = {
  youth: ['concert', 'festival', 'party', 'quest', 'entertainment', 'recreation', 'education'],
  seniors: ['exhibition', 'theater', 'concert', 'tour', 'education', 'cinema', 'holiday'],
  families: ['kids', 'entertainment', 'exhibition', 'festival', 'holiday', 'tour', 'recreation'],
  disabled: ['social-activity', 'exhibition', 'theater', 'concert', 'education'],
}

const loadStoredState = () => {
  try {
    const raw = localStorage.getItem(mapStateKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.center) || parsed.center.length !== 2) return null
    if (typeof parsed.radiusKm !== 'number') return null
    return parsed
  } catch (error) {
    return null
  }
}

function MapPage() {
  const storedState = loadStoredState()
  const [radiusKm, setRadiusKm] = useState(storedState?.radiusKm ?? 5)
  const [center, setCenter] = useState(storedState?.center ?? fallbackCenter)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [events, setEvents] = useState([])
  const [eventsStatus, setEventsStatus] = useState('idle')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [address, setAddress] = useState('')
  const [metro, setMetro] = useState('')
  const [geocodeStatus, setGeocodeStatus] = useState('idle')
  const [category, setCategory] = useState('all')
  const [socialGroup, setSocialGroup] = useState('all')

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      return
    }

    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.latitude, position.coords.longitude])
        setLocationStatus('granted')
      },
      (error) => {
        if (error.code === 1) {
          setLocationStatus('denied')
        } else {
          setLocationStatus('error')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const loadEvents = async () => {
      setEventsStatus('loading')
      try {
        const params = new URLSearchParams({
          lat: String(center[0]),
          lng: String(center[1]),
          radius: String(radiusKm * 1000),
          pageSize: '500',
        })
        if (category !== 'all') {
          params.set('categories', category)
        }

        const response = await fetch(`/api/kudago/events?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Не удалось загрузить события')
        }

        const payload = await response.json()
        const fetchedEvents = payload.data || []
        setEvents(fetchedEvents)
        setSelectedEvent((prev) => prev || fetchedEvents[0] || null)
        setEventsStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setEvents([])
          setEventsStatus('error')
        }
      }
    }

    loadEvents()
    return () => controller.abort()
  }, [center, radiusKm, category])

  useEffect(() => {
    const payload = {
      center,
      radiusKm,
    }
    localStorage.setItem(mapStateKey, JSON.stringify(payload))
  }, [center, radiusKm])

  const mapEvents = useMemo(() => {
    const filtered = events.filter((event) => Array.isArray(event.coords))
    if (socialGroup === 'all') return filtered
    const allowed = socialGroupMap[socialGroup] || []
    return filtered.filter((event) =>
      event.categories?.some((item) => allowed.includes(item))
    )
  }, [events, socialGroup])

  const detailsEvent =
    mapEvents.find((event) => event.id === selectedEvent?.id)
    || mapEvents[0]
    || null
  const detailsDate = detailsEvent ? pickDateLabel(detailsEvent) : null
  const detailsPrice = (() => {
    if (!detailsEvent) return 'Уточняйте'
    if (detailsEvent.price === 0 || detailsEvent.price === '0') return 'Бесплатно'
    if (typeof detailsEvent.price === 'number') return `${detailsEvent.price} руб.`
    if (typeof detailsEvent.price === 'string' && detailsEvent.price.trim().length > 0) {
      return detailsEvent.price
    }
    return 'Уточняйте'
  })()

  const statusLabel = (() => {
    if (eventsStatus === 'loading') return 'Загрузка событий...'
    if (eventsStatus === 'error') return 'Не удалось загрузить события'
    if (geocodeStatus === 'error') return 'Адрес не найден, попробуйте еще раз'
    if (locationStatus === 'denied') return 'Доступ к геолокации запрещен'
    if (locationStatus === 'unavailable') return 'Геолокация недоступна'
    if (locationStatus === 'requesting') return 'Определяем местоположение...'
    if (locationStatus === 'granted') return 'Показываем события рядом'
    return 'Укажите радиус и включите геолокацию'
  })()

  const handleGeocode = async () => {
    if (!address.trim()) return
    setGeocodeStatus('loading')
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Geocode failed')
      }
      setCenter([payload.data.lat, payload.data.lon])
      setLocationStatus('manual')
      setGeocodeStatus('ready')
    } catch (error) {
      setGeocodeStatus('error')
    }
  }

  const handleMetroGeocode = async () => {
    if (!metro.trim()) return
    setGeocodeStatus('loading')
    try {
      const query = `метро ${metro.trim()}, Москва`
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`)
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Geocode failed')
      }
      setCenter([payload.data.lat, payload.data.lon])
      setLocationStatus('manual')
      setGeocodeStatus('ready')
    } catch (error) {
      setGeocodeStatus('error')
    }
  }

  return (
    <div className={`page ${styles.page}`}>
      <section className={`section ${styles.panel}`}>
        <div className={styles.panelHeader}>
          <div>
            <h1 className={styles.title}>Карта</h1>
            <p className="muted">Поиск событий по радиусу на карте города.</p>
          </div>
          <span className="badge">Радиус: {radiusKm} км</span>
        </div>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.statusBlock}>
              <strong>Статус</strong>
              <p className="muted">{statusLabel}</p>
            </div>

            <button className="button" type="button" onClick={requestLocation}>
              {locationStatus === 'requesting' ? 'Определяем...' : 'Использовать геолокацию'}
            </button>

            <div className={styles.fieldGroup}>
              <label htmlFor="address" className="muted">
                Адрес (Москва или МО)
              </label>
              <input
                id="address"
                className="input"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Например, Химки, Ленинградская 1"
              />
              <button
                className="button secondary"
                type="button"
                onClick={handleGeocode}
                disabled={geocodeStatus === 'loading'}
              >
                {geocodeStatus === 'loading' ? 'Ищем...' : 'Найти по адресу'}
              </button>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="metro" className="muted">
                Метро (Москва)
              </label>
              <input
                id="metro"
                className="input"
                type="text"
                value={metro}
                onChange={(event) => setMetro(event.target.value)}
                placeholder="Например, Севастопольская"
              />
              <button
                className="button secondary"
                type="button"
                onClick={handleMetroGeocode}
                disabled={geocodeStatus === 'loading'}
              >
                {geocodeStatus === 'loading' ? 'Ищем...' : 'Найти по метро'}
              </button>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="radius" className="muted">
                Радиус поиска (км)
              </label>
              <input
                id="radius"
                type="range"
                min="1"
                max="10"
                step="1"
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
              />
              <div className={styles.rangeValue}>{radiusKm} км</div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="category" className="muted">
                Категория
              </label>
              <select
                id="category"
                className="select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">Все</option>
                <option value="concert">Концерты</option>
                <option value="theater">Театр</option>
                <option value="exhibition">Выставки</option>
                <option value="cinema">Кино</option>
                <option value="festival">Фестивали</option>
                <option value="education">Образование</option>
                <option value="tour">Экскурсии</option>
                <option value="party">Вечеринки</option>
                <option value="kids">Детям</option>
                <option value="quest">Квесты</option>
                <option value="holiday">Праздники</option>
                <option value="shopping">Шопинг</option>
                <option value="entertainment">Развлечения</option>
                <option value="recreation">Активный отдых</option>
                <option value="photo">Фотография</option>
                <option value="fashion">Мода и стиль</option>
                <option value="stock">Акции и скидки</option>
                <option value="social-activity">Благотворительность</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="socialGroup" className="muted">
                Социальная группа
              </label>
              <select
                id="socialGroup"
                className="select"
                value={socialGroup}
                onChange={(event) => setSocialGroup(event.target.value)}
              >
                <option value="all">Все</option>
                <option value="youth">Молодежь</option>
                <option value="seniors">Пенсионеры</option>
                <option value="families">Семьи</option>
                <option value="disabled">Люди с ОВЗ</option>
              </select>
            </div>

            <div className={styles.note}>
              <p className="muted">
                События обновляются при смене адреса, радиуса или фильтров.
              </p>
            </div>
          </aside>

          <div className={styles.mapWrap}>
            <MapPanel
              center={center}
              radiusKm={radiusKm}
              events={mapEvents}
              showHeader={false}
              mapHeight="560px"
              className={styles.mapPanel}
              onSelectEvent={setSelectedEvent}
            />
          </div>

          <aside className={styles.details}>
            <div className={styles.detailsHeader}>
              <h2>Информация о событии</h2>
              <p className="muted">Кликните по метке на карте.</p>
            </div>
            {detailsEvent ? (
              <div className={styles.detailsCard}>
                {detailsEvent.image && (
                  <div className={styles.detailsImage}>
                    <img src={detailsEvent.image} alt={detailsEvent.title} />
                  </div>
                )}
                <div className={styles.detailsBody}>
                  <h3>{detailsEvent.title}</h3>
                  <p className="muted">{detailsEvent.place || 'Городская площадка'}</p>
                  <div className={styles.detailsMeta}>
                    {detailsDate && <span className="badge">{detailsDate}</span>}
                    <span className="badge">{detailsPrice}</span>
                  </div>
                  <div className={styles.detailsActions}>
                    <Link
                      className="button"
                      to={`/events/${detailsEvent.id}?source=${detailsEvent.source || 'kudago'}`}
                    >
                      Открыть событие
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">События не найдены в выбранном радиусе.</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}

export default MapPage
