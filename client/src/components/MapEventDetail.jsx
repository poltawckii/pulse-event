import EventCard from './EventCard.jsx'
import pickDateLabel from '../utils/formatEventDateLabel.js'
import styles from './MapEventDetail.module.css'

function MapEventDetail({ event, status, onClose, onFavorite, onRate }) {
  if (!event) {
    if (status === 'loading') {
      return (
        <div className={styles.panel}>
          <p className="muted">Загрузка события...</p>
        </div>
      )
    }
    return null
  }

  const dateLabel = pickDateLabel(event)
  const priceLabel = (() => {
    if (event.price === 0 || event.price === '0') return 'Бесплатно'
    if (typeof event.price === 'number') return `${event.price} руб.`
    if (typeof event.price === 'string' && event.price.trim().length > 0) {
      return event.price
    }
    return 'Уточняйте'
  })()

  return (
    <div className={styles.panel}>
      <button
        className={styles.closeButton}
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
      >
        ×
      </button>
      <EventCard event={event} onFavorite={onFavorite} onRate={onRate} />
      {status === 'loading' && (
        <p className="muted">Загрузка описания...</p>
      )}
      <div className={styles.extra}>
        <div className={styles.facts}>
          <div>
            <p className="muted">Дата</p>
            <strong>{dateLabel || 'Уточняйте даты'}</strong>
          </div>
          <div>
            <p className="muted">Стоимость</p>
            <strong>{priceLabel}</strong>
          </div>
        </div>
        {event.description && (
          <div className={styles.description}>
            <h4 className={styles.descriptionTitle}>Описание</h4>
            <p>{event.description}</p>
          </div>
        )}
        {event.url && (
          <a className="button secondary" href={event.url} target="_blank" rel="noreferrer">
            Записаться на KudaGo
          </a>
        )}
      </div>
    </div>
  )
}

export default MapEventDetail
