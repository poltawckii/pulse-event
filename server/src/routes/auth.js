import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import config from '../config.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { email, password, socialGroupId, fullName } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

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
      `INSERT INTO users (email, password_hash, social_group_id, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, social_group_id`,
      [email, passwordHash, resolvedGroupId, fullName || null]
    )

    const user = result.rows[0]
    const token = jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: '12h',
    })

    return res.status(201).json({ user, token })
  } catch (error) {
    console.error('Auth register error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' })
    }
    return res.status(500).json({ error: 'Registration failed', details: error.message })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, social_group_id
       FROM users
       WHERE email = $1`,
      [email]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: '12h',
    })

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        socialGroupId: user.social_group_id,
      },
      token,
    })
  } catch (error) {
    console.error('Auth login error:', error)
    return res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    jwt.verify(token, config.jwtSecret)
    return res.json({ ok: true })
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
})

export default router
