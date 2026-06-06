import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEventImageCandidates } from '../utils/pickEventImage.js'
import styles from './EventCard.module.css'

function EventCover({ event, className = '' }) {
  const candidates = useMemo(() => getEventImageCandidates(event), [event])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [event?.id, event?.source, candidates])

  const src = candidates[index]
  const linkTo = `/events/${event.id}?source=${event.source || 'local'}`

  if (!src) {
    return (
      <Link
        to={linkTo}
        className={`${styles.cover} ${styles.coverPlaceholder} ${className}`.trim()}
      >
        <span>Нет фото</span>
      </Link>
    )
  }

  return (
    <Link to={linkTo} className={`${styles.cover} ${className}`.trim()}>
      <img
        src={src}
        alt={event.title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          setIndex((current) => Math.min(current + 1, candidates.length))
        }}
      />
    </Link>
  )
}

export default EventCover
