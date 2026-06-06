import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pickDateLabel from '../utils/formatEventDateLabel.js'
import formatEventCategory from '../utils/formatEventCategory.js'
import pickEventImage from '../utils/pickEventImage.js'
import styles from './Favorites.module.css'

function formatPrice(price) {
  if (price === 0 || price === '0') return 'Бесплатно'
  if (typeof price === 'number') return `${price} руб.`
  if (typeof price === 'string' && price.trim().length > 0) {
    const trimmed = price.trim()
    if (trimmed.length <= 40) return trimmed
    return `${trimmed.slice(0, 37).trimEnd()}...`
  }
  return 'Уточняйте'
}

function FavoriteItem({ event, onRemove }) {
  const image = pickEventImage(event)
  const dateLabel = pickDateLabel(event)
  const priceLabel = formatPrice(event.price)
  const categories = event.categories || (event.category ? [event.category] : [])
  const isFree = priceLabel === 'Бесплатно'

  return (
    <article className={styles.item}>
      <Link
        className={styles.thumb}
        to={`/events/${event.id}?source=${event.source || 'local'}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {image
          ? <img src={image} alt="" />
          : <div className={styles.thumbPlaceholder}>{(event.title || '?')[0]}</div>
        }
      </Link>

      <div className={styles.body}>
        <div className={styles.bodyTop}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>
              <Link to={`/events/${event.id}?source=${event.source || 'local'}`}>
                {event.title}
              </Link>
            </h3>
            {categories.length > 0 && (
              <ul className={styles.cats}>
                {categories.slice(0, 2).map((cat) => (
                  <li key={cat} className={styles.catBadge}>
                    {formatEventCategory(cat)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(event.place || event.location) && (
            <p className={styles.place}>
              {event.place || event.location}
            </p>
          )}
        </div>

        <div className={styles.bodyBottom}>
          <div className={styles.meta}>
            {dateLabel && <span className={styles.metaItem}>📅 {dateLabel}</span>}
            <span className={`${styles.metaItem} ${isFree ? styles.free : ''}`}>
              💰 {priceLabel}
            </span>
          </div>

          <div className={styles.actions}>
            <Link
              className={`button ${styles.openBtn}`}
              to={`/events/${event.id}?source=${event.source || 'local'}`}
            >
              Открыть
            </Link>
            <button
              className={styles.removeBtn}
              type="button"
              onClick={() => onRemove(event)}
              aria-label="Удалить из избранного"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function Favorites() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')

  const handleRemove = async (event) => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    const response = await fetch(
      `/api/favorites/${event.id}?source=${encodeURIComponent(event.source || 'local')}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
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
        {status === 'ready' && (
          <span className="badge">{items.length} сохранено</span>
        )}
      </section>

      <section className="section">
        {status === 'unauthorized' && (
          <div className={styles.empty}>Войдите, чтобы видеть избранное.</div>
        )}
        {status === 'loading' && (
          <div className={styles.empty}>Загрузка избранного...</div>
        )}
        {status === 'error' && (
          <div className={styles.empty}>Не удалось загрузить избранное.</div>
        )}
        {status === 'ready' && items.length === 0 && (
          <div className={styles.empty}>
            Здесь появятся события, которые вы сохраните.
          </div>
        )}
        {status === 'ready' && items.length > 0 && (
          <ul className={styles.list}>
            {items.map((event) => (
              <li key={`${event.source}-${event.id}`}>
                <FavoriteItem event={event} onRemove={handleRemove} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Favorites
