# Data Pipeline

## Overview

```
Geofabrik PBF ──► Import jobs ──► PostGIS + Pelias + Valhalla + MBTiles
                      │
                      ▼
              dataset_versions table
                      │
                      ▼
         Incremental osmChange (daily)
```

---

## 1. Download

**Source:** [Geofabrik India](https://download.geofabrik.de/asia/india.html)

```bash
wget -O data/india-latest.osm.pbf \
  https://download.geofabrik.de/asia/india-latest.osm.pbf
```

**World expansion:** Download `asia/*.pbf`, `europe/*.pbf`, etc. — same pipeline, different `region_code`.

---

## 2. PostGIS import (osm2pgsql)

```bash
osm2pgsql -d flipwi_maps --create --slim \
  -S platform/pipelines/osm-import/default.style \
  data/india-latest.osm.pbf
```

Post-process SQL (`schemas/postgis/`) builds `places`, `admin_boundaries`, `roads`.

---

## 3. Pelias index (OpenSearch)

Uses [Pelias docker](https://github.com/pelias/docker) with custom `pelias.json`:

- **Importers:** openstreetmap, openaddresses (optional), whosonfirst (admin)
- **India custom:** Map `place=village`, `boundary=administrative` admin_levels 4–10
- **POI categories:** Map OSM `amenity`, `shop`, `tourism`, `building` tags

```bash
cd platform/pipelines/pelias-index
docker compose run --rm pelias import osm
docker compose run --rm pelias index
```

**Reindex strategy:** Blue/green index alias swap — zero downtime.

---

## 4. Valhalla routing graph

```bash
docker run -v $(pwd)/data:/data valhalla/valhalla \
  valhalla_build_config --mjolnir-tile-dir /data/valhalla/tiles \
  --mjolnir-tile-extract /data/valhalla/tiles.tar

docker run -v $(pwd)/data:/data valhalla/valhalla \
  valhalla_build_tiles -c /data/valhalla.json /data/india-latest.osm.pbf
```

Profiles: auto, motorcycle, truck, bicycle, pedestrian.

---

## 5. Vector tiles (Planetiler)

```bash
java -jar planetiler.jar \
  --osm-path=data/india-latest.osm.pbf \
  --output=data/tiles/india.mbtiles \
  --bounds=68,6,97,37
```

Serve with **Martin**:

```bash
martin data/tiles/india.mbtiles
```

---

## 6. Incremental updates

Daily cron:

1. Fetch `india-updates/osmChange-*.osc.gz` from Geofabrik
2. Apply to PostGIS via `osm2pgsql --append`
3. Pelias partial update (changed OSM IDs)
4. Valhalla: weekly full rebuild; daily only for critical corridors (configurable)
5. Tiles: regenerate affected zoom levels or weekly full build
6. Record new `dataset_version`

---

## 7. Version history

Every import creates a row in `dataset_versions`. APIs accept optional `?dataset_version=` for A/B testing. Rollback = swap OpenSearch alias + tile CDN path.

---

## 8. Data quality (Admin GIS)

`Admin GIS Service` provides:

- Manual name overrides (JSONB `names_i18n`)
- Suppress duplicate POIs
- Flag geometry errors
- Merge split addresses

Changes logged in `audit_logs` and trigger partial Pelias reindex.
