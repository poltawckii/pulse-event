import { Router } from 'express'
import pool from '../db/pool.js'

const router = Router()

router.get('/', async (req, res) => {
  const { category, socialGroup, lat, lng, radius } = req.query

  const values = []
  const conditions = []
  let geoFilter = ''
  let distanceSelect = 'NULL AS distance'

  const addValue = (value) => {
    values.push(value)
    return `$${values.length}`
  }

  if (category) {
    conditions.push(`categories.slug = ${addValue(category)}`)
  }

  if (socialGroup) {
    conditions.push(`social_groups.slug = ${addValue(socialGroup)}`)
  }

  if (lat && lng && radius) {
    const lngParam = addValue(Number(lng))
    const latParam = addValue(Number(lat))
    const radiusParam = addValue(Number(radius))

    distanceSelect = `ST_Distance(
      events.location,
      ST_SetSRID(ST_MakePoint(${lngParam}, ${latParam}), 4326)::geography
    ) AS distance`

    geoFilter = `AND ST_DWithin(
      events.location,
      ST_SetSRID(ST_MakePoint(${lngParam}, ${latParam}), 4326)::geography,
      ${radiusParam}
    )`
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const result = await pool.query(
      `SELECT DISTINCT events.id, events.title, events.description, events.price,
              events.start_at, events.address,
              categories.name AS category,
              ${distanceSelect}
       FROM events
       JOIN categories ON categories.id = events.category_id
       LEFT JOIN event_audience ON event_audience.event_id = events.id
       LEFT JOIN social_groups ON social_groups.id = event_audience.social_group_id
       ${whereClause}
       ${geoFilter}
       ORDER BY events.start_at ASC
       LIMIT 100`,
      values
    )

    return res.json({ data: result.rows })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load events' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT events.id, events.title, events.description, events.price,
              events.start_at, events.address,
              categories.name AS category
       FROM events
       JOIN categories ON categories.id = events.category_id
       WHERE events.id = $1`,
      [req.params.id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' })
    }

    return res.json({ data: result.rows[0] })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load event' })
  }
})

export default router
