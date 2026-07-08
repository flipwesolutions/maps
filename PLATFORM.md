# Flipwi Solutions — Maps Platform

**100% self-hosted.** Zero dependency on Mapbox, Google, MapTiler, CARTO, HERE, TomTom, or any external map provider.

## We own everything

| Component | Our service | Technology |
|-----------|-------------|------------|
| Map tiles | `tiles.maps.flipwi.local` | Martin + Planetiler MBTiles |
| Map styles | `maps.maps.flipwi.local` | Our `flipwi-streets.json` |
| Search / geocode | `search.maps.flipwi.local` | Pelias + OpenSearch |
| Routing / ETA | `routing.maps.flipwi.local` | Valhalla |
| API | `api.maps.flipwi.local` | API Gateway (Node) |
| Database | PostGIS | PostgreSQL |
| Cache | Redis | Redis |
| Proxy | NGINX | NGINX |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./platform/docs/ARCHITECTURE.md) | Microservices design |
| [API](./platform/docs/API.md) | REST contracts |
| [Deployment](./platform/docs/DEPLOYMENT.md) | Docker + Kubernetes |
| [Data Pipeline](./platform/docs/DATA-PIPELINE.md) | OSM import → index → publish |
| [Backup & DR](./platform/docs/BACKUP-DR.md) | Backup, scaling, recovery |
| [Security](./platform/docs/SECURITY.md) | Auth, rate limits |
| [Enterprise Upgrade](./platform/docs/ENTERPRISE-UPGRADE.md) | Phases 1–9: limitations, proprietary GIS, verification, sync |
| [Proprietary Platform](./platform/docs/PROPRIETARY-PLATFORM.md) | Places DB, merged search, delivery & GPS intelligence |

## Mobile client configuration

```env
EXPO_PUBLIC_API_GATEWAY_HOST=http://api.maps.flipwi.local
EXPO_PUBLIC_TILESERVER_HOST=http://tiles.maps.flipwi.local
EXPO_PUBLIC_MAP_STYLE_HOST=http://maps.maps.flipwi.local
EXPO_PUBLIC_MAPS_API_KEY=<our-client-key>
```

**No external provider URLs. No external API keys.**

## Start infrastructure

```bash
cd platform/infrastructure
cp .env.example .env
docker compose up -d
```

## Data pipeline (India)

```bash
platform/pipelines/osm-import/download.sh IN
# → import PostGIS → Pelias index → Valhalla build → MBTiles
```

See [platform/docs/DATA-PIPELINE.md](./platform/docs/DATA-PIPELINE.md).
