import { useEffect, useMemo, useState } from 'react'
import FilterBar from '../components/FilterBar.jsx'
import EventCard from '../components/EventCard.jsx'
import { showToast } from '../utils/toast.js'

// Категории KudaGo, типичные для каждой социальной группы
const GROUP_CATEGORIES = {
  seniors:  ['concert', 'theater', 'exhibition', 'culture', 'music', 'tour', 'holiday'],
  families: ['kids', 'entertainment', 'quest', 'recreation', 'festival', 'cinema'],
  youth:    ['party', 'festival', 'sport', 'entertainment', 'standup', 'quest', 'music', 'concert'],
  disabled: ['exhibition', 'theater', 'concert', 'education', 'culture', 'tour'],
}

function Events() {
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('idle')
  const [sortKey, setSortKey] = useState('date-asc')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')

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
          image: event.image || null,
          tags: event.tags || [],
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
          image: event.image || null,
          tags: event.tags || [],
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

  const filteredAndSorted = useMemo(() => {
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

    // 1. Сортировка
    const sortable = [...events]
    switch (sortKey) {
      case 'date-desc':
        sortable.sort((a, b) => getEventStart(b) - getEventStart(a))
        break
      case 'price-asc':
        sortable.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
        break
      case 'price-desc':
        sortable.sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
        break
      case 'title-asc':
        sortable.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        break
      case 'title-desc':
        sortable.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
        break
      default:
        sortable.sort((a, b) => getEventStart(a) - getEventStart(b))
    }

    // 2. Поиск по названию и месту
    const q = search.trim().toLowerCase()
    const afterSearch = q
      ? sortable.filter(
          (e) =>
            e.title?.toLowerCase().includes(q) ||
            e.place?.toLowerCase().includes(q)
        )
      : sortable

    // 3. Фильтр по категории
    const afterCategory =
      categoryFilter === 'all'
        ? afterSearch
        : afterSearch.filter((e) =>
            Array.isArray(e.categories) && e.categories.includes(categoryFilter)
          )

    // 4. Фильтр по социальной группе
    const groupCats = GROUP_CATEGORIES[groupFilter]
    const afterGroup =
      !groupCats
        ? afterCategory
        : afterCategory.filter((e) =>
            Array.isArray(e.categories) &&
            e.categories.some((c) => groupCats.includes(c))
          )

    return afterGroup
  }, [events, sortKey, search, categoryFilter, groupFilter])

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <h1>Каталог событий</h1>
          <span className="badge">
            {status === 'ready' ? `${filteredAndSorted.length} событий` : 'Загрузка...'}
          </span>
        </div>
        <FilterBar
          search={search}
          onSearch={setSearch}
          category={categoryFilter}
          onCategory={setCategoryFilter}
          group={groupFilter}
          onGroup={setGroupFilter}
        />
        <div className="sectionHeader">
          <div>
            <label className="muted" htmlFor="sort">Сортировка</label>
            <select
              className="select"
              id="sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
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
        {status === 'loading' && (
          <p className="muted">Загрузка событий...</p>
        )}
        {status === 'error' && (
          <p className="muted">Не удалось загрузить события.</p>
        )}
        {status === 'ready' && filteredAndSorted.length === 0 && (
          <p className="muted">Нет событий, подходящих под фильтры.</p>
        )}
        {status === 'ready' && filteredAndSorted.length > 0 && (
          <div className="grid three">
            {filteredAndSorted.map((event) => (
              <EventCard
                key={`${event.source}-${event.id}`}
                event={event}
                onFavorite={sendFavorite}
                onRate={sendRating}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Events
