import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'

function Favorites() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')

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
      <section className="section">
        <div className="sectionHeader">
          <h1>Избранное</h1>
          <span className="badge">
            {status === 'ready' ? `${items.length} сохранено` : 'Сохранено'}
          </span>
        </div>
        <div className="grid three">
          {status === 'unauthorized' && (
            <p className="muted">Войдите, чтобы видеть избранное.</p>
          )}
          {items.map((event) => (
            <EventCard key={`${event.source}-${event.id}`} event={event} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Favorites
