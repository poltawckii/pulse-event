export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return trimmed.replace(/^http:\/\//i, 'https://')
}

export function getEventImageCandidates(event) {
  const seen = new Set()
  const candidates = []

  const add = (value) => {
    const normalized = normalizeImageUrl(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    candidates.push(normalized)
  }

  if (event?.image) add(event.image)

  if (Array.isArray(event?.images)) {
    for (const item of event.images) {
      if (typeof item === 'string') add(item)
      else {
        add(item?.image)
        add(item?.url)
      }
    }
  }

  if (Array.isArray(event?.place?.images)) {
    for (const item of event.place.images) {
      add(item?.image)
      add(item?.url)
    }
  }

  add(event?.place?.image)

  return candidates
}

export function pickEventImage(event) {
  return getEventImageCandidates(event)[0] || null
}
