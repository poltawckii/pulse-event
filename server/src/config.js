import dotenv from 'dotenv'

dotenv.config()

const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://event_user:event_pass@localhost:5432/event_pulse',
}

export default config
