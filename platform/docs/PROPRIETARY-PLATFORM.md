# Flipwi Proprietary Places & Address Intelligence Platform

**OpenStreetMap remains Layer 1 (base).** All proprietary data lives in separate PostGIS tables — never modified OSM source tables.

## Architecture layers

| Layer | Component | Storage |
|-------|-----------|---------|
| 1 | OpenStreetMap base | `planet_osm_*`, Pelias index |
| 2 | Company proprietary GIS | `verified_*`, `custom_roads` |
| 3 | Verified places | `verified_places`, `verified_landmarks` |
| 4 | Customer address intelligence | `verified_addresses`, `address_confidence` |
| 5 | Driver GPS intelligence | `driver_traces`, `gps_confidence` |
| 6 | Business verification | `verified_businesses`, `business_verification_claims` |
| 7 | AI confidence engine | `ai_place_suggestions`, `data_submissions` |
| 8 | Merged search API | `server/src/services/merged-search.js` |

## Database migrations

```
platform/schemas/postgis/
  001_core.sql
  002_places.sql          # OSM-derived read tables
  003_api.sql
  004_proprietary_gis.sql # Core proprietary layer
  005_verification_pipeline.sql
  006_proprietary_extended.sql
  007_dev_seed.sql        # Sample HSR Layout, Koramangala
```

## Backend services

```
server/src/
  db/pool.js
  services/
    proprietary-search.js   # PostGIS trigram search
    search-merge.js         # Ranking algorithm
    merged-search.js        # Layer 8 orchestration
    submission-service.js   # User submissions → verification
    delivery-service.js     # Delivery intelligence
    gps-service.js          # GPS traces & road reports
    business-service.js     # Business claims
    ai-confidence.js        # Confidence scoring
  routes/
    places.js               # Public proprietary APIs
    admin.js                # GIS admin panel APIs
```

## Merged search ranking

Results ranked by:

- **Layer boost** — verified > business > warehouse > OSM
- **Verification status** — approved +25
- **Confidence score** — up to +20
- **Usage count** — popularity
- **Distance** — proximity boost when lat/lng provided

`/api/v1/search` and `/api/v1/autocomplete` now return **merged OSM + proprietary** results.

## REST API

### Public (X-API-Key)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/search` | Merged search |
| GET | `/api/v1/autocomplete` | Merged autocomplete |
| GET | `/api/v1/places/search` | Same merged search |
| GET | `/api/v1/places/nearby` | Nearby verified places |
| POST | `/api/v1/places/create` | Submit new place |
| PUT | `/api/v1/places/update` | Address correction |
| POST | `/api/v1/places/delivery/complete` | Record delivery |
| POST | `/api/v1/places/gps/upload` | Upload GPS trace |
| POST | `/api/v1/places/road/report` | Road report |
| POST | `/api/v1/places/business/verify` | Business claim |
| GET | `/api/v1/places/analytics/search` | Popular searches |

### Admin (X-Admin-Key)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/submissions/pending` | Review queue |
| POST | `/api/v1/admin/submissions/:id/approve` | Approve place |
| POST | `/api/v1/admin/submissions/:id/reject` | Reject place |
| POST | `/api/v1/admin/business/:id/approve` | Approve business |
| GET | `/api/v1/admin/ai-suggestions` | AI-suggested places |
| GET | `/api/v1/admin/stats` | Platform analytics |

## Verification pipeline

```
User submission → GPS validation → AI score → Admin review → Production DB
```

**Never auto-publish.** `approveSubmission()` writes to `verified_*` tables only after admin approval (or AI score ≥ 0.85 flag for review queue).

## Deployment

1. Start PostGIS: `docker compose up -d postgres`
2. Migrations apply automatically via `docker-entrypoint-initdb.d`
3. Seed dev data: `psql -f platform/schemas/postgis/007_dev_seed.sql`
4. Configure `server/.env`:
   ```
   POSTGIS_HOST=localhost
   ADMIN_API_KEY=your-admin-key
   ```
5. `cd server && npm install && npm test && npm start`

## Mobile integration

No UI changes required. Mobile app already calls `/api/v1/search` — merged results include `source`, `layer`, and `rank_score` fields.

## Scale path

- **100M+ places**: partition `driver_traces`, `delivery_history` by month
- **Search**: OpenSearch sync from PostGIS (future worker)
- **Cache**: Redis on merged search (implemented)
- **Workers**: background Pelias reindex + proprietary sync (CronJob in K8s)
