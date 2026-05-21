import { useEffect, useMemo, useState } from 'react'
import FilterBar from '../components/FilterBar.jsx'
import EventCard from '../components/EventCard.jsx'
import { showToast } from '../utils/toast.js'

function Events() {
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('idle')
  const [sortKey, setSortKey] = useState('date-asc')

  useEffect(() => {
    const loadEvents = async () => {
      setStatus('loading')
      try {
        const response = await fetch('/api/kudago/events?location=msk&pageSize=100')
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Не удалось загрузить события')
        }
        setEvents(payload.data || [])
        setStatus('ready')
      } catch (error) {
        setStatus('error')
      }
    }

    loadEvents()
  }, [])

  const token = useMemo(() => localStorage.getItem('auth_token'), [])

  const sendFavorite = async (event) => {
    if (!token) {
      showToast('Войдите, чтобы добавить в избранное', 'error')
      return
    }
    const body = event.source === 'kudago'
      ? {
          source: 'kudago',
          externalId: event.id,
          title: event.title,
          place: event.place,
          url: event.url,
          price: event.price,
          categories: event.categories || [],
        }
      : { eventId: event.id }

    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    showToast(
      response.ok ? 'Добавлено в избранное' : 'Не удалось добавить в избранное',
      response.ok ? 'success' : 'error'
    )
  }

  const sendRating = async (event, score) => {
    if (!token || !score) {
      showToast('Войдите, чтобы оценивать события', 'error')
      return
    }
    const body = event.source === 'kudago'
      ? {
          source: 'kudago',
          externalId: event.id,
          title: event.title,
          place: event.place,
          url: event.url,
          price: event.price,
          categories: event.categories || [],
          score,
        }
      : { eventId: event.id, score }

    const response = await fetch('/api/ratings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    showToast(
      response.ok ? `Оценка ${score}/5 сохранена` : 'Не удалось сохранить оценку',
      response.ok ? 'success' : 'error'
    )
  }

  const sortedEvents = useMemo(() => {
    const getEventStart = (event) => {
      const start = event?.dates?.[0]?.start
      if (typeof start === 'number') return start
      const parsed = Number(start)
      return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
    }

    const parsePrice = (value) => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const match = value.match(/\d+(?:[\.,]\d+)?/)
        if (match) return Number(match[0].replace(',', '.'))
      }
      return Number.MAX_SAFE_INTEGER
    }

    const sortable = [...events]
    switch (sortKey) {
      case 'date-desc':
        return sortable.sort((a, b) => getEventStart(b) - getEventStart(a))
      case 'price-asc':
        return sortable.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
      case 'price-desc':
        return sortable.sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
      case 'title-asc':
        return sortable.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      case 'title-desc':
        return sortable.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
      case 'date-asc':
      default:
        return sortable.sort((a, b) => getEventStart(a) - getEventStart(b))
    }
  }, [events, sortKey])

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <h1>Каталог событий</h1>
          <span className="badge">
            {status === 'ready' ? `${sortedEvents.length} событий` : 'Загрузка...'}
          </span>
        </div>
        <FilterBar />
        <div className="sectionHeader">
          <div>
            <label className="muted" htmlFor="sort">
              Сортировка
            </label>
            <select
              className="select"
              id="sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
            >
              <option value="date-asc">По дате (ближайшие)</option>
              <option value="date-desc">По дате (дальние)</option>
              <option value="price-asc">По цене (дешевле)</option>
              <option value="price-desc">По цене (дороже)</option>
              <option value="title-asc">По названию (А-Я)</option>
              <option value="title-desc">По названию (Я-А)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid three">
          {sortedEvents.map((event) => (
            <EventCard
              key={`${event.source}-${event.id}`}
              event={event}
              onFavorite={sendFavorite}
              onRate={sendRating}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Events
