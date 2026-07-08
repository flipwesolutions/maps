-- Flipwi proprietary GIS layer — NEVER modify planet_osm_* tables.
-- OSM is base data only; all rows here are company-owned.

CREATE TYPE flipwi_data_source AS ENUM (
  'flipwi', 'driver', 'customer', 'admin', 'merchant', 'import'
);

CREATE TYPE flipwi_verification_status AS ENUM (
  'pending', 'gps_validated', 'scored', 'approved', 'rejected', 'archived'
);

-- Verified places (businesses, landmarks, POIs beyond OSM confidence)
CREATE TABLE IF NOT EXISTS verified_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  names_i18n JSONB DEFAULT '{}',
  category TEXT,
  subcategory TEXT,
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
  entrance_geom GEOMETRY(Point, 4326),
  osm_type TEXT,
  osm_id BIGINT,
  source flipwi_data_source DEFAULT 'flipwi',
  verification_status flipwi_verification_status DEFAULT 'pending',
  confidence_score REAL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verified_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formatted_address TEXT NOT NULL,
  house_number TEXT,
  building_name TEXT,
  street TEXT,
  locality TEXT,
  landmark TEXT,
  district TEXT,
  state TEXT,
  postal_code TEXT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  rooftop_geom GEOMETRY(Point, 4326),
  verified_place_id UUID REFERENCES verified_places(id),
  delivery_notes TEXT,
  verification_status flipwi_verification_status DEFAULT 'pending',
  confidence_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS building_entrances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_address_id UUID REFERENCES verified_addresses(id),
  verified_place_id UUID REFERENCES verified_places(id),
  label TEXT DEFAULT 'main',
  geom GEOMETRY(Point, 4326) NOT NULL,
  floor TEXT,
  access_notes TEXT,
  photo_url TEXT,
  source flipwi_data_source DEFAULT 'driver',
  verification_status flipwi_verification_status DEFAULT 'pending',
  confidence_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  operator TEXT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  geom_area GEOMETRY(Polygon, 4326),
  capacity_pallets INT,
  operating_hours JSONB,
  verification_status flipwi_verification_status DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickup_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT,
  label TEXT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  verified_address_id UUID REFERENCES verified_addresses(id),
  default_entrance_id UUID REFERENCES building_entrances(id),
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drop_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT,
  label TEXT,
  geom GEOMETRY(Point, 4326) NOT NULL,
  verified_address_id UUID REFERENCES verified_addresses(id),
  default_entrance_id UUID REFERENCES building_entrances(id),
  delivery_success_rate REAL,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  formatted_address TEXT NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  entrance_id UUID REFERENCES building_entrances(id),
  delivery_outcome TEXT CHECK (delivery_outcome IN ('success', 'failed', 'partial', 'unknown')),
  failure_reason TEXT,
  driver_id TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver GPS collection
CREATE TABLE IF NOT EXISTS driver_traces (
  id BIGSERIAL PRIMARY KEY,
  driver_id TEXT NOT NULL,
  session_id UUID,
  geom GEOMETRY(LineString, 4326) NOT NULL,
  speed_kmh REAL,
  heading REAL,
  accuracy_m REAL,
  road_osm_id BIGINT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id TEXT,
  vehicle_profile TEXT DEFAULT 'van',
  geom GEOMETRY(LineString, 4326) NOT NULL,
  stop_count INT DEFAULT 0,
  distance_m REAL,
  duration_s REAL,
  outcome TEXT CHECK (outcome IN ('completed', 'aborted', 'partial')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Road corrections & reports
CREATE TABLE IF NOT EXISTS road_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN (
    'missing_road', 'wrong_name', 'closure', 'restriction', 'one_way', 'speed_limit'
  )),
  description TEXT,
  geom GEOMETRY(Geometry, 4326),
  osm_way_id BIGINT,
  reporter_id TEXT,
  source flipwi_data_source DEFAULT 'driver',
  verification_status flipwi_verification_status DEFAULT 'pending',
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_roads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  highway TEXT DEFAULT 'service',
  geom GEOMETRY(LineString, 4326) NOT NULL,
  oneway BOOLEAN DEFAULT FALSE,
  maxspeed_kmh INT,
  surface TEXT,
  access TEXT,
  source_report_id UUID REFERENCES road_reports(id),
  verification_status flipwi_verification_status DEFAULT 'pending',
  merged_to_osm BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT CHECK (report_type IN ('missing', 'wrong_location', 'closed', 'duplicate')),
  business_name TEXT,
  geom GEOMETRY(Point, 4326),
  osm_id BIGINT,
  reporter_id TEXT,
  verification_status flipwi_verification_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS address_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_address TEXT,
  corrected_address TEXT,
  original_geom GEOMETRY(Point, 4326),
  corrected_geom GEOMETRY(Point, 4326) NOT NULL,
  order_id TEXT,
  driver_id TEXT,
  reason TEXT,
  verification_status flipwi_verification_status DEFAULT 'pending',
  confidence_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Traffic & ETA learning (AI foundation)
CREATE TABLE IF NOT EXISTS traffic_statistics (
  id BIGSERIAL PRIMARY KEY,
  road_osm_id BIGINT,
  geom_segment GEOMETRY(LineString, 4326),
  hour_of_week SMALLINT CHECK (hour_of_week >= 0 AND hour_of_week < 168),
  sample_count INT DEFAULT 0,
  speed_p50_kmh REAL,
  speed_p85_kmh REAL,
  speed_p95_kmh REAL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (road_osm_id, hour_of_week)
);

CREATE TABLE IF NOT EXISTS road_speed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_osm_id BIGINT,
  highway TEXT,
  geom GEOMETRY(LineString, 4326),
  default_speed_kmh REAL,
  learned_speed_kmh REAL,
  confidence REAL DEFAULT 0,
  sample_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eta_history (
  id BIGSERIAL PRIMARY KEY,
  route_id UUID,
  driver_id TEXT,
  vehicle_profile TEXT,
  origin_geom GEOMETRY(Point, 4326),
  dest_geom GEOMETRY(Point, 4326),
  predicted_duration_s REAL,
  actual_duration_s REAL,
  predicted_distance_m REAL,
  actual_distance_m REAL,
  outcome TEXT CHECK (outcome IN ('success', 'late', 'failed')),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS address_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_address_id UUID REFERENCES verified_addresses(id),
  geom GEOMETRY(Point, 4326) NOT NULL,
  deliverability_score REAL CHECK (deliverability_score >= 0 AND deliverability_score <= 1),
  factors JSONB DEFAULT '{}',
  sample_deliveries INT DEFAULT 0,
  success_rate REAL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verified_places_geom ON verified_places USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_verified_places_name ON verified_places USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_verified_places_status ON verified_places (verification_status) WHERE verification_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_verified_addresses_geom ON verified_addresses USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_building_entrances_geom ON building_entrances USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_driver_traces_geom ON driver_traces USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_driver_traces_driver ON driver_traces (driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_stats_road ON traffic_statistics (road_osm_id);
CREATE INDEX IF NOT EXISTS idx_eta_history_recorded ON eta_history (recorded_at DESC);
