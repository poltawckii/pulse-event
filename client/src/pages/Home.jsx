import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import EventCard from '../components/EventCard.jsx'
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

const quickLinks = [
  { emoji: '🗺️', title: 'Карта', desc: 'Найти события рядом с вами', to: '/map' },
  { emoji: '🎭', title: 'Каталог', desc: 'Все события города', to: '/events' },
  { emoji: '✨', title: 'Рекомендации', desc: 'Персональная подборка', to: '/recommendations' },
  { emoji: '❤️', title: 'Избранное', desc: 'Сохранённые события', to: '/favorites' },
]

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

function CardSkeletons({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className={styles.skeleton}>
      <div className={styles.skeletonImg} />
      <div className={styles.skeletonLine} style={{ width: '80%' }} />
      <div className={styles.skeletonLine} style={{ width: '55%' }} />
      <div className={styles.skeletonLine} style={{ width: '65%' }} />
    </div>
  ))
}

function Home() {
  const [events, setEvents] = useState([])
  const [eventsStatus, setEventsStatus] = useState('idle')

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
        if (!response.ok) throw new Error(payload.error || 'Ошибка загрузки')
        setEvents(payload.data || [])
        setEventsStatus('ready')
      } catch {
        setEvents([])
        setEventsStatus('error')
      }
    }
    loadEvents()
  }, [])

  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    return events
      .map((event) => {
        const dateItems = Array.isArray(event.dates) ? event.dates : event.dates ? [event.dates] : []
        const isContinuous = dateItems.some((d) => d?.is_continuous || d?.is_endless)
        if (isContinuous) return { event, ts: 0 }
        const first = dateItems.map((d) => normalizeStartDate(d)).find(Boolean)
        if (!first) return null
        return { event, ts: first.getTime() }
      })
      .filter((item) => item !== null && (item.ts === 0 || item.ts >= now - 86400000))
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 4)
      .map((item) => item.event)
  }, [events])

  const groupEvents = useMemo(() => {
    if (!groupProfile) return []
    return events
      .filter((event) =>
        event.categories?.some((cat) => groupProfile.categories.includes(cat))
      )
      .slice(0, 4)
  }, [events, groupProfile])

  return (
    <div className={`page ${styles.page}`}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.heroBgCircle1} />
          <div className={styles.heroBgCircle2} />
          <div className={styles.heroBgCircle3} />
        </div>
        <div className={styles.heroContent}>
          <span className={styles.kicker}>Городской гид по событиям</span>
          <h1 className={styles.heroTitle}>
            Открывайте город<br />вместе с&nbsp;
            <span className={styles.heroAccent}>PulseEvent</span>
          </h1>
          <p className={styles.heroSub}>
            Концерты, выставки, фестивали и многое другое — собранные в одном месте.
            Персональные рекомендации, карта рядом, избранное и оценки.
          </p>
          <div className={styles.heroActions}>
            <Link className="button" to="/events">Смотреть события</Link>
            <Link className={`button secondary ${styles.heroSecondary}`} to="/map">Открыть карту</Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.floatCard}>
            <span className={styles.floatCardEmoji}>🎭</span>
            <div>
              <p className={styles.floatCardTitle}>Театр и культура</p>
              <p className={styles.floatCardSub}>Выставки, спектакли, туры</p>
            </div>
          </div>
          <div className={`${styles.floatCard} ${styles.floatCardAlt}`}>
            <span className={styles.floatCardEmoji}>🎵</span>
            <div>
              <p className={styles.floatCardTitle}>Концерты</p>
              <p className={styles.floatCardSub}>Живая музыка в городе</p>
            </div>
          </div>
          <div className={`${styles.floatCard} ${styles.floatCardAccent}`}>
            <span className={styles.floatCardEmoji}>👨‍👩‍👧</span>
            <div>
              <p className={styles.floatCardTitle}>Для семьи</p>
              <p className={styles.floatCardSub}>Праздники, квесты, пикники</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Статистика ── */}
      <section className={styles.stats}>
        <div className={styles.statItem}>
          <strong>100+</strong>
          <span>событий каждый день</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <strong>18</strong>
          <span>категорий</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <strong>4</strong>
          <span>соц. группы</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <strong>Москва</strong>
          <span>и другие города</span>
        </div>
      </section>

      {/* ── Быстрый доступ ── */}
      <section className={`section ${styles.quickSection}`}>
        <div className="sectionHeader">
          <div>
            <h2>Быстрый доступ</h2>
            <p className="muted">Перейдите в нужный раздел одним кликом.</p>
          </div>
          {groupProfile && <span className="badge">Группа: {groupProfile.label}</span>}
        </div>
        <div className={styles.quickGrid}>
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to} className={styles.quickCard}>
              <span className={styles.quickEmoji}>{item.emoji}</span>
              <div>
                <p className={styles.quickTitle}>{item.title}</p>
                <p className={styles.quickDesc}>{item.desc}</p>
              </div>
              <span className={styles.quickArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Ближайшие события ── */}
      <section className={`section ${styles.eventsSection}`}>
        <div className={styles.eventsHeader}>
          <div>
            <h2>Ближайшие события</h2>
            <p className="muted">Актуальные события города, которые скоро начнутся.</p>
          </div>
          <Link className={styles.seeAll} to="/events">Все события →</Link>
        </div>
        <div className={`grid three ${styles.cardGrid}`}>
          {eventsStatus === 'loading' && <CardSkeletons count={4} />}
          {eventsStatus === 'error' && <p className="muted">Не удалось загрузить события.</p>}
          {eventsStatus === 'ready' && upcomingEvents.length === 0 && (
            <p className="muted">Нет ближайших событий — загляните в каталог.</p>
          )}
          {upcomingEvents.map((event) => (
            <EventCard key={`${event.source}-${event.id}`} event={event} />
          ))}
        </div>
      </section>

      {/* ── Для вашей группы ── */}
      <section className={`section ${styles.eventsSection}`}>
        <div className={styles.eventsHeader}>
          <div>
            <h2>Для вашей группы</h2>
            <p className="muted">
              {groupProfile
                ? `Подборка для группы «${groupProfile.label}».`
                : 'Укажите социальную группу в профиле — и мы подберём события именно для вас.'}
            </p>
          </div>
          <Link className={styles.seeAll} to="/recommendations">Рекомендации →</Link>
        </div>
        {!groupProfile ? (
          <div className={styles.groupCta}>
            <p>
              {user
                ? 'Укажите социальную группу в профиле — и мы подберём события именно для вас.'
                : 'Войдите в аккаунт, чтобы получать персональные рекомендации событий.'}
            </p>
            {user
              ? <Link className="button" to="/profile">Заполнить профиль</Link>
              : <Link className="button" to="/auth?mode=login">Войти</Link>
            }
          </div>
        ) : (
          <div className={`grid three ${styles.cardGrid}`}>
            {eventsStatus === 'loading' && <CardSkeletons count={4} />}
            {eventsStatus === 'ready' && groupEvents.length === 0 && (
              <p className="muted">Пока нет подходящих событий — проверьте позже.</p>
            )}
            {groupEvents.map((event) => (
              <EventCard key={`${event.source}-${event.id}`} event={event} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}

export default Home
