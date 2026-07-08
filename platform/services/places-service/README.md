# Places Service — Proprietary GIS Module

Implementation lives in the API gateway (`server/src/`) as modular services.

## Run

```bash
cd platform/infrastructure
docker compose up -d postgres redis

cd ../../server
npm install
npm test
npm start
```

## Apply seed data

```bash
docker exec -i flipwi-maps-postgres-1 psql -U flipwi -d flipwi_maps < ../platform/schemas/postgis/007_dev_seed.sql
```

## Test merged search

```bash
curl -H "X-API-Key: dev-client-key" "http://localhost:3001/api/v1/search?q=HSR+Layout"
```

Expected: proprietary `HSR Layout` ranked above OSM results.

See [../docs/PROPRIETARY-PLATFORM.md](../docs/PROPRIETARY-PLATFORM.md).
