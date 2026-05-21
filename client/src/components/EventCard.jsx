import { Link } from 'react-router-dom'
import styles from './EventCard.module.css'
import pickDateLabel from '../utils/formatEventDateLabel.js'

function EventCard({ event, onFavorite, onRate }) {
  const tags = event.tags || event.categories || []
  const hasRating = typeof event.rating === 'number'
  const dateLabel = pickDateLabel(event)
  const priceLabel = (() => {
    if (event.price === 0 || event.price === '0') return 'Бесплатно'
    if (typeof event.price === 'string' && event.price.trim().length > 0) {
      const trimmed = event.price.trim()
      if (trimmed.length <= 60) return trimmed
      const shortened = trimmed.slice(0, 57).trimEnd()
      return `${shortened}...`
    }
    if (typeof event.price === 'number') return `${event.price} руб.`
    return 'Уточняйте'
  })()

  return (
    <article className={styles.card}>
      {event.image && (
        <Link
          to={`/events/${event.id}?source=${event.source || 'local'}`}
          className={styles.cover}
        >
          <img src={event.image} alt={event.title} loading="lazy" />
        </Link>
      )}
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>
            <Link to={`/events/${event.id}?source=${event.source || 'local'}`}>
              {event.title}
            </Link>
          </h3>
          <p className="muted">{event.place || event.location || 'Городская площадка'}</p>
        </div>
        {hasRating && <span className={styles.rating}>{event.rating.toFixed(1)}</span>}
      </header>
      <div className={styles.meta}>
        {event.category && <span className="badge">{event.category}</span>}
        {event.distance && <span className="badge">{event.distance} км</span>}
        <span className="badge">{dateLabel || 'Уточняйте даты'}</span>
        <span className="badge">{priceLabel}</span>
      </div>
      {tags.length > 0 && (
        <ul className={styles.tags}>
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
      <div className={styles.footer}>
        <Link className="button" to={`/events/${event.id}?source=${event.source || 'local'}`}>
          Открыть
        </Link>
        <button
          className="button secondary"
          type="button"
          onClick={() => onFavorite?.(event)}
        >
          В избранное
        </button>
        <select
          className="select"
          defaultValue=""
          onChange={(eventTarget) =>
            onRate?.(event, Number(eventTarget.target.value))
          }
        >
          <option value="">Оценить</option>
          {[5, 4, 3, 2, 1].map((score) => (
            <option key={score} value={score}>
              {score}
            </option>
          ))}
        </select>
      </div>
    </article>
  )
}

export default EventCard
