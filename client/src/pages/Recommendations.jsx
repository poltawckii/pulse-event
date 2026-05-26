import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'
import styles from './Recommendations.module.css'

function Recommendations() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [basis, setBasis] = useState('ratings')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setStatus('unauthorized')
      return
    }

    const loadRecommendations = async () => {
      setStatus('loading')
      const response = await fetch(`/api/recommendations?basis=${basis}`, {
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

    loadRecommendations()
  }, [basis])

  return (
    <div className="page">
      <section className={`section ${styles.header}`}>
        <div>
          <h1>Рекомендации</h1>
          <p className="muted">Выберите основу для персональной подборки.</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.switcher}>
            <button
              className={basis === 'ratings' ? styles.active : ''}
              type="button"
              onClick={() => setBasis('ratings')}
            >
              По оценкам
            </button>
            <button
              className={basis === 'favorites' ? styles.active : ''}
              type="button"
              onClick={() => setBasis('favorites')}
            >
              По избранному
            </button>
          </div>
          <span className="badge">
            {status === 'ready' ? `${items.length} событий` : 'Персональная подборка'}
          </span>
        </div>
      </section>

      <section className="section">
        <div className={`grid three ${styles.list}`}>
          {status === 'unauthorized' && (
            <div className={styles.empty}>
              <p>Войдите и оцените события, чтобы увидеть рекомендации.</p>
            </div>
          )}
          {status === 'loading' && <div className={styles.empty}>Загрузка подборки...</div>}
          {status === 'error' && <div className={styles.empty}>Не удалось получить рекомендации.</div>}
          {status === 'ready' && items.length === 0 && (
            <div className={styles.empty}>Пока нет персональных рекомендаций.</div>
          )}
          {items.map((event) => (
            <div className={styles.card} key={`${event.source}-${event.id}`}>
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Recommendations
