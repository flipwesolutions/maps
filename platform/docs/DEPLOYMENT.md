# Deployment Guide

## 1. Environments

| Env | Purpose | Infrastructure |
|-----|---------|--------------|
| `local` | Developer laptops | Docker Compose |
| `staging` | QA + load test | Kubernetes (small cluster) |
| `production` | Live clients | Kubernetes (multi-AZ) |

---

## 2. Local development (Docker Compose)

### Prerequisites

- Docker 24+ / Docker Compose v2
- 32 GB RAM recommended (Pelias + Valhalla import is heavy)
- 200 GB disk for India OSM + tiles

### Start core stack

```bash
cd platform/infrastructure
cp .env.example .env
docker compose up -d postgres redis opensearch api-gateway
```

### Full stack (after data import)

```bash
docker compose --profile full up -d
```

### Services & ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | |
| Redis | 6379 | |
| OpenSearch | 9200 | http://localhost:9200 |
| Martin (tiles) | 3000 | http://localhost:3000 |
| Valhalla | 8002 | http://localhost:8002 |
| Grafana | 3003 | http://localhost:3003 |

---

## 3. India data import (first time)

```bash
# 1. Download OSM extract (~1.5 GB)
./platform/pipelines/osm-import/download.sh IN

# 2. Import PostGIS
./platform/pipelines/osm-import/import-postgis.sh IN

# 3. Build Pelias index (4–12 hours)
./platform/pipelines/pelias-index/build-india.sh

# 4. Build Valhalla tiles (2–6 hours)
./platform/pipelines/valhalla/build-india.sh

# 5. Generate vector tiles (2–4 hours)
./platform/pipelines/tile-generation/build-india.sh
```

See [DATA-PIPELINE.md](./DATA-PIPELINE.md).

---

## 4. Kubernetes production

### Apply manifests

```bash
kubectl apply -f platform/infrastructure/kubernetes/namespace.yaml
kubectl apply -f platform/infrastructure/kubernetes/configmap.yaml
kubectl apply -f platform/infrastructure/kubernetes/secrets.yaml  # from sealed-secrets
kubectl apply -f platform/infrastructure/kubernetes/
```

### Key resources

- **Ingress** — `api.flipwisolutions.com`, `tiles.flipwisolutions.com`
- **HPA** — API Gateway, Autocomplete, Routing (CPU + latency metrics)
- **PVC** — Valhalla tiles, MBTiles (ReadOnlyMany)
- **CronJob** — nightly incremental OSM update

### Recommended node pools

| Pool | Workload |
|------|----------|
| `general` | API services |
| `memory` | OpenSearch, Valhalla |
| `batch` | Import pipelines |

---

## 5. CI/CD (GitHub Actions)

Pipeline: `.github/workflows/platform-ci.yml`

1. **Lint + test** — each service
2. **Build Docker images** — push to registry
3. **Staging deploy** — on `main` merge
4. **Production deploy** — manual approval tag `v*`

---

## 6. Mobile client release

```env
EXPO_PUBLIC_API_GATEWAY_HOST=https://api.flipwisolutions.com
EXPO_PUBLIC_TILESERVER_HOST=https://tiles.flipwisolutions.com
EXPO_PUBLIC_MAP_STYLE_HOST=https://maps.flipwisolutions.com
EXPO_PUBLIC_MAPS_API_KEY=<per-client-key>
```

Build per client with EAS / `app.config.js` dynamic branding.

---

## 7. Monitoring

- **Prometheus** — scrape `/metrics` on each service
- **Grafana** — dashboards in `infrastructure/monitoring/grafana/`
- **Alerts** — P99 latency, error rate, disk space on tile volumes
- **Loki** — centralized logs with `request_id` correlation

---

## 8. Production checklist

- [ ] India OSM imported and `dataset_version` active
- [ ] Pelias index health green
- [ ] Valhalla route test Mumbai → Pune passes
- [ ] Tiles served from CDN with cache headers
- [ ] API keys rotated from dev defaults
- [ ] Rate limits configured per client tier
- [ ] Backup: PostGIS daily, OpenSearch snapshots
- [ ] OSM attribution in map style + ToS
