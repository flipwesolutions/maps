-- Flipwi Maps — core schema
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code CHAR(2) NOT NULL,
  version_tag TEXT NOT NULL UNIQUE,
  source_url TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  osm_timestamp TIMESTAMPTZ,
  status TEXT DEFAULT 'importing' CHECK (status IN ('importing', 'active', 'superseded'))
);

CREATE TABLE IF NOT EXISTS regions (
  code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  bbox GEOMETRY(Polygon, 4326),
  default_crs INT DEFAULT 4326
);

INSERT INTO regions (code, name, bbox) VALUES
  ('IN', 'India', ST_MakeEnvelope(68.0, 6.0, 97.5, 37.5, 4326))
ON CONFLICT (code) DO NOTHING;
