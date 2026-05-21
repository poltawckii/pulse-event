INSERT INTO categories (name, slug) VALUES
  ('Sport', 'sport'),
  ('Culture', 'culture'),
  ('Education', 'education'),
  ('Leisure', 'leisure')
ON CONFLICT DO NOTHING;

INSERT INTO social_groups (name, slug) VALUES
  ('Youth', 'youth'),
  ('Seniors', 'seniors'),
  ('Families', 'families'),
  ('People with disabilities', 'disabled')
ON CONFLICT DO NOTHING;

INSERT INTO events (title, description, category_id, start_at, price, address, location)
VALUES
  (
    'Riverfront Yoga Morning',
    'Open-air yoga session with instructors and accessibility support.',
    1,
    '2026-06-15 09:00:00+03',
    0,
    'Central embankment, pier 4',
    ST_SetSRID(ST_MakePoint(37.618423, 55.751244), 4326)
  ),
  (
    'Museum Night Tour',
    'Evening cultural tour with guided storytelling.',
    2,
    '2026-06-18 19:00:00+03',
    450,
    'City history museum',
    ST_SetSRID(ST_MakePoint(37.606, 55.757), 4326)
  ),
  (
    'Digital Skills Workshop',
    'Hands-on training on everyday digital tools.',
    3,
    '2026-06-20 12:00:00+03',
    200,
    'Tech hub, hall B',
    ST_SetSRID(ST_MakePoint(37.632, 55.761), 4326)
  )
ON CONFLICT DO NOTHING;
