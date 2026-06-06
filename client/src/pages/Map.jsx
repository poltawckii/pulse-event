import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MapPanel from '../components/MapPanel.jsx'
import pickDateLabel from '../utils/formatEventDateLabel.js'
import pickEventImage from '../utils/pickEventImage.js'
import styles from './Map.module.css'

const fallbackCenter = [55.751244, 37.618423]
const mapStateKey = 'map_state'
const socialGroupMap = {
  youth: ['concert', 'festival', 'party', 'quest', 'entertainment', 'recreation', 'education'],
  seniors: ['exhibition', 'theater', 'concert', 'tour', 'education', 'cinema', 'holiday'],
  families: ['kids', 'entertainment', 'exhibition', 'festival', 'holiday', 'tour', 'recreation'],
  disabled: ['social-activity', 'exhibition', 'theater', 'concert', 'education'],
}

const CATEGORIES = [
  { value: 'all', label: 'Все категории' },
  { value: 'concert', label: 'Концерты' },
  { value: 'theater', label: 'Театр' },
  { value: 'exhibition', label: 'Выставки' },
  { value: 'cinema', label: 'Кино' },
  { value: 'festival', label: 'Фестивали' },
  { value: 'education', label: 'Образование' },
  { value: 'tour', label: 'Экскурсии' },
  { value: 'party', label: 'Вечеринки' },
  { value: 'kids', label: 'Детям' },
  { value: 'quest', label: 'Квесты' },
  { value: 'holiday', label: 'Праздники' },
  { value: 'shopping', label: 'Шопинг' },
  { value: 'entertainment', label: 'Развлечения' },
  { value: 'recreation', label: 'Активный отдых' },
  { value: 'photo', label: 'Фотография' },
  { value: 'fashion', label: 'Мода и стиль' },
  { value: 'stock', label: 'Акции и скидки' },
  { value: 'social-activity', label: 'Благотворительность' },
]

const SOCIAL_GROUPS = [
  { value: 'all', label: 'Все аудитории' },
  { value: 'youth', label: 'Молодежь' },
  { value: 'seniors', label: 'Пенсионеры' },
  { value: 'families', label: 'Семьи' },
  { value: 'disabled', label: 'Люди с ОВЗ' },
]

const toRadians = (value) => (value * Math.PI) / 180

const getDistanceKm = (from, to) => {
  if (!Array.isArray(from) || !Array.isArray(to) || from.length !== 2 || to.length !== 2) {
    return Number.POSITIVE_INFINITY
  }

  const [fromLat, fromLng] = from.map(Number)
  const [toLat, toLng] = to.map(Number)
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY
  }

  const earthRadiusKm = 6371
  const deltaLat = toRadians(toLat - fromLat)
  const deltaLng = toRadians(toLng - fromLng)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)))
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
  const [geocodeStatus, setGeocodeStatus] = useState('idle')
  const [category, setCategory] = useState('all')
  const [socialGroup, setSocialGroup] = useState('all')
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 980)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileEventsOpen, setMobileEventsOpen] = useState(false)
  const eventItemRefs = useRef(new Map())
  const isFullScreen = true

  useEffect(() => {
    const media = window.matchMedia('(max-width: 980px)')
    const handleChange = (event) => {
      setIsNarrow(event.matches)
      window.dispatchEvent(new Event('resize'))
    }
    handleChange(media)
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [])

  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [isNarrow])

  useEffect(() => {
    if (!isNarrow) {
      setMobileFiltersOpen(false)
      setMobileEventsOpen(false)
    }
  }, [isNarrow])

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
    const filtered = events.filter((event) => {
      if (!Array.isArray(event.coords)) return false
      return getDistanceKm(center, event.coords) <= radiusKm + 0.1
    })
    if (socialGroup === 'all') return filtered
    const allowed = socialGroupMap[socialGroup] || []
    return filtered.filter((event) =>
      event.categories?.some((item) => allowed.includes(item))
    )
  }, [events, socialGroup])

  const detailsEvent = selectedEvent
    ? mapEvents.find((event) => event.id === selectedEvent.id) || null
    : null
  const detailsDate = detailsEvent ? pickDateLabel(detailsEvent) : null
  const detailsCategory = detailsEvent?.categories?.[0]
    ? detailsEvent.categories[0]
    : detailsEvent?.category
  const detailsPrice = (() => {
    if (!detailsEvent) return 'Уточняйте'
    if (detailsEvent.price === 0 || detailsEvent.price === '0') return 'Бесплатно'
    if (typeof detailsEvent.price === 'number') return `${detailsEvent.price} руб.`
    if (typeof detailsEvent.price === 'string' && detailsEvent.price.trim().length > 0) {
      return detailsEvent.price
    }
    return 'Уточняйте'
  })()

  useEffect(() => {
    if (selectedEvent && !detailsEvent) {
      setSelectedEvent(null)
    }
  }, [selectedEvent, detailsEvent])

  useEffect(() => {
    if (!detailsEvent || isNarrow) return

    const itemNode = eventItemRefs.current.get(detailsEvent.id)
    if (!itemNode) return

    window.requestAnimationFrame(() => {
      itemNode.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    })
  }, [detailsEvent, isNarrow])

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

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event)
    setMobileEventsOpen(false)
  }, [])

  return (
    <div className={`page ${styles.page} ${isFullScreen ? styles.pageFull : ''}`}>
      <section className={`section ${styles.panel} ${isFullScreen ? styles.panelFull : ''}`}>
        <div className={`${styles.panelHeader} ${isFullScreen ? styles.panelHeaderHidden : ''}`}>
          <div>
            <h1 className={styles.title}>Карта</h1>
            <p className="muted">Поиск событий по радиусу на карте города.</p>
          </div>
          <span className="badge">Радиус: {radiusKm} км</span>
        </div>

        <div
          className={`${styles.layout} ${isFullScreen ? styles.layoutFull : ''} ${
            isFullScreen && !isNarrow ? styles.layoutWithSidebar : ''
          }`}
        >
          <aside
            className={`${styles.sidebar} ${isNarrow ? styles.hidden : ''} ${
              isFullScreen ? styles.sidebarFull : ''
            }`}
          >
            <Link
              className={styles.sidebarReturnButton}
              to="/"
              aria-label="Вернуться на сайт"
              title="Вернуться на сайт"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
                <path d="M21 12H9" />
              </svg>
            </Link>
            <div className={styles.sidebarSearch}>
                <div className={styles.sidebarSearchHeader}>
                  <div className={styles.sidebarBrand}>
                    <h2 className={styles.sidebarTitle}>Поиск</h2>
                    <p className={`muted ${styles.statusLine}`}>{statusLabel}</p>
                  </div>
                </div>

              <div className={styles.searchRow}>
                <div className={styles.searchBox}>
                  <div className={styles.searchLogoArea}>
                    <img src="/pulseevent_icon_only.svg" alt="Pulse" className={styles.searchIcon} />
                  </div>
                  <div className={styles.searchInputArea}>
                    <input
                      id="address"
                      className="input"
                      type="text"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Поиск и выбор мест"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleGeocode()
                      }}
                    />
                  </div>
                </div>
                <button
                  className="button"
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocodeStatus === 'loading'}
                >
                  {geocodeStatus === 'loading' ? '...' : 'Найти'}
                </button>
              </div>

              <button className="button secondary" type="button" onClick={requestLocation}>
                {locationStatus === 'requesting' ? 'Определяем...' : 'Моё местоположение'}
              </button>

              <div className={styles.fieldGroup}>
                <label htmlFor="radius" className="muted">
                  Радиус: {radiusKm} км
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
              </div>

              <div className={styles.filterRow}>
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
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="socialGroup" className="muted">
                    Аудитория
                  </label>
                  <select
                    id="socialGroup"
                    className="select"
                    value={socialGroup}
                    onChange={(event) => setSocialGroup(event.target.value)}
                  >
                    {SOCIAL_GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.sidebarEvents}>
              <div className={styles.eventsHeader}>
                <h2 className={styles.sidebarTitle}>События</h2>
                <span className="badge">{mapEvents.length}</span>
              </div>

              {eventsStatus === 'loading' && (
                <p className="muted">Загрузка списка...</p>
              )}
              {eventsStatus === 'error' && (
                <p className="muted">Не удалось загрузить события</p>
              )}
              {eventsStatus === 'ready' && mapEvents.length === 0 && (
                <p className="muted">В выбранном радиусе событий не найдено</p>
              )}

              <ul className={styles.eventList}>
                {mapEvents.map((event) => {
                  const eventDate = pickDateLabel(event)
                  const isActive = selectedEvent?.id === event.id
                  return (
                    <li
                      key={`${event.source || 'kudago'}-${event.id}`}
                      className={styles.eventListItem}
                      ref={(node) => {
                        if (node) {
                          eventItemRefs.current.set(event.id, node)
                        } else {
                          eventItemRefs.current.delete(event.id)
                        }
                      }}
                    >
                      <button
                        type="button"
                        className={`${styles.eventItem} ${isActive ? styles.eventItemActive : ''}`}
                        onClick={() => setSelectedEvent(isActive ? null : event)}
                      >
                        <span className={styles.eventItemTitle}>{event.title}</span>
                        <span className={styles.eventItemMeta}>
                          {event.place || 'Городская площадка'}
                          {eventDate ? ` · ${eventDate}` : ''}
                        </span>
                      </button>
                      {isActive && (
                        <div className={styles.eventItemExpanded}>
                          <div className={styles.detailsCard}>
                            <button
                              className={styles.closeButton}
                              type="button"
                              onClick={() => setSelectedEvent(null)}
                              aria-label="Закрыть"
                            >
                              ×
                            </button>
                            {detailsEvent.image && (
                              <div className={styles.detailsThumb}>
                                <img src={detailsEvent.image} alt={detailsEvent.title} />
                              </div>
                            )}
                            <div className={styles.detailsBody}>
                              {detailsCategory && (
                                <span className={styles.detailsType}>{detailsCategory}</span>
                              )}
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
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>

          <div className={`${styles.mapWrap} ${isFullScreen ? styles.mapWrapFull : ''}`}>
            {/* Мобильная панель управления */}
            <div className={styles.mobileTopBar}>
              <div className={styles.mobileSearchRow}>
                <Link
                  to="/"
                  className={styles.mobileBackBtn}
                  aria-label="На сайт"
                  title="На сайт"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </Link>
                <input
                  className="input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Поиск по адресу"
                  onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
                />
                <button
                  className="button"
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocodeStatus === 'loading'}
                >
                  {geocodeStatus === 'loading' ? '...' : 'Найти'}
                </button>
                <button
                  className={`${styles.mobileFilterToggle} ${mobileFiltersOpen ? styles.mobileFilterToggleOpen : ''}`}
                  type="button"
                  onClick={() => setMobileFiltersOpen((p) => !p)}
                  aria-label="Фильтры"
                  title="Фильтры"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                    <circle cx="7" cy="6" r="2.2" />
                    <circle cx="17" cy="12" r="2.2" />
                    <circle cx="10" cy="18" r="2.2" />
                  </svg>
                </button>
              </div>

              {mobileFiltersOpen && (
                <div className={styles.mobileFiltersPanel}>
                  <button className="button secondary" type="button" onClick={requestLocation}>
                    {locationStatus === 'requesting' ? 'Определяем...' : '📍 Моё местоположение'}
                  </button>
                  <div className={styles.mobileRadiusRow}>
                    <span className="muted">
                      Радиус: <strong className={styles.radiusValue}>{radiusKm} км</strong>
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className={styles.mobileRange}
                    />
                  </div>
                  <div className={styles.mobileSelectsRow}>
                    <select
                      className="select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <select
                      className="select"
                      value={socialGroup}
                      onChange={(e) => setSocialGroup(e.target.value)}
                    >
                      {SOCIAL_GROUPS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                  {geocodeStatus === 'error' && (
                    <p className={`muted ${styles.mobileStatusNote}`}>Адрес не найден</p>
                  )}
                  {locationStatus === 'denied' && (
                    <p className={`muted ${styles.mobileStatusNote}`}>Геолокация запрещена</p>
                  )}
                </div>
              )}
            </div>

            {eventsStatus === 'loading' && (
              <div className={styles.mapLoaderOverlay}>
                <div className={styles.mapLoaderSpinner} />
                <span>Загрузка событий...</span>
              </div>
            )}
            <MapPanel
              key="map"
              center={center}
              radiusKm={radiusKm}
              events={mapEvents}
              showHeader={false}
              mapHeight={isFullScreen ? '100%' : '560px'}
              className={styles.mapPanel}
              resizeKey={isFullScreen ? (isNarrow ? 'mobile' : 'desktop-sidebar') : false}
              isFullScreen={isFullScreen}
              onSelectEvent={handleSelectEvent}
            />
            <div className={styles.mapControls}>
              <button
                className={styles.mapControlButton}
                type="button"
                onClick={requestLocation}
                aria-label="Геолокация"
                title="Геолокация"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </button>
            </div>

            {/* FAB со списком событий (мобилка) */}
            {isNarrow && !detailsEvent && (
              <button
                className={`${styles.mobileEventsFab} ${mobileEventsOpen ? styles.mobileEventsFabOpen : ''}`}
                type="button"
                onClick={() => setMobileEventsOpen((p) => !p)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="2" rx="1" />
                  <rect x="3" y="11" width="18" height="2" rx="1" />
                  <rect x="3" y="18" width="12" height="2" rx="1" />
                </svg>
                {mobileEventsOpen ? 'Закрыть' : `${mapEvents.length} событий`}
              </button>
            )}
          </div>

          {/* Шторка со списком событий (мобилка) */}
          {isNarrow && mobileEventsOpen && !detailsEvent && (
            <aside className={styles.mobileEventsSheet}>
              <div className={styles.mobileEventsSheetHandle} />
              <div className={styles.mobileEventsSheetHeader}>
                <span>
                  События
                  {eventsStatus === 'ready' && (
                    <span className={styles.mobileEventsBadge}>{mapEvents.length}</span>
                  )}
                </span>
                <button
                  className={styles.closeButton}
                  type="button"
                  onClick={() => setMobileEventsOpen(false)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>
              {eventsStatus === 'loading' && (
                <p className={`muted ${styles.mobileEventsStatus}`}>Загрузка...</p>
              )}
              {eventsStatus === 'error' && (
                <p className={`muted ${styles.mobileEventsStatus}`}>Не удалось загрузить события</p>
              )}
              {eventsStatus === 'ready' && mapEvents.length === 0 && (
                <p className={`muted ${styles.mobileEventsStatus}`}>Нет событий в этом радиусе</p>
              )}
              <ul className={styles.mobileEventsList}>
                {mapEvents.map((event) => {
                  const eventDate = pickDateLabel(event)
                  return (
                    <li key={`m-${event.source || 'kudago'}-${event.id}`}>
                      <button
                        className={styles.mobileEventsItem}
                        type="button"
                        onClick={() => { setSelectedEvent(event); setMobileEventsOpen(false) }}
                      >
                        <span className={styles.mobileEventsItemTitle}>{event.title}</span>
                        <span className={styles.mobileEventsItemMeta}>
                          {event.place || 'Городская площадка'}
                          {eventDate ? ` · ${eventDate}` : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </aside>
          )}

          {/* Карточка выбранного события (мобилка) */}
          {isNarrow && detailsEvent && (
            <aside className={styles.details}>
              {/* Hero с картинкой или градиентом */}
              <div className={styles.detailsHero}>
                {detailsEvent.image
                  ? <img src={detailsEvent.image} alt={detailsEvent.title} className={styles.detailsHeroImg} />
                  : <div className={styles.detailsHeroPlaceholder} />
                }
                <div className={styles.detailsHeroGrad} />
                {detailsCategory && (
                  <span className={styles.detailsHeroCat}>{detailsCategory}</span>
                )}
                <button
                  className={styles.detailsCloseBtn}
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>

              {/* Контент */}
              <div className={styles.detailsContent}>
                <h3 className={styles.detailsTitle}>{detailsEvent.title}</h3>
                {detailsEvent.place && (
                  <p className={styles.detailsPlace}>📍 {detailsEvent.place}</p>
                )}
                <div className={styles.detailsPills}>
                  {detailsDate && <span className="badge">{detailsDate}</span>}
                  <span className="badge">{detailsPrice}</span>
                </div>
                <Link
                  className="button"
                  to={`/events/${detailsEvent.id}?source=${detailsEvent.source || 'kudago'}`}
                >
                  Подробнее →
                </Link>
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  )
}

export default MapPage
