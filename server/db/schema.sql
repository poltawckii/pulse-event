CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS social_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200),
  city VARCHAR(120),
  social_group_id INT REFERENCES social_groups(id),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city VARCHAR(120);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio TEXT;

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT REFERENCES categories(id),
  start_at TIMESTAMP NOT NULL,
  price NUMERIC(10, 2) DEFAULT 0,
  address VARCHAR(255),
  location GEOGRAPHY(POINT, 4326) NOT NULL
);

CREATE TABLE IF NOT EXISTS event_audience (
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  social_group_id INT REFERENCES social_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, social_group_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS favorites_external (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(40) NOT NULL,
  external_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  place VARCHAR(255),
  url TEXT,
  price VARCHAR(255),
  categories TEXT[],
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, source, external_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS ratings_external (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(40) NOT NULL,
  external_id VARCHAR(64) NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  title VARCHAR(255) NOT NULL,
  place VARCHAR(255),
  url TEXT,
  price VARCHAR(255),
  categories TEXT[],
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, source, external_id)
);

ALTER TABLE favorites_external
  ADD COLUMN IF NOT EXISTS categories TEXT[];

ALTER TABLE favorites_external
  ADD COLUMN IF NOT EXISTS image TEXT;

ALTER TABLE favorites_external
  ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE ratings_external
  ADD COLUMN IF NOT EXISTS categories TEXT[];

ALTER TABLE ratings_external
  ADD COLUMN IF NOT EXISTS image TEXT;

ALTER TABLE ratings_external
  ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
