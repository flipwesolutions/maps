# Data Verification Pipeline

User-submitted places, addresses, roads, and corrections **never** go directly to production.

## Flow

```
User Submission
      ↓
GPS Validation (accuracy < 50m, within India bbox)
      ↓
AI Confidence Score (0.0 – 1.0)
      ↓
Admin Verification (required if score < 0.85)
      ↓
Production Database (verified_* tables, status = approved)
```

## Submission types

| Type | Target table | GPS required |
|------|--------------|--------------|
| `place` | `verified_places` | Yes |
| `address` | `verified_addresses` | Yes |
| `entrance` | `building_entrances` | Yes |
| `road` | `road_reports` → `custom_roads` | Optional |
| `business` | `business_reports` | Yes |
| `correction` | `address_corrections` | Yes |
| `feedback` | `data_submissions` only | Optional |

## Status transitions

| From | To | Actor |
|------|-----|-------|
| `pending` | `gps_validated` | System (GPS check) |
| `gps_validated` | `scored` | AI service |
| `scored` | `approved` | Admin (or auto if score ≥ 0.85) |
| `scored` | `rejected` | Admin or AI |
| `approved` | `archived` | Admin |

## Rules

1. **Never auto-publish** user edits to search or routing indexes.
2. Approved records get a **search boost** over raw OSM in gateway merge layer.
3. Weekly OSM sync must run `conflict_resolution` before index rebuild.
4. If OSM deletes a node linked to a verified place, flag `manual_review` — do not delete proprietary row.
5. All transitions logged in `verification_audit`.

## API endpoints (planned)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/submissions` | Create submission |
| GET | `/api/v1/submissions/:id` | Status |
| POST | `/api/v1/admin/submissions/:id/approve` | Admin approve |
| POST | `/api/v1/admin/submissions/:id/reject` | Admin reject |

Schema: `platform/schemas/postgis/005_verification_pipeline.sql`
