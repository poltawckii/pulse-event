import { Router } from 'express'
import pool from '../db/pool.js'
import authMiddleware from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  const { lat, lng, radius = '5000', location = 'msk' } = req.query

  try {
    const [localRatings, localFavorites, externalRatings, externalFavorites] =
      await Promise.all([
        pool.query(
          `SELECT c.slug, AVG(r.score) AS rating
           FROM ratings r
           JOIN events e ON e.id = r.event_id
           JOIN categories c ON c.id = e.category_id
           WHERE r.user_id = $1
           GROUP BY c.slug`,
          [req.user.id]
        ),
        pool.query(
          `SELECT c.slug, COUNT(*) AS favs
           FROM favorites f
           JOIN events e ON e.id = f.event_id
           JOIN categories c ON c.id = e.category_id
           WHERE f.user_id = $1
           GROUP BY c.slug`,
          [req.user.id]
        ),
        pool.query(
          `SELECT unnest(categories) AS slug, AVG(score) AS rating
           FROM ratings_external
           WHERE user_id = $1 AND categories IS NOT NULL
           GROUP BY slug`,
          [req.user.id]
        ),
        pool.query(
          `SELECT unnest(categories) AS slug, COUNT(*) AS favs
           FROM favorites_external
           WHERE user_id = $1 AND categories IS NOT NULL
           GROUP BY slug`,
          [req.user.id]
        ),
      ])

    const weights = new Map()
    const addWeight = (slug, value) => {
      if (!slug) return
      weights.set(slug, (weights.get(slug) || 0) + value)
    }

    localRatings.rows.forEach((row) => addWeight(row.slug, Number(row.rating) * 2))
    externalRatings.rows.forEach((row) => addWeight(row.slug, Number(row.rating) * 2))
    localFavorites.rows.forEach((row) => addWeight(row.slug, Number(row.favs)))
    externalFavorites.rows.forEach((row) => addWeight(row.slug, Number(row.favs)))

    let topCategories = [...weights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slug]) => slug)

    if (!topCategories.length) {
      const idResult = await pool.query(
        `SELECT DISTINCT external_id
         FROM (
           SELECT external_id FROM ratings_external WHERE user_id = $1
           UNION
           SELECT external_id FROM favorites_external WHERE user_id = $1
         ) AS external_ids
         LIMIT 20`,
        [req.user.id]
      )

      const externalIds = idResult.rows.map((row) => row.external_id)

      if (!externalIds.length) {
        return res.json({ data: [] })
      }

      const detailsParams = new URLSearchParams({
        ids: externalIds.join(','),
        fields: 'id,title,place,price,site_url,categories',
        expand: 'place',
      })

      const detailsResponse = await fetch(
        `https://kudago.com/public-api/v1.4/events/?${detailsParams.toString()}`
      )

      if (!detailsResponse.ok) {
        return res.status(502).json({ error: 'Failed to load KudaGo details' })
      }

      const detailsPayload = await detailsResponse.json()
      const detailEvents = detailsPayload?.results || []

      await Promise.all(
        detailEvents.map((event) => {
          const categories = Array.isArray(event.categories) ? event.categories : null
          if (!categories || !categories.length) return Promise.resolve()

          return Promise.all([
            pool.query(
              `UPDATE ratings_external
               SET categories = $1
               WHERE user_id = $2 AND external_id = $3 AND categories IS NULL`,
              [categories, req.user.id, String(event.id)]
            ),
            pool.query(
              `UPDATE favorites_external
               SET categories = $1
               WHERE user_id = $2 AND external_id = $3 AND categories IS NULL`,
              [categories, req.user.id, String(event.id)]
            ),
          ])
        })
      )

      detailEvents.forEach((event) => {
        if (Array.isArray(event.categories)) {
          event.categories.forEach((category) => addWeight(category, 1))
        }
      })

      topCategories = [...weights.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([slug]) => slug)

      if (!topCategories.length) {
        return res.json({ data: [] })
      }
    }

    const params = new URLSearchParams({
      location,
      page_size: '50',
      categories: topCategories.join(','),
      fields: 'id,title,dates,place,price,site_url,categories',
      expand: 'place',
    })

    if (lat && lng) {
      params.set('lat', String(lat))
      params.set('lon', String(lng))
      params.set('radius', String(radius))
    }

    const response = await fetch(
      `https://kudago.com/public-api/v1.4/events/?${params.toString()}`
    )

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to load KudaGo recommendations' })
    }

    const payload = await response.json()
    const excludeIds = new Set([
      ...externalRatings.rows.map((row) => String(row.external_id)),
      ...externalFavorites.rows.map((row) => String(row.external_id)),
    ])

    const data = (payload?.results || [])
      .filter((event) => !excludeIds.has(String(event.id)))
      .map((event) => ({
        source: 'kudago',
        id: event.id,
        title: event.title,
        dates: event.dates,
        price: event.price,
        url: event.site_url,
        categories: event.categories || [],
        place: event.place?.title || null,
      }))

    return res.json({ data })
  } catch (error) {
    console.error('Recommendations error:', error)
    return res.status(500).json({ error: 'Failed to load recommendations' })
  }
})

export default router
