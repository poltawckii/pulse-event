import { Router } from 'express'

const router = Router()

const geocoderKey = process.env.YANDEX_GEOCODER_KEY
const moskowBox = '35.0,54.3~41.5,56.9'

router.get('/', async (req, res) => {
  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' })
  }

  if (!geocoderKey) {
    console.error('Geocoder key is missing. Set YANDEX_GEOCODER_KEY in server/.env')
    return res.status(500).json({ error: 'Geocoder key is not configured' })
  }

  const params = new URLSearchParams({
    geocode: address,
    format: 'json',
    apikey: geocoderKey,
    bbox: moskowBox,
    rspn: '1',
    lang: 'ru_RU',
  })

  try {
    const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params.toString()}`)
    if (!response.ok) {
      const text = await response.text()
      console.error('Geocoder request failed:', {
        status: response.status,
        url: response.url,
        body: text,
      })
      return res.status(502).json({ error: 'Geocoder request failed', details: text })
    }

    const payload = await response.json()
    const member = payload?.response?.GeoObjectCollection?.featureMember?.[0]
    const pos = member?.GeoObject?.Point?.pos
    if (!pos) {
      return res.status(404).json({ error: 'Address not found' })
    }

    const [lon, lat] = pos.split(' ').map(Number)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(500).json({ error: 'Invalid geocoder response' })
    }

    return res.json({ data: { lat, lon } })
  } catch (error) {
    console.error('Geocoder error:', error)
    return res.status(500).json({ error: 'Geocoder error' })
  }
})

export default router
