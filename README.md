# Event Pulse Platform

Full-stack project for searching events by category, social group, and geo radius.

## Stack
- Client: React + Vite + CSS Modules
- Server: Node.js + Express
- Database: PostgreSQL + PostGIS
- Maps: Leaflet (Yandex Maps placeholder)
- Auth: JWT

## Project structure
- client/ - React app
- server/ - Express API
- docker-compose.yml - PostGIS database

## Setup
1. Start the database:

```bash
docker compose up -d
```

2. Create schema and seed data:

```bash
psql "postgres://event_user:event_pass@localhost:5432/event_pulse" -f server/db/schema.sql
psql "postgres://event_user:event_pass@localhost:5432/event_pulse" -f server/db/seed.sql
```

3. Configure server env:

```bash
copy server/.env.example server/.env
```

4. Configure client env:

```bash
copy client/.env.example client/.env
```

5. Run the API:

```bash
cd server
npm run dev
```

6. Run the client:

```bash
cd client
npm install
npm run dev
```

## API endpoints
- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/events
- GET /api/events/:id
- GET /api/favorites
- POST /api/favorites
- DELETE /api/favorites/:eventId
- POST /api/ratings
- GET /api/recommendations

## Notes
- Set VITE_YANDEX_MAPS_API_KEY in client/.env to enable Yandex Maps.
- Ensure Node.js 18+ for Vite 5.
