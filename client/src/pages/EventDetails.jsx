import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import pickDateLabel from '../utils/formatEventDateLabel.js'
import { showToast } from '../utils/toast.js'

function EventDetails() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('idle')
  const [rating, setRating] = useState('')
  const [message, setMessage] = useState('')

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
      setMessage('')
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
    setMessage('')
  }

  const handleRate = async (value) => {
    if (!token || !event) {
      showToast('Войдите, чтобы оценивать события', 'error')
      setMessage('')
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
    setMessage('')
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

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <div>
            <span className="badge">{event.category}</span>
            <h1>{event.title}</h1>
            <p className="muted">{event.place || 'Городская площадка'}</p>
          </div>
          <span className="badge">{event.categories?.[0] || 'Событие'}</span>
        </div>
        <div className="grid two">
          <div>
            {event.images?.length > 0 && (
              <img src={event.images[0].image} alt={event.title} />
            )}
            <h3>Описание</h3>
            <p className="muted">{event.description || 'Описание события.'}</p>
            <div className="grid two">
              <div>
                <p className="muted">Дата</p>
                <strong>
                  {dateLabel || 'Уточняйте даты'}
                </strong>
              </div>
              <div>
                <p className="muted">Стоимость</p>
                <strong>{event.price || 'Уточняйте'}</strong>
              </div>
            </div>
          </div>
          <div>
            <h3>Доступность</h3>
            <ul>
              <li>Доступ для колясок</li>
              <li>Социальные помощники</li>
              <li>Зона для семей</li>
            </ul>
          </div>
        </div>
        <div className="sectionHeader">
          {event.url && (
            <a className="button" href={event.url} target="_blank" rel="noreferrer">
              Записаться на KudaGo
            </a>
          )}
          <button className="button secondary" type="button" onClick={handleFavorite}>
            В избранное
          </button>
          <div>
            <label className="muted" htmlFor="ratingSelect">
              Оценить событие
            </label>
            <select
              className="select"
              id="ratingSelect"
              value={rating}
              onChange={(eventTarget) => handleRate(Number(eventTarget.target.value))}
            >
              <option value="">Выберите оценку</option>
              {[5, 4, 3, 2, 1].map((score) => (
                <option key={score} value={score}>
                  {score}
                </option>
              ))}
            </select>
            {rating && <p className="muted">Ваша оценка: {rating}/5</p>}
          </div>
        </div>
        {message && <p className="muted">{message}</p>}
      </section>
    </div>
  )
}

export default EventDetails
