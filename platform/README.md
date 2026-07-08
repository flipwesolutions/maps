# Flipwi Maps Platform

Enterprise mapping infrastructure — microservices, data pipelines, Kubernetes.

## Start here

1. [Architecture](./docs/ARCHITECTURE.md) — system design
2. [API Reference](./docs/API.md) — client integration
3. [Deployment](./docs/DEPLOYMENT.md) — Docker + K8s
4. [Data Pipeline](./docs/DATA-PIPELINE.md) — India OSM import

## Folder structure

```
platform/
├── docs/                 # Architecture, API, security, SLAs
├── infrastructure/       # docker-compose, kubernetes, monitoring
├── services/             # Microservice implementations
├── pipelines/            # OSM import, Pelias, Valhalla, tiles
├── schemas/postgis/      # Database migrations
└── tests/load/           # k6 load tests (add scripts)
```

## Relationship to mobile app

```
platform/          ← your maps infrastructure (this folder)
../App.tsx         ← client SDK / demo app
../server/         ← API gateway (evolves into platform gateway)
```

## Phase 1 action items

1. `docker compose up` in `infrastructure/`
2. Run `pipelines/osm-import/download.sh IN`
3. Build Pelias index for India
4. Point mobile `.env` at local API gateway
5. Implement `autocomplete` and `geocoding` services against Pelias
