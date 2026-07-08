# Database Schema

PostgreSQL 16 + PostGIS 3.4 — primary spatial datastore.  
OpenSearch 2.x — Pelias search index (not duplicated here; see Pelias schema).  
Redis 7 — cache, rate limits, session.

---

## 1. Core schema (`schemas/postgis/001_core.sql`)

### `dataset_versions`

Tracks OSM import versions for reproducibility and rollback.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| region_code | CHAR(2) | `IN`, `US`, … |
| version_tag | TEXT | `india-2026-07-07` |
| source_url | TEXT | Geofabrik PBF URL |
| imported_at | TIMESTAMPTZ | |
| osm_timestamp | TIMESTAMPTZ | Max OSM change time in extract |
| status | TEXT | `importing`, `active`, `superseded` |

### `regions`

| Column | Type |
|--------|------|
| code | CHAR(2) PK |
| name | TEXT |
| bbox | GEOMETRY(Polygon, 4326) |
| default_crs | INT |

---

## 2. Places & admin (`002_places.sql`)

### `admin_boundaries`

States, districts, cities, villages, panchayats, mandals, taluks, blocks.

| Column | Type | Index |
|--------|------|-------|
| id | BIGSERIAL PK | |
| osm_id | BIGINT | UNIQUE |
| region_code | CHAR(2) | B-tree |
| admin_level | SMALLINT | B-tree |
| name | TEXT | GIN (pg_trgm) |
| name_native | TEXT | |
| alt_names | TEXT[] | GIN |
| population | BIGINT | B-tree |
| importance | REAL | B-tree |
| geom | GEOMETRY(MultiPolygon, 4326) | GIST |
| centroid | GEOMETRY(Point, 4326) | GIST |
| parent_id | BIGINT FK | |
| dataset_version_id | UUID FK | |

### `places`

POIs, buildings, addresses — all searchable OSM features.

| Column | Type | Index |
|--------|------|-------|
| id | BIGSERIAL PK | |
| osm_type | TEXT | `node`, `way`, `relation` |
| osm_id | BIGINT | UNIQUE(osm_type, osm_id) |
| region_code | CHAR(2) | |
| category | TEXT | `hospital`, `school`, `fuel`, … |
| subcategory | TEXT | |
| name | TEXT | GIN (pg_trgm) |
| names_i18n | JSONB | GIN |
| house_number | TEXT | |
| street | TEXT | |
| locality | TEXT | |
| village | TEXT | |
| town | TEXT | |
| district | TEXT | |
| state | TEXT | |
| postal_code | TEXT | |
| country | TEXT | |
| geom | GEOMETRY(Point, 4326) | GIST |
| geom_area | GEOMETRY(Polygon, 4326) | GIST (buildings) |
| population | BIGINT | |
| importance | REAL | |
| tags | JSONB | GIN |
| dataset_version_id | UUID | |

### `roads`

| Column | Type |
|--------|------|
| id | BIGSERIAL PK |
| osm_id | BIGINT UNIQUE |
| name | TEXT |
| highway | TEXT |
| geom | GEOMETRY(LineString, 4326) GIST |
| region_code | CHAR(2) |

---

## 3. Routing metadata (`003_routing.sql`)

### `routing_restrictions`

Tolls, ferries, truck limits, temporary closures.

| Column | Type |
|--------|------|
| id | UUID PK |
| restriction_type | TEXT |
| geom | GEOMETRY |
| valid_from / valid_to | TIMESTAMPTZ |
| metadata | JSONB |

### `speed_analytics` *(future traffic)*

| Column | Type |
|--------|------|
| road_segment_id | BIGINT |
| hour_of_week | SMALLINT |
| avg_speed_kph | REAL |
| sample_count | INT |

---

## 4. API & clients (`004_api.sql`)

### `api_clients`

| Column | Type |
|--------|------|
| id | UUID PK |
| name | TEXT |
| api_key_hash | TEXT |
| rate_limit_rpm | INT |
| allowed_regions | TEXT[] |
| created_at | TIMESTAMPTZ |

### `audit_logs`

| Column | Type |
|--------|------|
| id | BIGSERIAL PK |
| client_id | UUID |
| endpoint | TEXT |
| params | JSONB |
| ip | INET |
| created_at | TIMESTAMPTZ |

### `search_analytics`

| Column | Type |
|--------|------|
| query | TEXT |
| region_code | CHAR(2) |
| result_count | INT |
| latency_ms | INT |
| created_at | TIMESTAMPTZ |

---

## 5. Offline sync (`005_offline.sql`)

### `offline_regions`

| Column | Type |
|--------|------|
| id | TEXT PK | `IN-KA-BLR` |
| name | TEXT |
| bbox | GEOMETRY |
| mbtiles_url | TEXT |
| routing_pack_url | TEXT |
| search_pack_url | TEXT |
| version | TEXT |
| size_bytes | BIGINT |

---

## 6. OpenSearch (Pelias) index

Managed by Pelias — key fields:

- `name.default`, `name.en`, `name.hi`
- `phrase` (edge ngram for autocomplete)
- `center_point` (geo_point)
- `population`, `popularity`
- `layer` (`venue`, `street`, `locality`, `region`, …)
- `parent` (admin hierarchy)
- `region_code`

---

## 7. Spatial indexes

```sql
CREATE INDEX idx_places_geom ON places USING GIST (geom);
CREATE INDEX idx_places_name_trgm ON places USING GIN (name gin_trgm_ops);
CREATE INDEX idx_admin_geom ON admin_boundaries USING GIST (geom);
CREATE INDEX idx_roads_geom ON roads USING GIST (geom);
```

---

## 8. Partitioning (world scale)

Partition `places` and `admin_boundaries` by `region_code` (LIST).  
OpenSearch: one index per region or alias `places-{region}`.
