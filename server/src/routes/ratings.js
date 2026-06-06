import { Router } from 'express'
import pool from '../db/pool.js'
import authMiddleware from '../middleware/auth.js'
import { normalizeImageUrl } from '../utils/kudagoImage.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const localResult = await pool.query(
      `SELECT events.id, events.title, events.address, ratings.score
       FROM ratings
       JOIN events ON events.id = ratings.event_id
       WHERE ratings.user_id = $1
       ORDER BY ratings.created_at DESC`,
      [req.user.id]
    )

    const externalResult = await pool.query(
      `SELECT external_id, title, place, url, price, score, source, image
       FROM ratings_external
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    const local = localResult.rows.map((row) => ({
      source: 'local',
      id: row.id,
      title: row.title,
      place: row.address,
      score: row.score,
    }))

    const external = externalResult.rows.map((row) => ({
      source: row.source,
      id: row.external_id,
      title: row.title,
      place: row.place,
      url: row.url,
      price: row.price,
      score: row.score,
      image: normalizeImageUrl(row.image),
    }))

    return res.json({ data: [...external, ...local] })
  } catch (error) {
    console.error('Ratings list error:', error)
    return res.status(500).json({ error: 'Failed to load ratings' })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  const { eventId, score, source, externalId, title, place, url, price, categories, image, tags } = req.body

  if (!score) {
    return res.status(400).json({ error: 'Score is required' })
  }

  if (source === 'kudago') {
    if (!externalId || !title) {
      return res.status(400).json({ error: 'External event data is required' })
    }

    try {
      await pool.query(
        `INSERT INTO ratings_external
         (user_id, source, external_id, score, title, place, url, price, categories, image, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (user_id, source, external_id)
         DO UPDATE SET score = EXCLUDED.score, tags = EXCLUDED.tags`,
        [
          req.user.id,
          source,
          String(externalId),
          score,
          title,
          place || null,
          url || null,
          price || null,
          Array.isArray(categories) ? categories : null,
          normalizeImageUrl(image) || null,
          Array.isArray(tags) && tags.length ? tags : null,
        ]
      )

      return res.status(201).json({ status: 'ok' })
    } catch (error) {
      console.error('Ratings external error:', error)
      return res.status(500).json({ error: 'Failed to save rating' })
    }
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  try {
    await pool.query(
      `INSERT INTO ratings (user_id, event_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET score = EXCLUDED.score`,
      [req.user.id, eventId, score]
    )

    return res.status(201).json({ status: 'ok' })
  } catch (error) {
    console.error('Ratings local error:', error)
    return res.status(500).json({ error: 'Failed to save rating' })
  }
})

router.delete('/:eventId', authMiddleware, async (req, res) => {
  const { source } = req.query

  try {
    if (source === 'kudago') {
      await pool.query(
        `DELETE FROM ratings_external
         WHERE user_id = $1 AND source = $2 AND external_id = $3`,
        [req.user.id, source, String(req.params.eventId)]
      )

      return res.json({ status: 'ok' })
    }

    await pool.query(
      `DELETE FROM ratings
       WHERE user_id = $1 AND event_id = $2`,
      [req.user.id, req.params.eventId]
    )

    return res.json({ status: 'ok' })
  } catch (error) {
    console.error('Ratings delete error:', error)
    return res.status(500).json({ error: 'Failed to remove rating' })
  }
})

export default router
