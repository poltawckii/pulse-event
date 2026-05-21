import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'

function Recommendations() {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setStatus('unauthorized')
      return
    }

    const loadRecommendations = async () => {
      setStatus('loading')
      const response = await fetch('/api/recommendations', {
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
  }, [])

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <h1>Рекомендации</h1>
          <span className="badge">
            {status === 'ready' ? 'По вашим оценкам' : 'Персональная подборка'}
          </span>
        </div>
        <div className="grid two">
          {status === 'unauthorized' && (
            <p className="muted">Войдите и оцените события, чтобы увидеть рекомендации.</p>
          )}
          {items.map((event) => (
            <div key={`${event.source}-${event.id}`}>
              <p className="muted">Рекомендуется по оценкам</p>
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Recommendations
