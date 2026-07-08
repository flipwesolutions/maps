-- Dev seed: sample verified places (run after migrations)
INSERT INTO verified_places (name, category, street, locality, district, state, country, geom, verification_status, confidence_score, verified_at, source)
VALUES
  ('HSR Layout', 'neighbourhood', '27th Main Road', 'HSR Layout', 'Bengaluru Urban', 'Karnataka', 'India',
   ST_SetSRID(ST_MakePoint(77.6387, 12.9116), 4326), 'approved', 0.95, NOW(), 'flipwi'),
  ('Koramangala', 'neighbourhood', '80 Feet Road', 'Koramangala', 'Bengaluru Urban', 'Karnataka', 'India',
   ST_SetSRID(ST_MakePoint(77.6271, 12.9352), 4326), 'approved', 0.92, NOW(), 'flipwi'),
  ('Flipwi Logistics Hub', 'warehouse', 'Industrial Area', 'Whitefield', 'Bengaluru Urban', 'Karnataka', 'India',
   ST_SetSRID(ST_MakePoint(77.7499, 12.9698), 4326), 'approved', 0.88, NOW(), 'flipwi')
ON CONFLICT DO NOTHING;

INSERT INTO place_aliases (proprietary_table, proprietary_id, alias, language)
SELECT 'verified_places', id, 'HSR', 'en' FROM verified_places WHERE name = 'HSR Layout' LIMIT 1;

INSERT INTO warehouse_locations (name, code, operator, geom, verification_status)
SELECT 'Flipwi Whitefield DC', 'BLR-WF-01', 'Flipwi Solutions', geom, 'approved'
FROM verified_places WHERE name = 'Flipwi Logistics Hub' LIMIT 1
ON CONFLICT DO NOTHING;
