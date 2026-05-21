const normalizeDateValue = (value, options = {}) => {
  const maxYear = options.maxYear ?? 2100
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && /[-T]/.test(value)) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear()
      return year >= 2000 && year <= maxYear ? parsed : null
    }
  }

  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return null
  const ms = num > 1e12 ? num : num * 1000
  const dateTime = new Date(ms)
  const year = dateTime.getFullYear()
  if (Number.isNaN(dateTime.getTime()) || year < 2000 || year > maxYear) return null
  return dateTime
}

const formatDate = (dateTime) =>
  dateTime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

const formatTime = (dateTime) =>
  dateTime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

const normalizeStartDate = (dateInfo) => {
  if (dateInfo?.start_date) {
    const dateTime = new Date(`${dateInfo.start_date}T${dateInfo.start_time || '00:00:00'}`)
    const year = dateTime.getFullYear()
    if (!Number.isNaN(dateTime.getTime()) && year >= 2000 && year <= 2100) return dateTime
  }
  return normalizeDateValue(dateInfo?.start, { maxYear: 2100 })
}

const normalizeEndDate = (dateInfo) => {
  if (dateInfo?.end_date) {
    const dateTime = new Date(`${dateInfo.end_date}T${dateInfo.end_time || '00:00:00'}`)
    const year = dateTime.getFullYear()
    if (!Number.isNaN(dateTime.getTime()) && year >= 2000 && year <= 2030) return dateTime
  }
  return normalizeDateValue(dateInfo?.end, { maxYear: 2030 })
}

const pickDateLabel = (event) => {
  const rawDates = event?.dates
  const dateItems = Array.isArray(rawDates)
    ? rawDates
    : rawDates
    ? [rawDates]
    : []
  if (dateItems.length === 0) return null

  const findContinuous = dateItems.find((item) =>
    item?.is_continuous || item?.is_endless || item?.is_startless
  )

  if (findContinuous) {
    const startDate = normalizeStartDate(findContinuous)
    const endDate = normalizeEndDate(findContinuous)

    const timeLabel = startDate ? formatTime(startDate) : null
    const endLabel = endDate ? formatDate(endDate) : null

    if (timeLabel && endLabel) return `Ежедневно ${timeLabel} до ${endLabel}`
    if (timeLabel) return `Ежедневно ${timeLabel}`
    if (endLabel) return `Ежедневно до ${endLabel}`
    return 'Ежедневно'
  }

  const validDates = dateItems
    .map((item) => normalizeStartDate(item))
    .filter(Boolean)
  if (validDates.length === 0) {
    const endDates = dateItems
      .map((item) => normalizeEndDate(item))
      .filter(Boolean)
    if (endDates.length === 0) return null
    const endPicked = endDates.sort((a, b) => a - b)[0]
    return `Ежедневно до ${formatDate(endPicked)}`
  }

  const now = Date.now()
  const upcoming = validDates
    .filter((date) => date.getTime() >= now - 24 * 60 * 60 * 1000)
    .sort((a, b) => a - b)
  const picked = (upcoming.length > 0 ? upcoming : validDates.sort((a, b) => a - b))[0]

  return picked.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default pickDateLabel
