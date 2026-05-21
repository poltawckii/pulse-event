import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import pickDateLabel from '../utils/formatEventDateLabel.js'
import styles from './Home.module.css'

const socialGroupMap = {
  1: {
    key: 'youth',
    label: 'Молодежь',
    categories: ['concert', 'festival', 'party', 'quest', 'entertainment', 'recreation', 'education'],
  },
  2: {
    key: 'seniors',
    label: 'Пенсионеры',
    categories: ['exhibition', 'theater', 'concert', 'tour', 'education', 'cinema', 'holiday'],
  },
  3: {
    key: 'families',
    label: 'Семьи',
    categories: ['kids', 'entertainment', 'exhibition', 'festival', 'holiday', 'tour', 'recreation'],
  },
  4: {
    key: 'disabled',
    label: 'Люди с ОВЗ',
    categories: ['social-activity', 'exhibition', 'theater', 'concert', 'education'],
  },
}

const normalizeStartDate = (dateInfo) => {
  if (dateInfo?.start_date) {
    const dateTime = new Date(`${dateInfo.start_date}T${dateInfo.start_time || '00:00:00'}`)
    if (!Number.isNaN(dateTime.getTime())) return dateTime
  }
  const startRaw = dateInfo?.start
  const startNumber = typeof startRaw === 'number' ? startRaw : Number(startRaw)
  if (!Number.isFinite(startNumber)) return null
  const ms = startNumber > 1e12 ? startNumber : startNumber * 1000
  const dateTime = new Date(ms)
  return Number.isNaN(dateTime.getTime()) ? null : dateTime
}

const isSameDay = (dateA, dateB) =>
  dateA.getFullYear() === dateB.getFullYear()
  && dateA.getMonth() === dateB.getMonth()
  && dateA.getDate() === dateB.getDate()

function Home() {
  const [events, setEvents] = useState([])
  const [eventsStatus, setEventsStatus] = useState('idle')
  const token = useMemo(() => localStorage.getItem('auth_token'), [])
  const user = useMemo(() => {
    const stored = localStorage.getItem('auth_user')
    return stored ? JSON.parse(stored) : null
  }, [])
  const groupProfile = user?.socialGroupId ? socialGroupMap[user.socialGroupId] : null

  useEffect(() => {
    const loadEvents = async () => {
      setEventsStatus('loading')
      try {
        const response = await fetch('/api/kudago/events?location=msk&pageSize=80')
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Не удалось загрузить события')
        }
        setEvents(payload.data || [])
        setEventsStatus('ready')
      } catch (error) {
        setEvents([])
        setEventsStatus('error')
      }
    }

    loadEvents()
  }, [])


  const todayEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => {
        const dateItems = Array.isArray(event.dates) ? event.dates : event.dates ? [event.dates] : []
        if (dateItems.some((item) => item?.is_continuous || item?.is_endless)) return true
        const firstDate = dateItems
          .map((item) => normalizeStartDate(item))
          .find(Boolean)
        return firstDate ? isSameDay(firstDate, now) : false
      })
      .slice(0, 4)
  }, [events])

  const groupEvents = useMemo(() => {
    if (!groupProfile) return []
    return events
      .filter((event) =>
        event.categories?.some((category) => groupProfile.categories.includes(category))
      )
      .slice(0, 4)
  }, [events, groupProfile])

  const categoryLinks = [
    {
      title: 'Карта рядом',
      description: 'Поиск событий по радиусу и быстрый переход к карточкам.',
      to: '/map',
      value: 'Геопоиск',
    },
    {
      title: 'Каталог событий',
      description: 'Полный список событий города с фильтрами и сортировкой.',
      to: '/events',
      value: 'Все события',
    },
  ]

  return (
    <div className={`page ${styles.page}`}>
      <section className={`section ${styles.hero}`}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <span className={styles.kicker}>PulseEvent</span>
          <h1 className={styles.title}>PulseEvent</h1>
          <p className={styles.subtitle}>
            Городские события, собранные в одном месте. Быстрый доступ к избранному,
            оценкам и подборкам под вашу социальную группу.
          </p>
          <div className={styles.heroActions}>
            <Link className="button" to="/events">
              Перейти к событиям
            </Link>
            <Link className="button secondary" to="/map">
              Открыть карту
            </Link>
          </div>
        </div>
        <div className={styles.heroOrbit} />
      </section>

      <section className={`section ${styles.categories}`}>
        <div className="sectionHeader">
          <div>
            <h2>Категории</h2>
            <p className="muted">Быстрые подборки и переходы в нужные разделы.</p>
          </div>
          {groupProfile && <span className="badge">Соц. группа: {groupProfile.label}</span>}
        </div>
        <div className={styles.categoryGrid}>
          {categoryLinks.map((item) => (
            <Link key={item.title} to={item.to} className={styles.categoryCard}>
              <div>
                <h3>{item.title}</h3>
                <p className={styles.categoryValue}>{item.value}</p>
                <p className="muted">{item.description}</p>
              </div>
              <span className={styles.categoryArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`section ${styles.events}`}>
        <div className={styles.eventsHeader}>
          <div>
            <h2>Идет сегодня</h2>
            <p className="muted">События, которые можно посетить уже сегодня.</p>
          </div>
          <Link className={styles.inlineLink} to="/events">
            Смотреть все →
          </Link>
        </div>
        <div className={styles.eventList}>
          {eventsStatus === 'loading' && <p className="muted">Загрузка событий...</p>}
          {eventsStatus === 'error' && <p className="muted">Не удалось загрузить события.</p>}
          {eventsStatus === 'ready' && todayEvents.length === 0 && (
            <p className="muted">Сегодня нет явных событий, посмотрите каталог.</p>
          )}
          {todayEvents.map((event) => (
            <div key={`${event.source}-${event.id}`} className={styles.eventItem}>
              <div>
                <h3>{event.title}</h3>
                <p className="muted">{event.place || 'Городская площадка'}</p>
              </div>
              <div className={styles.eventMeta}>
                <span className="badge">{pickDateLabel(event) || 'Сегодня'}</span>
                <Link className="button secondary" to={`/events/${event.id}?source=${event.source || 'kudago'}`}>
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`section ${styles.events}`}>
        <div className={styles.eventsHeader}>
          <div>
            <h2>Под вашу соц. группу</h2>
            <p className="muted">
              {groupProfile
                ? `Подборка для группы «${groupProfile.label}».`
                : 'Добавьте социальную группу в профиле, чтобы получать подборки.'}
            </p>
          </div>
          <Link className={styles.inlineLink} to="/recommendations">
            Рекомендации →
          </Link>
        </div>
        <div className={styles.eventList}>
          {groupProfile && groupEvents.length === 0 && (
            <p className="muted">Пока нет подходящих событий. Проверьте позже.</p>
          )}
          {!groupProfile && (
            <p className="muted">Укажите социальную группу в профиле для точной подборки.</p>
          )}
          {groupEvents.map((event) => (
            <div key={`${event.source}-${event.id}`} className={styles.eventItem}>
              <div>
                <h3>{event.title}</h3>
                <p className="muted">{event.place || 'Городская площадка'}</p>
              </div>
              <div className={styles.eventMeta}>
                <span className="badge">{pickDateLabel(event) || 'Уточняйте даты'}</span>
                <Link className="button secondary" to={`/events/${event.id}?source=${event.source || 'kudago'}`}>
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
