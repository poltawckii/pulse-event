import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'
import styles from './Ratings.module.css'

function Ratings() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')

  const handleRemove = async (event) => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    const response = await fetch(
      `/api/ratings/${event.id}?source=${encodeURIComponent(event.source || 'local')}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (response.ok) {
      setItems((prev) => prev.filter((item) => item.id !== event.id))
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setStatus('unauthorized')
      return
    }

    const loadRatings = async () => {
      setStatus('loading')
      const response = await fetch('/api/ratings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (response.ok) {
        setItems(payload.data || [])
        setStatus('ready')
      } else {
        setStatus('error')
      }
    }

    loadRatings()
  }, [])

  return (
    <div className="page">
      <section className={`section ${styles.header}`}>
        <div>
          <h1>Ваши оценки</h1>
          <p className="muted">История оцененных событий и ваших впечатлений.</p>
        </div>
        <span className="badge">
          {status === 'ready' ? `${items.length} оценено` : 'Список оценок'}
        </span>
      </section>

      <section className="section">
        <div className={`grid three ${styles.list}`}>
          {status === 'unauthorized' && (
            <div className={styles.empty}>Войдите, чтобы увидеть оценки.</div>
          )}
          {status === 'loading' && <div className={styles.empty}>Загрузка оценок...</div>}
          {status === 'error' && <div className={styles.empty}>Не удалось загрузить оценки.</div>}
          {status === 'ready' && items.length === 0 && (
            <div className={styles.empty}>Пока нет оцененных событий.</div>
          )}
          {items.map((event) => (
            <div key={`${event.source}-${event.id}`} className={styles.card}>
              <span className={styles.score}>Оценка {event.score}</span>
              <EventCard event={event} />
              <div className={styles.cardActions}>
                <button
                  className={`button secondary ${styles.remove}`}
                  type="button"
                  onClick={() => handleRemove(event)}
                >
                  Удалить оценку
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Ratings
