import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import pickDateLabel from '../utils/formatEventDateLabel.js'
import formatEventCategory from '../utils/formatEventCategory.js'
import pickEventImage from '../utils/pickEventImage.js'
import { showToast } from '../utils/toast.js'
import styles from './EventDetails.module.css'

function formatPrice(price) {
  if (price === 0 || price === '0') return 'Бесплатно'
  if (typeof price === 'number') return `${price} руб.`
  if (typeof price === 'string' && price.trim().length > 0) return price
  return 'Уточняйте'
}

function EventDetails() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('idle')
  const [rating, setRating] = useState('')
  const [hoverRating, setHoverRating] = useState(0)

  const ratingLabels = {
    5: 'Превосходно!',
    4: 'Очень хорошо',
    3: 'Неплохо',
    2: 'Так себе',
    1: 'Не понравилось',
  }

  useEffect(() => {
    const source = searchParams.get('source') || 'kudago'
    const loadEvent = async () => {
      setStatus('loading')
      try {
        if (source === 'kudago') {
          const response = await fetch(`/api/kudago/events/${id}`)
          const payload = await response.json()
          if (!response.ok) {
            throw new Error(payload.error || 'Не удалось загрузить событие')
          }
          setEvent(payload.data)
          setStatus('ready')
          return
        }

        setStatus('error')
      } catch (error) {
        setStatus('error')
      }
    }

    loadEvent()
  }, [id, searchParams])

  const token = localStorage.getItem('auth_token')

  const handleFavorite = async () => {
    if (!token || !event) {
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

  const handleRate = async (value) => {
    if (!token || !event) {
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
          image: event.image || null,
          tags: event.tags || [],
          score: value,
        }
      : { eventId: event.id, score: value }

    const response = await fetch('/api/ratings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    setRating(value)
    showToast(
      response.ok ? `Оценка ${value}/5 сохранена` : 'Не удалось сохранить оценку',
      response.ok ? 'success' : 'error'
    )
  }

  if (status === 'loading') {
    return (
      <div className="page">
        <section className="section">
          <p className="muted">Загрузка события...</p>
        </section>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page">
        <section className="section">
          <p className="muted">Событие не найдено.</p>
        </section>
      </div>
    )
  }

  const dateLabel = pickDateLabel(event)
  const priceLabel = formatPrice(event.price)
  const heroImage = pickEventImage(event)
  const activeRating = hoverRating || Number(rating) || 0
  const primaryCategory = formatEventCategory(
    event.categories?.[0] || event.category
  )
  const isFree = priceLabel === 'Бесплатно'

  return (
    <div className="page">
      <section className="section">
        <header className={styles.pageHeader}>
          <div className={styles.titleBlock}>
            <span className="badge">{primaryCategory}</span>
            <h1>{event.title}</h1>
            <p className="muted">{event.place || 'Городская площадка'}</p>
          </div>

          <div className={styles.headerAside}>
            <div
              className={`${styles.priceStamp} ${isFree ? styles.priceStampFree : ''}`}
            >
              <span className={styles.priceStampLabel}>Билеты</span>
              <span className={styles.priceStampValue}>{priceLabel}</span>
            </div>

            {dateLabel && (
              <p className={styles.headerSchedule}>
                <span className={styles.headerScheduleIcon} aria-hidden="true">
                  📅
                </span>
                {dateLabel}
              </p>
            )}

            {rating > 0 && (
              <p className={styles.headerUserRating}>
                Ваша оценка: <strong>★ {rating}</strong>
              </p>
            )}
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.main}>
            {heroImage && (
              <img className={styles.heroImage} src={heroImage} alt={event.title} />
            )}
            <h2 className={styles.descriptionTitle}>Описание</h2>
            <p className={styles.description}>
              {event.description || 'Описание события пока не указано.'}
            </p>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.facts}>
              <div>
                <p className={`muted ${styles.factLabel}`}>Дата</p>
                <p className={styles.factValue}>{dateLabel || 'Уточняйте даты'}</p>
              </div>
              <div>
                <p className={`muted ${styles.factLabel}`}>Стоимость</p>
                <p className={styles.factValue}>{priceLabel}</p>
              </div>
            </div>

            {(event.place || event.categories?.length > 0) && (
              <div className={styles.badges}>
                {event.place && <span className="badge">{event.place}</span>}
                {event.categories?.map((category) => (
                  <span key={category} className="badge">
                    {formatEventCategory(category)}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.actions}>
              {event.url && (
                <a
                  className={`button ${styles.actionButton}`}
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Записаться на KudaGo
                </a>
              )}
              <button
                className={`button secondary ${styles.actionButton}`}
                type="button"
                onClick={handleFavorite}
              >
                В избранное
              </button>
            </div>

            <div className={styles.ratingBlock}>
              <p className={styles.ratingTitle}>Оцените событие</p>
              <p className={styles.ratingHint}>
                {activeRating
                  ? `${ratingLabels[activeRating]} · ${activeRating} из 5`
                  : 'Нажмите на звезду'}
              </p>
              <div
                className={styles.stars}
                role="radiogroup"
                aria-label="Оценка события"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`${styles.star} ${
                      score <= activeRating ? styles.starActive : ''
                    }`}
                    onClick={() => handleRate(score)}
                    onMouseEnter={() => setHoverRating(score)}
                    onFocus={() => setHoverRating(score)}
                    onBlur={() => setHoverRating(0)}
                    aria-label={`${score} из 5`}
                    aria-pressed={Number(rating) === score}
                  >
                    <span aria-hidden="true">★</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className={styles.accessibilityTitle}>Доступность</h3>
              <ul className={styles.accessibilityList}>
                <li>Доступ для колясок</li>
                <li>Социальные помощники</li>
                <li>Зона для семей</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

export default EventDetails
