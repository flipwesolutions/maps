# Flipwi Maps API Reference

Base URL: `https://api.flipwisolutions.com/v1`  
Auth: `Authorization: Bearer <jwt>` OR `X-API-Key: <client-key>`

All responses JSON. All lat/lon in WGS84 (EPSG:4326).  
Coordinates order: `[longitude, latitude]` unless noted.

---

## Health

### `GET /health`

No auth. Returns service status.

```json
{ "ok": true, "version": "1.0.0", "region": "IN" }
```

---

## Autocomplete

### `GET /v1/autocomplete`

Target latency: **<50 ms**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| q | string | yes | Prefix query (min 1 char) |
| region | string | no | `IN` (default), `WORLD` |
| lat, lon | number | no | Focus point for nearby bias |
| limit | int | no | Default 10, max 20 |
| lang | string | no | `en`, `hi`, … |

**Response:**

```json
{
  "suggestions": [
    {
      "id": "place:osm:node:123",
      "name": "Koramangala",
      "subtitle": "Bengaluru, Karnataka, India",
      "type": "neighbourhood",
      "coordinates": [77.6271, 12.9352],
      "distance_m": 1200
    }
  ],
  "latency_ms": 42
}
```

---

## Search / Geocoding

### `GET /v1/search`

Target latency: **<100 ms**

| Param | Type | Description |
|-------|------|-------------|
| q | string | Free-text or structured |
| region | string | `IN`, `WORLD` |
| lat, lon | number | Proximity bias |
| limit | int | Default 15, max 40 |
| fuzzy | bool | Enable fuzzy matching |

---

## Reverse Geocoding

### `GET /v1/reverse`

Target latency: **<100 ms**

| Param | Type | Description |
|-------|------|-------------|
| lat | number | Latitude |
| lon | number | Longitude |

**Response:**

```json
{
  "label": "42, MG Road, Koramangala, Bengaluru",
  "components": {
    "house_number": "42",
    "street": "MG Road",
    "locality": "Koramangala",
    "city": "Bengaluru",
    "district": "Bengaluru Urban",
    "state": "Karnataka",
    "postal_code": "560034",
    "country": "India",
    "country_code": "IN"
  },
  "confidence": 0.92,
  "coordinates": [77.6271, 12.9352]
}
```

---

## Address Validation

### `POST /v1/address/validate`

```json
{
  "address": "42 mg road koramangala bangalore",
  "region": "IN"
}
```

**Response:**

```json
{
  "valid": true,
  "normalized": "42, MG Road, Koramangala, Bengaluru, Karnataka 560034",
  "confidence": 0.88,
  "suggestions": [],
  "components": { }
}
```

---

## Routing

### `GET /v1/route`

Target latency: **<300 ms**

| Param | Type | Description |
|-------|------|-------------|
| from | string | `lon,lat` |
| to | string | `lon,lat` |
| waypoints | string | `lon,lat;lon,lat;...` |
| profile | string | `driving`, `walking`, `cycling`, `motorcycle`, `truck`, `van` |
| alternatives | int | 0–3 |
| avoid | string | `toll`, `ferry`, `toll,ferry` |
| optimize | bool | Optimize waypoint order |

**Response:** GeoJSON LineString + steps + distance + duration.

---

## Distance Matrix

### `POST /v1/matrix`

```json
{
  "sources": [[77.59, 12.97]],
  "targets": [[77.62, 12.94], [77.55, 12.98]],
  "profile": "driving"
}
```

---

## ETA

### `GET /v1/eta`

| Param | Description |
|-------|-------------|
| from, to | Coordinates |
| profile | Costing model |
| depart_at | ISO timestamp (future traffic) |

---

## Places

### `GET /v1/places/{id}`

Full POI detail: name, category, hours, contact, geometry.

---

## Map Style

### `GET /v1/styles/{theme}`

Returns MapLibre style JSON URL or body.  
Themes: `light`, `dark`, `navigation`, `satellite`.

---

## Tiles

### `GET /tiles/v1/{z}/{x}/{y}.pbf`

Vector tiles. Version in path or query: `?v=india-2026-07-07`.

---

## Offline Sync

### `GET /v1/offline/regions`

List downloadable region packs.

### `GET /v1/offline/regions/{id}/manifest`

MBTiles + routing graph + search pack URLs + version.

---

## Errors

```json
{
  "error": "rate_limit_exceeded",
  "message": "Retry after 60 seconds",
  "request_id": "req_abc123"
}
```

| Code | HTTP |
|------|------|
| invalid_api_key | 401 |
| rate_limit_exceeded | 429 |
| not_found | 404 |
| geocoding_failed | 502 |

---

## Mobile client mapping

Current Expo app (`lib/geocoding.ts`, `lib/routing.ts`) maps to:

| Client | Platform endpoint |
|--------|-------------------|
| `searchPlaces()` | `GET /v1/search` |
| `reverseGeocode()` | `GET /v1/reverse` |
| `fetchDrivingRoutes()` | `GET /v1/route` |

Configure via `EXPO_PUBLIC_MAPS_API_URL` + `EXPO_PUBLIC_MAPS_API_KEY`.
