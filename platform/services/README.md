# Flipwi Maps — Microservices

Each service is independently deployable. Implement in order of priority.

| Priority | Service | Folder | Status |
|----------|---------|--------|--------|
| P0 | API Gateway | `../../server/` | Skeleton ✅ |
| P1 | Autocomplete | `autocomplete/` | Planned |
| P1 | Geocoding | `geocoding/` | Planned |
| P1 | Reverse Geocoding | `reverse-geocoding/` | Planned |
| P1 | Search Ranking | `search-ranking/` | Planned |
| P2 | Routing (Valhalla) | `routing/` | Planned |
| P2 | ETA | `eta/` | Planned |
| P2 | Distance Matrix | `routing/matrix/` | Planned |
| P3 | Tile Service | `tile-server/` | Planned |
| P3 | Map Style | `map-style/` | Planned |
| P4 | Places | `places/` | Planned |
| P4 | Address Validation | `address-validation/` | Planned |
| P5 | Delivery Optimization | `delivery-optimization/` | Planned |
| P5 | Offline Sync | `offline-sync/` | Planned |
| P6 | Analytics | `analytics/` | Planned |
| P6 | Admin GIS | `admin-gis/` | Planned |
| Future | Traffic | `traffic/` | Planned |

## Service template

```
service-name/
├── Dockerfile
├── package.json
├── src/
│   ├── index.ts
│   ├── routes/
│   ├── services/
│   └── metrics.ts
└── tests/
```

## Inter-service communication

- Sync: HTTP/REST internal cluster DNS
- Async (analytics, index updates): Redis Streams / Kafka (future)
