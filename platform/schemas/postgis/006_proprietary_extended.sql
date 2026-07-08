-- Flipwi Proprietary Platform — extended tables (Layer 2–7)
-- Never modifies planet_osm_* or OSM base tables.

-- OSM ↔ proprietary linkage (never merge into OSM tables)
CREATE TABLE IF NOT EXISTS osm_place_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_type TEXT NOT NULL,
  osm_id BIGINT NOT NULL,
  proprietary_table TEXT NOT NULL,
  proprietary_id UUID NOT NULL,
  match_confidence REAL DEFAULT 1,
  match_method TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (osm_type, osm_id, proprietary_table, proprietary_id)
);

CREATE TABLE IF NOT EXISTS verified_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_place_id UUID REFERENCES verified_places(id),
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  gst_number TEXT,
  category_id UUID,
  phone TEXT,
  website TEXT,
  opening_hours JSONB DEFAULT '{}',
  verification_status flipwi_verification_status DEFAULT 'pending',
  confidence_score REAL DEFAULT 0,
  claim_status TEXT DEFAULT 'unclaimed' CHECK (claim_status IN ('unclaimed', 'pending', 'claimed', 'rejected')),
  claimed_by TEXT,
  verified_at TIMESTAMPTZ,
  geom GEOMETRY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES business_categories(id),
  icon TEXT,
  sort_order INT DEFAULT 0
);

ALTER TABLE verified_businesses
  ADD CONSTRAINT fk_business_category
  FOREIGN KEY (category_id) REFERENCES business_categories(id);

CREATE TABLE IF NOT EXISTS verified_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  landmark_type TEXT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  verification_status flipwi_verification_status DEFAULT 'approved',
  confidence_score REAL DEFAULT 0.8,
  osm_type TEXT,
  osm_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verified_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  building_type TEXT,
  floors INT,
  geom GEOMETRY(Polygon, 4326),
  centroid GEOMETRY(Point, 4326) NOT NULL,
  verification_status flipwi_verification_status DEFAULT 'pending',
  confidence_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES verified_buildings(id),
  name TEXT NOT NULL,
  block TEXT,
  tower TEXT,
  floor_count INT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  verification_status flipwi_verification_status DEFAULT 'pending',
  delivery_success_rate REAL,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS building_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES verified_buildings(id),
  verified_address_id UUID REFERENCES verified_addresses(id),
  label TEXT DEFAULT 'exit',
  exit_type TEXT DEFAULT 'main',
  geom GEOMETRY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS place_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietary_table TEXT NOT NULL,
  proprietary_id UUID NOT NULL,
  alias TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS address_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_address_id UUID REFERENCES verified_addresses(id),
  alias TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alternate_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietary_table TEXT NOT NULL,
  proprietary_id UUID NOT NULL,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  script TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS place_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietary_table TEXT NOT NULL,
  proprietary_id UUID NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_by TEXT,
  verification_status flipwi_verification_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS place_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietary_table TEXT NOT NULL,
  proprietary_id UUID NOT NULL,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  driver_id TEXT,
  customer_id TEXT,
  pickup_geom GEOMETRY(Point, 4326),
  drop_geom GEOMETRY(Point, 4326) NOT NULL,
  route_geom GEOMETRY(LineString, 4326),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failed', 'partial')),
  failure_reason TEXT,
  duration_s REAL,
  distance_m REAL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_success_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_address_id UUID REFERENCES verified_addresses(id),
  geom GEOMETRY(Point, 4326) NOT NULL,
  entrance_type TEXT,
  success_count INT DEFAULT 1,
  last_success_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (verified_address_id)
);

CREATE TABLE IF NOT EXISTS delivery_failed_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_address_id UUID REFERENCES verified_addresses(id),
  geom GEOMETRY(Point, 4326) NOT NULL,
  failure_reason TEXT,
  failure_count INT DEFAULT 1,
  last_failure_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS road_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_report_id UUID REFERENCES road_reports(id),
  osm_way_id BIGINT,
  geom GEOMETRY(Geometry, 4326),
  reason TEXT,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  verification_status flipwi_verification_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traffic_history (
  id BIGSERIAL PRIMARY KEY,
  road_osm_id BIGINT,
  geom_segment GEOMETRY(LineString, 4326),
  recorded_at TIMESTAMPTZ NOT NULL,
  speed_kmh REAL,
  sample_count INT DEFAULT 1,
  congestion_level SMALLINT
);

CREATE TABLE IF NOT EXISTS customer_saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  label TEXT,
  proprietary_id UUID,
  proprietary_table TEXT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorite_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  proprietary_id UUID,
  proprietary_table TEXT,
  name TEXT NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recent_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  client_id TEXT,
  query TEXT NOT NULL,
  selected_place_id TEXT,
  geom GEOMETRY(Point, 4326),
  region_code CHAR(2) DEFAULT 'IN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geom GEOMETRY(Point, 4326) NOT NULL,
  visit_count INT DEFAULT 1,
  unique_drivers INT DEFAULT 1,
  confidence_score REAL DEFAULT 0,
  suggested_place_name TEXT,
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_history (
  id BIGSERIAL PRIMARY KEY,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  from_status flipwi_verification_status,
  to_status flipwi_verification_status,
  actor_id TEXT,
  actor_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_verification_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES verified_businesses(id),
  claimant_id TEXT NOT NULL,
  gst_number TEXT,
  documents JSONB DEFAULT '[]',
  status flipwi_verification_status DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_place_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_type TEXT NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  payload JSONB NOT NULL,
  confidence_score REAL NOT NULL,
  evidence JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search performance indexes
CREATE INDEX IF NOT EXISTS idx_place_aliases_alias ON place_aliases USING GIN (alias gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_address_aliases_alias ON address_aliases USING GIN (alias gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alternate_names_name ON alternate_names USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_verified_businesses_geom ON verified_businesses USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_verified_businesses_name ON verified_businesses USING GIN (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_apartments_geom ON apartments USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_warehouse_geom ON warehouse_locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_recent_searches_query ON recent_searches USING GIN (query gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_recent_searches_created ON recent_searches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_osm_mapping_osm ON osm_place_mapping (osm_type, osm_id);

-- Seed business categories (India logistics)
INSERT INTO business_categories (code, name, sort_order) VALUES
  ('warehouse', 'Warehouse', 1),
  ('logistics', 'Logistics Hub', 2),
  ('retail', 'Retail Store', 3),
  ('restaurant', 'Restaurant', 4),
  ('hospital', 'Hospital', 5),
  ('school', 'School', 6),
  ('temple', 'Temple', 7),
  ('office', 'Office', 8),
  ('apartment', 'Apartment Complex', 9),
  ('pickup_point', 'Pickup Point', 10)
ON CONFLICT (code) DO NOTHING;
