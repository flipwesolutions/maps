# Flipwi Maps — Enterprise Upgrade Plan

**Principle:** Upgrade the existing OpenStreetMap + MapLibre application. Do not replace OSM. Do not rebuild from scratch. Do not remove working features.

---

## Phase 1 — Current Architecture & Limitations

### What already works

| Layer | Implementation | Location |
|-------|----------------|----------|
| Map rendering | MapLibre GL in WebView, OSM-derived vector style | `components/MapWebView.tsx`, `platform/infrastructure/map-styles/flipwi-streets.json` |
| Mobile navigation | Turn-by-turn, reroute, voice, compass | `App.tsx`, `lib/navigation.ts` |
| Search (offline) | Bucketed fuzzy index, India + World JSON | `lib/place-index.ts`, `lib/places/*.json` |
| Search (platform) | Pelias proxy | `server/src/providers/geocoding.js` |
| Routing | Valhalla proxy → OSRM-shaped response | `server/src/providers/routing.js`, `lib/routing.ts` |
| API gateway | Express + API key auth | `server/src/index.js` |
| PostGIS schema | Core, places, API tables | `platform/schemas/postgis/` |
| Infrastructure | Docker Compose, NGINX, K8s skeleton | `platform/infrastructure/` |

### Limitations by area

#### Map rendering
- Style JSON exists; **MBTiles, sprites, and fonts are not generated** — map may be blank until Planetiler + Martin pipeline runs.
- Style `maxzoom` is 14; client allows zoom 18 (overzoom only, no extra detail).
- MapLibre loaded from CDN (`unpkg`) — not bundled for offline/air-gapped deploy.
- No landuse, admin boundaries, POI icons, or Hindi label layers in style.
- No map-style health check in app when `MAP_STYLE` is empty.

#### Search
- **Pelias index not built** — platform search returns 502 until data pipeline completes.
- Offline index (~9k India places) **was not wired to UI** when platform configured (fixed in upgrade).
- Pelias config is OSM-only — missing WhosOnFirst admin boundaries (states, districts, mandals, taluks).
- No fuzzy/typo layer beyond Pelias defaults; no proprietary verified-place boost.
- Autocomplete API exists on server; mobile used full search with 350ms debounce.
- No Redis cache at gateway — latency target &lt;50ms not met under load.
- Village, gram panchayat, colony, layout coverage requires full India OSM + admin imports.

#### Routing
- **Valhalla tiles not built** — routing fails until `build-india.sh` completes.
- Via-waypoints for alternative routes **not passed to Valhalla** (client sends via points; server ignored them).
- Valhalla numeric maneuver types not mapped to OSRM strings — turn-by-turn text generic.
- Profile locked to `auto` in mobile; truck/van/walk/bike supported on server only.
- No multi-stop delivery, matrix, nearest-driver, or route optimization APIs.
- No learned speed profiles or ETA correction from delivery history.

#### Address / reverse geocoding
- Reverse geocode depends on Pelias; fallback is raw `lat, lng` coordinates.
- No building entrance, verified address, or delivery-point layer.
- No address confidence scoring.

#### Performance
- No Redis caching (search, route, tile metadata).
- No CDN in front of Martin tiles.
- Large `world-places.json` loaded on demand — memory spike on World toggle.
- No connection pooling to PostGIS from gateway.

#### Database
- Custom `places` / `admin_boundaries` tables **never populated** — osm2pgsql creates `planet_osm_*` only.
- **Proprietary GIS tables did not exist** — added in `004_proprietary_gis.sql`.
- `api_clients` table unused — keys from env string only.
- No audit log writes from gateway.

#### Scalability
- Single-node API gateway; K8s HPA defined but data services (Pelias, Valhalla, Martin) not in K8s manifests.
- OpenSearch single-node in Compose — not production HA.
- No horizontal tile serving (Martin read replicas).

#### Tile loading
- Martin not configured to serve `india.mbtiles` at `/india/{z}/{x}/{y}`.
- No tile cache warming or offline region packs wired to `offline_regions` table.

---

## Phase 2 — Architecture Upgrades (additive only)

Introduce self-hosted services **where not already implemented**. Do not duplicate.

```
                    ┌─────────────────────────────────────┐
                    │         Mobile / Web Clients         │
                    └──────────────────┬──────────────────┘
                                       │ X-API-Key
                    ┌──────────────────▼──────────────────┐
                    │     API Gateway (existing Express)   │
                    │  + Redis cache (NEW)                 │
                    │  + Proprietary places merge (NEW)    │
                    └─┬────────┬─────────┬─────────┬───────┘
                      │        │         │         │
              Pelias  │  Valhalla│  Martin │  PostGIS│
              (exist)│  (exist) │ (exist) │ + NEW   │
                      │        │         │ proprietary│
              OpenSearch      tiles    verified_*  │
              (exist)                              │
```

| Component | Action |
|-----------|--------|
| PostgreSQL + PostGIS | Keep; add proprietary schema (`004`, `005`) |
| Pelias + OpenSearch | Complete index pipeline; add WOF admin import |
| Valhalla | Build India tiles; add waypoint + profile params |
| Redis | Wire to gateway for search/autocomplete/route cache |
| Martin | Add `martin.yaml` mapping `india.mbtiles` |
| MapLibre | Keep; bundle GL locally in future sprint |
| Docker / K8s | Extend manifests for data services |
| Offline index | Keep as fallback layer (hybrid search) |

---

## Phase 3 — Proprietary Data Modules

OSM remains **base map data only**. All modules below are **Flipwi-owned**:

| Module | Purpose | Collection source |
|--------|---------|-------------------|
| `driver_gps` | Raw GPS traces, speed, heading | Driver app SDK |
| `delivery_routes` | Completed/failed delivery paths | Logistics API |
| `building_entrances` | Lat/lng at door/gate | Driver pin + photo |
| `verified_businesses` | Confirmed operating businesses | Admin + merchant portal |
| `verified_warehouses` | Fleet hubs, DCs | Operations team |
| `pickup_points` / `drop_points` | Recurring logistics nodes | Customer + driver |
| `address_corrections` | User-reported address fixes | App feedback |
| `road_reports` | Missing roads, closures, restrictions | Driver + admin |
| `business_reports` | Wrong/missing POI | Customer feedback |
| `traffic_statistics` | Observed speeds by segment/time | GPS aggregation |
| `road_speed_profiles` | Learned speeds per road | ETA learning |
| `eta_history` | Predicted vs actual ETA | Delivery completion |
| `address_confidence` | Scored deliverability | ML pipeline (future) |

Schema: `platform/schemas/postgis/004_proprietary_gis.sql`

---

## Phase 4 — Proprietary GIS Database

**Rule:** Never modify `planet_osm_*` or raw OSM tables. All company data lives in separate tables with `source = 'flipwi'` and optional `osm_id` reference links.

Key tables: `verified_places`, `verified_addresses`, `building_entrances`, `driver_traces`, `road_reports`, `custom_roads`, `delivery_addresses`, `warehouse_locations`, `pickup_locations`, `drop_locations`, `traffic_statistics`, `road_speed_profiles`, `eta_history`, `address_confidence`.

Search ranking: Pelias/OSM results **merged** with proprietary boosts (verified &gt; reported &gt; OSM).

---

## Phase 5 — Data Verification Pipeline

```
User Submission → GPS Validation → AI Confidence Score → Admin Review → Production
```

Never auto-publish user edits.

States: `pending` → `gps_validated` → `scored` → `approved` | `rejected`

Schema: `platform/schemas/postgis/005_verification_pipeline.sql`  
Docs: `platform/pipelines/verification/README.md`

---

## Phase 6 — Weekly OSM Synchronization

Script: `platform/pipelines/sync/weekly-osm-sync.sh`

1. Download latest Geofabrik extract  
2. Import to **new** `dataset_version` (never overwrite active in place)  
3. Diff against previous version  
4. Merge OSM changes into read-only base tables  
5. **Preserve all `verified_*` and `status = approved` proprietary rows**  
6. Rebuild Pelias index (blue/green)  
7. Rebuild Valhalla tiles  
8. Regenerate vector tiles  
9. Swap `dataset_versions.status` to `active`  
10. Publish via NGINX + CDN cache purge  

---

## Phase 7 — Search Improvements

| Requirement | Implementation path |
|-------------|---------------------|
| Full India OSM coverage | Pelias import + WOF admin boundaries |
| States → villages | WOF + OSM `place=*` + `admin_level` |
| Colonies, layouts, roads | OSM `addr:*`, `landuse`, `highway` |
| Autocomplete &lt;50ms | Gateway Redis + Pelias autocomplete endpoint |
| Fuzzy / typo | Pelias `libpostal` + `pg_trgm` on proprietary names |
| Nearby search | `focus.point` + PostGIS `ST_DWithin` on verified |
| Hindi / English / alt names | `names_i18n JSONB` + Pelias `name.*` fields |
| Offline fallback | Existing `place-index.ts` (keep) |

Mobile: hybrid search — platform first, offline fallback on failure.

---

## Phase 8 — Routing Improvements

| Mode | Valhalla costing |
|------|------------------|
| Car | `auto` |
| Bike / motorcycle | `motorcycle` |
| Truck | `truck` |
| Delivery van | `auto` + height/weight params (future) |
| Walking | `pedestrian` |

| Feature | Phase |
|---------|-------|
| Waypoints / multi-stop | Gateway passes `locations[]` to Valhalla |
| Route optimization | Valhalla `optimized_route` (Phase 8b) |
| Nearest driver/warehouse | PostGIS `ST_DWithin` + matrix API |
| Learned ETA | `eta_history` + `road_speed_profiles` |

---

## Phase 9 — AI Learning Foundation

Designed for future modules; tables store training signals now:

- `driver_traces` — GPS paths, speed, road segment IDs  
- `eta_history` — predicted vs actual, success/fail reason  
- `address_corrections` — before/after coordinates  
- `traffic_statistics` — hourly speed percentiles per segment  
- `delivery_routes` — heatmap input for popular corridors  

No ML inference in gateway yet — data collection first.

---

## Implementation Roadmap

| Sprint | Deliverable |
|--------|-------------|
| **Now** | Proprietary schemas, verification pipeline, hybrid search, Redis cache, maneuver fix, waypoints |
| **Sprint 2** | Run India OSM pipeline (PBF → tiles → Pelias → Valhalla) |
| **Sprint 3** | Proprietary places API + admin verification UI |
| **Sprint 4** | Multi-stop routing, profile selector, matrix API |
| **Sprint 5** | Weekly sync automation + blue/green index swap |
| **Sprint 6** | ETA learning, traffic profiles, nearest-driver |

---

## Files Added / Modified in This Upgrade

| Path | Change |
|------|--------|
| `platform/docs/ENTERPRISE-UPGRADE.md` | This document |
| `platform/schemas/postgis/004_proprietary_gis.sql` | Proprietary tables |
| `platform/schemas/postgis/005_verification_pipeline.sql` | Verification workflow |
| `platform/pipelines/sync/weekly-osm-sync.sh` | Weekly OSM sync |
| `platform/pipelines/verification/README.md` | Verification process |
| `lib/geocoding.ts` | Hybrid platform + offline search |
| `server/src/cache.js` | Redis + in-memory cache |
| `server/src/providers/routing.js` | Waypoints + maneuver mapping |

**OpenStreetMap remains the base map. All existing features preserved.**
