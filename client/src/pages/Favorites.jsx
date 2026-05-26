import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'
import styles from './Favorites.module.css'

function Favorites() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')

  const handleRemove = async (event) => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    const response = await fetch(
      `/api/favorites/${event.id}?source=${encodeURIComponent(event.source || 'local')}`,
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

    const loadFavorites = async () => {
      setStatus('loading')
      const response = await fetch('/api/favorites', {
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

    loadFavorites()
  }, [])

  return (
    <div className="page">
      <section className={`section ${styles.header}`}>
        <div>
          <h1>Избранное</h1>
          <p className="muted">Подборка событий, которые вы сохранили для себя.</p>
        </div>
        <span className="badge">
          {status === 'ready' ? `${items.length} сохранено` : 'Сохранено'}
        </span>
      </section>

      <section className="section">
        <div className={`grid three ${styles.list}`}>
          {status === 'unauthorized' && (
            <div className={styles.empty}>Войдите, чтобы видеть избранное.</div>
          )}
          {status === 'loading' && <div className={styles.empty}>Загрузка избранного...</div>}
          {status === 'error' && <div className={styles.empty}>Не удалось загрузить избранное.</div>}
          {status === 'ready' && items.length === 0 && (
            <div className={styles.empty}>Здесь появятся события, которые вы сохраните.</div>
          )}
          {items.map((event) => (
            <div key={`${event.source}-${event.id}`} className={styles.card}>
              <EventCard event={event} />
              <div className={styles.cardActions}>
                <button
                  className={`button secondary ${styles.remove}`}
                  type="button"
                  onClick={() => handleRemove(event)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Favorites
