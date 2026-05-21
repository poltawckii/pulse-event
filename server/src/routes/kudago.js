import { Router } from 'express'

const router = Router()
const eventsCache = new Map()
const cacheTtlMs = 60 * 1000

router.get('/events', async (req, res) => {
  const cacheKey = JSON.stringify(req.query)
  const cached = eventsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
    return res.json({ data: cached.data })
  }
  const {
    lat,
    lng,
    radius = '5000',
    location = 'msk',
    categories,
    pageSize = '100',
    pages = '2',
  } = req.query

  const hasGeo = Boolean(lat && lng)
  const pageCount = hasGeo ? 1 : Math.min(Number(pages) || 1, 3)
  const mskOffsetMs = 3 * 60 * 60 * 1000
  const nowMskSeconds = Math.floor((Date.now() + mskOffsetMs) / 1000)

  const params = new URLSearchParams({
    location,
    page_size: pageSize,
    actual_since: String(nowMskSeconds),
    fields: 'id,title,dates,place,price,site_url,categories,images',
    expand: 'place,images',
  })

  if (categories) {
    params.set('categories', categories)
  }

  if (lat && lng) {
    params.set('lat', String(lat))
    params.set('lon', String(lng))
    params.set('radius', String(radius))
  }

  try {
    const requests = Array.from({ length: pageCount }, (_, index) => {
      const pageParams = new URLSearchParams(params)
      pageParams.set('page', String(index + 1))
      return fetch(`https://kudago.com/public-api/v1.4/events/?${pageParams.toString()}`)
    })

    const responses = await Promise.all(requests)
    const failedResponses = responses.filter((response) => !response.ok)
    if (failedResponses.length > 0) {
      const firstFailure = failedResponses[0]
      const failureText = await firstFailure.text()
      console.error('KudaGo request failed:', {
        status: firstFailure.status,
        url: firstFailure.url,
        body: failureText,
      })
      return res.status(502).json({ error: 'KudaGo request failed' })
    }

    const payloads = await Promise.all(responses.map((response) => response.json()))
    const data = payloads.flatMap((payload) =>
      (payload?.results || []).map((event) => {
        const coords = event?.place?.coords
        return {
          source: 'kudago',
          id: event.id,
          title: event.title,
          dates: event.dates,
          price: event.price,
          url: event.site_url,
          categories: event.categories || [],
          place: event.place?.title || null,
          coords: coords ? [coords.lat, coords.lon] : null,
          image: event.images?.[0]?.image || null,
        }
      })
    )

    data.slice(0, 5).forEach((event) => {
      console.log('KudaGo event sample:', event)
    })

    eventsCache.set(cacheKey, { data, timestamp: Date.now() })
    return res.json({ data })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load KudaGo events' })
  }
})

router.get('/events/:id', async (req, res) => {
  const { id } = req.params
  const { lang = 'ru' } = req.query

  const params = new URLSearchParams({
    lang,
    fields: 'id,title,dates,place,price,site_url,categories,description,images',
    expand: 'place,dates,images',
    text_format: 'plain',
  })

  try {
    const response = await fetch(
      `https://kudago.com/public-api/v1.4/events/${id}/?${params.toString()}`
    )

    if (!response.ok) {
      return res.status(502).json({ error: 'KudaGo request failed' })
    }

    const event = await response.json()
    const coords = event?.place?.coords

    return res.json({
      data: {
        source: 'kudago',
        id: event.id,
        title: event.title,
        dates: event.dates,
        price: event.price,
        url: event.site_url,
        categories: event.categories || [],
        place: event.place?.title || null,
        coords: coords ? [coords.lat, coords.lon] : null,
        description: event.description || null,
        images: event.images || [],
      },
    })
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load KudaGo event' })
  }
})

export default router
