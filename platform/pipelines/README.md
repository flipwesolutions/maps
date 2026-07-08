# Data pipelines

| Pipeline | Script | Output |
|----------|--------|--------|
| OSM download | `osm-import/download.sh IN` | `data/osm/india-latest.osm.pbf` |
| PostGIS import | `osm-import/import-postgis.sh` | `places`, `roads`, `admin_boundaries` |
| Pelias index | `pelias-index/build-india.sh` | OpenSearch indices |
| Valhalla graph | `valhalla/build-india.sh` | `valhalla_tiles.tar` |
| Vector tiles | `tile-generation/build-india.sh` | `data/tiles/india.mbtiles` |
| Incremental | `incremental-update/daily.sh` | Updated `dataset_version` |

See [../docs/DATA-PIPELINE.md](../docs/DATA-PIPELINE.md).
