import { Router } from 'express'
import pool from '../db/pool.js'
import authMiddleware from '../middleware/auth.js'

const router = Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, city, bio, social_group_id, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        city: user.city,
        bio: user.bio,
        socialGroupId: user.social_group_id,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    console.error('Profile get error:', error)
    return res.status(500).json({ error: 'Profile load failed' })
  }
})

router.put('/', authMiddleware, async (req, res) => {
  const { fullName, socialGroupId, city, bio } = req.body

  try {
    let resolvedGroupId = null

    if (socialGroupId) {
      const parsedId = Number(socialGroupId)
      if (!Number.isNaN(parsedId)) {
        const groupResult = await pool.query(
          'SELECT id FROM social_groups WHERE id = $1',
          [parsedId]
        )
        if (!groupResult.rows.length) {
          return res.status(400).json({ error: 'Unknown social group' })
        }
        resolvedGroupId = parsedId
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1,
           city = $2,
           social_group_id = $3,
           bio = $4
       WHERE id = $5
       RETURNING id, email, full_name, city, bio, social_group_id, created_at`,
      [fullName || null, city || null, resolvedGroupId, bio || null, req.user.id]
    )

    const user = result.rows[0]

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        city: user.city,
        bio: user.bio,
        socialGroupId: user.social_group_id,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return res.status(500).json({ error: 'Profile update failed' })
  }
})

export default router
