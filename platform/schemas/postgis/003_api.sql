-- API clients, audit, offline regions

CREATE TABLE IF NOT EXISTS api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  rate_limit_rpm INT DEFAULT 600,
  allowed_regions TEXT[] DEFAULT ARRAY['IN'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID REFERENCES api_clients(id),
  endpoint TEXT NOT NULL,
  params JSONB,
  ip INET,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offline_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region_code CHAR(2) NOT NULL,
  bbox GEOMETRY(Polygon, 4326),
  mbtiles_url TEXT,
  routing_pack_url TEXT,
  search_pack_url TEXT,
  version TEXT NOT NULL,
  size_bytes BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);
