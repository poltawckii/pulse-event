import express from 'express'
import cors from 'cors'
import config from './config.js'
import pool from './db/pool.js'
import authRoutes from './routes/auth.js'
import eventsRoutes from './routes/events.js'
import favoritesRoutes from './routes/favorites.js'
import ratingsRoutes from './routes/ratings.js'
import recommendationsRoutes from './routes/recommendations.js'
import kudagoRoutes from './routes/kudago.js'
import geocodeRoutes from './routes/geocode.js'
import profileRoutes from './routes/profile.js'

await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`).catch(() => {})
await pool.query(`ALTER TABLE ratings_external ADD COLUMN IF NOT EXISTS tags TEXT[]`).catch(() => {})
await pool.query(`ALTER TABLE favorites_external ADD COLUMN IF NOT EXISTS tags TEXT[]`).catch(() => {})

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api/ratings', ratingsRoutes)
app.use('/api/recommendations', recommendationsRoutes)
app.use('/api/kudago', kudagoRoutes)
app.use('/api/geocode', geocodeRoutes)
app.use('/api/profile', profileRoutes)

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`)
})
