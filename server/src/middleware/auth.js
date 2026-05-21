import jwt from 'jsonwebtoken'
import config from '../config.js'

function authMiddleware(req, res, next) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = payload
    return next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export default authMiddleware
