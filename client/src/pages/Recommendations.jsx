import { useEffect, useState } from 'react'
import EventCard from '../components/EventCard.jsx'
import formatEventCategory from '../utils/formatEventCategory.js'
import styles from './Recommendations.module.css'

const SUGGESTION_SLUGS = ['concert', 'theater', 'festival', 'recreation', 'quest', 'tour', 'cinema', 'education']

function InsightsPanel({ insights }) {
  if (!insights) return null

  const { topCategories, dislikedCategories, totalRated, totalFavorited } = insights
  if (!topCategories?.length) return null

  const maxWeight = topCategories[0]?.weight || 1
  const knownSlugs = new Set(topCategories.map((c) => c.slug))

  // Пустые категории — те которых ещё нет у пользователя, до 3 штук
  const emptySuggestions = SUGGESTION_SLUGS
    .filter((s) => !knownSlugs.has(s))
    .slice(0, Math.max(0, 5 - topCategories.length))

  return (
    <section className={`section ${styles.insights}`}>
      <h2 className={styles.insightsTitle}>Ваши предпочтения</h2>
      <p className="muted">На основе ваших оценок и избранного мы определили, что вам интересно.</p>

      <div className={styles.insightsBody}>
        <div className={styles.insightsCats}>
          {topCategories.map(({ slug, weight }) => (
            <div key={slug} className={styles.catRow}>
              <span className={styles.catLabel}>{formatEventCategory(slug)}</span>
              <div className={styles.catBar}>
                <div
                  className={styles.catBarFill}
                  style={{ width: `${Math.round((weight / maxWeight) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          {emptySuggestions.map((slug) => (
            <div key={slug} className={`${styles.catRow} ${styles.catRowEmpty}`}>
              <span className={styles.catLabel}>{formatEventCategory(slug)}</span>
              <div className={styles.catBar}>
                <div className={styles.catBarEmpty} />
              </div>
              <span className={styles.catHint}>Оцените события</span>
            </div>
          ))}
        </div>

        <div className={styles.insightsStats}>
          <div className={styles.insightsStat}>
            <strong>{totalRated}</strong>
            <span>оценено</span>
          </div>
          <div className={styles.insightsStat}>
            <strong>{totalFavorited}</strong>
            <span>в избранном</span>
          </div>
          {dislikedCategories?.length > 0 && (
            <div className={styles.disliked}>
              <span className="muted">Не нравятся:</span>
              <div className={styles.dislikedList}>
                {dislikedCategories.map((slug) => (
                  <span key={slug} className={styles.dislikedBadge}>
                    {formatEventCategory(slug)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Recommendations() {
  const [items, setItems] = useState([])
  const [insights, setInsights] = useState(null)
  const [status, setStatus] = useState('idle')
  const [basis, setBasis] = useState('ratings')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setStatus('unauthorized')
      return
    }

    const load = async () => {
      setStatus('loading')
      const response = await fetch(`/api/recommendations?basis=${basis}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (response.ok) {
        setItems(payload.data || [])
        setInsights(payload.insights || null)
        setStatus('ready')
      } else {
        setStatus('error')
      }
    }

    load()
  }, [basis])

  return (
    <div className="page">
      <section className={`section ${styles.header}`}>
        <div>
          <h1>Рекомендации</h1>
          <p className="muted">Персональная подборка на основе ваших интересов.</p>
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
          {status === 'ready' && (
            <span className="badge">{items.length} событий</span>
          )}
        </div>
      </section>

      {status === 'ready' && <InsightsPanel insights={insights} />}

      <section className="section">
        {status === 'unauthorized' && (
          <div className={styles.empty}>
            Войдите и оцените события, чтобы увидеть рекомендации.
          </div>
        )}
        {status === 'loading' && (
          <div className={styles.loadingGrid}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skeletonImg} />
                <div className={styles.skeletonLine} style={{ width: '75%' }} />
                <div className={styles.skeletonLine} style={{ width: '50%' }} />
              </div>
            ))}
          </div>
        )}
        {status === 'error' && (
          <div className={styles.empty}>Не удалось получить рекомендации.</div>
        )}
        {status === 'ready' && items.length === 0 && (
          <div className={styles.empty}>
            Пока нет персональных рекомендаций — оцените несколько событий в каталоге.
          </div>
        )}
        {status === 'ready' && items.length > 0 && (
          <div className={`grid three ${styles.list}`}>
            {items.map((event) => (
              <div key={`${event.source}-${event.id}`} className={styles.card}>
                {event.reason && (
                  <span className={styles.reason}>{event.reason}</span>
                )}
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Recommendations
