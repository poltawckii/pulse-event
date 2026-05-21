import { Router } from 'express'
import pool from '../db/pool.js'
import authMiddleware from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const localResult = await pool.query(
      `SELECT events.id, events.title, events.start_at, events.address
       FROM favorites
       JOIN events ON events.id = favorites.event_id
       WHERE favorites.user_id = $1
       ORDER BY favorites.created_at DESC`,
      [req.user.id]
    )

    const externalResult = await pool.query(
      `SELECT external_id, title, place, url, price, source, created_at
       FROM favorites_external
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    const local = localResult.rows.map((event) => ({
      source: 'local',
      id: event.id,
      title: event.title,
      startAt: event.start_at,
      place: event.address,
    }))

    const external = externalResult.rows.map((event) => ({
      source: event.source,
      id: event.external_id,
      title: event.title,
      place: event.place,
      url: event.url,
      price: event.price,
    }))

    return res.json({ data: [...external, ...local] })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load favorites' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  const { eventId, source, externalId, title, place, url, price, categories } = req.body

  if (source === 'kudago') {
    if (!externalId || !title) {
      return res.status(400).json({ error: 'External event data is required' })
    }

    try {
      await pool.query(
        `INSERT INTO favorites_external
         (user_id, source, external_id, title, place, url, price, categories)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          req.user.id,
          source,
          String(externalId),
          title,
          place || null,
          url || null,
          price || null,
          Array.isArray(categories) ? categories : null,
        ]
      )

      return res.status(201).json({ status: 'ok' })
    } catch (error) {
      console.error('Favorites external error:', error)
      return res.status(500).json({ error: 'Failed to add favorite' })
    }
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  try {
    await pool.query(
      `INSERT INTO favorites (user_id, event_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user.id, eventId]
    )

    return res.status(201).json({ status: 'ok' })
  } catch (error) {
    console.error('Favorites local error:', error)
    return res.status(500).json({ error: 'Failed to add favorite' })
  }
})

router.delete('/:eventId', authMiddleware, async (req, res) => {
  const { source } = req.query
  try {
    if (source === 'kudago') {
      await pool.query(
        `DELETE FROM favorites_external
         WHERE user_id = $1 AND source = $2 AND external_id = $3`,
        [req.user.id, source, String(req.params.eventId)]
      )

      return res.json({ status: 'ok' })
    }

    await pool.query(
      `DELETE FROM favorites
       WHERE user_id = $1 AND event_id = $2`,
      [req.user.id, req.params.eventId]
    )

    return res.json({ status: 'ok' })
  } catch (error) {
    console.error('Favorites delete error:', error)
    return res.status(500).json({ error: 'Failed to remove favorite' })
  }
})

export default router
