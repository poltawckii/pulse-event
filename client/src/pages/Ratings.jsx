import { useEffect, useState } from 'react'

function Ratings() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')

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
      <section className="section">
        <div className="sectionHeader">
          <h1>Ваши оценки</h1>
          <span className="badge">
            {status === 'ready' ? `${items.length} оценено` : 'Список оценок'}
          </span>
        </div>
        {status === 'unauthorized' && (
          <p className="muted">Войдите, чтобы увидеть оценки.</p>
        )}
        <div className="grid two">
          {items.map((event) => (
            <div key={`${event.source}-${event.id}`} className="section">
              <div className="sectionHeader">
                <div>
                  <h3>{event.title}</h3>
                  <p className="muted">{event.place || 'Городская площадка'}</p>
                </div>
                <span className="badge">Оценка: {event.score}</span>
              </div>
              {event.url && (
                <a className="muted" href={event.url} target="_blank" rel="noreferrer">
                  Открыть событие
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Ratings
