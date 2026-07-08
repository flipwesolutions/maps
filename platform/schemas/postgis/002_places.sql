-- Admin boundaries & places (populated by osm-import pipeline)

CREATE TABLE IF NOT EXISTS admin_boundaries (
  id BIGSERIAL PRIMARY KEY,
  osm_id BIGINT UNIQUE,
  region_code CHAR(2) NOT NULL REFERENCES regions(code),
  admin_level SMALLINT,
  name TEXT NOT NULL,
  name_native TEXT,
  alt_names TEXT[],
  population BIGINT DEFAULT 0,
  importance REAL DEFAULT 0,
  geom GEOMETRY(MultiPolygon, 4326),
  centroid GEOMETRY(Point, 4326),
  parent_id BIGINT REFERENCES admin_boundaries(id),
  dataset_version_id UUID REFERENCES dataset_versions(id)
);

CREATE TABLE IF NOT EXISTS places (
  id BIGSERIAL PRIMARY KEY,
  osm_type TEXT NOT NULL,
  osm_id BIGINT NOT NULL,
  region_code CHAR(2) NOT NULL REFERENCES regions(code),
  category TEXT,
  subcategory TEXT,
  name TEXT NOT NULL,
  names_i18n JSONB DEFAULT '{}',
  house_number TEXT,
  street TEXT,
  locality TEXT,
  village TEXT,
  town TEXT,
  district TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'India',
  geom GEOMETRY(Point, 4326) NOT NULL,
  geom_area GEOMETRY(Polygon, 4326),
  population BIGINT DEFAULT 0,
  importance REAL DEFAULT 0,
  tags JSONB DEFAULT '{}',
  dataset_version_id UUID REFERENCES dataset_versions(id),
  UNIQUE (osm_type, osm_id)
);

CREATE TABLE IF NOT EXISTS roads (
  id BIGSERIAL PRIMARY KEY,
  osm_id BIGINT UNIQUE,
  region_code CHAR(2) NOT NULL,
  name TEXT,
  highway TEXT,
  geom GEOMETRY(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_places_geom ON places USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_region ON places (region_code);
CREATE INDEX IF NOT EXISTS idx_admin_geom ON admin_boundaries USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_roads_geom ON roads USING GIST (geom);
