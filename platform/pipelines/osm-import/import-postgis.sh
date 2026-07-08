#!/usr/bin/env bash
# Import OSM PBF into PostGIS using osm2pgsql (Docker)
set -euo pipefail

REGION="${1:-IN}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../../data/osm"
PBF="$DATA_DIR/india-latest.osm.pbf"

POSTGIS_HOST="${POSTGIS_HOST:-localhost}"
POSTGIS_PORT="${POSTGIS_PORT:-5432}"
POSTGIS_DATABASE="${POSTGIS_DATABASE:-flipwi_maps}"
POSTGIS_USER="${POSTGIS_USER:-flipwi}"
POSTGIS_PASSWORD="${POSTGIS_PASSWORD:-flipwi}"

if [[ ! -f "$PBF" ]]; then
  echo "Missing $PBF — run download.sh first"
  exit 1
fi

echo "Importing $PBF → PostGIS ($POSTGIS_HOST:$POSTGIS_PORT/$POSTGIS_DATABASE)"

docker run --rm \
  -e PGPASSWORD="$POSTGIS_PASSWORD" \
  -v "$PBF:/data/region.osm.pbf:ro" \
  --network host \
  ghcr.io/osm2pgsql-dev/osm2pgsql:latest \
  -H "$POSTGIS_HOST" \
  -P "$POSTGIS_PORT" \
  -d "$POSTGIS_DATABASE" \
  -U "$POSTGIS_USER" \
  --create \
  --slim \
  --hstore \
  --latlong \
  --number-processes "$(nproc 2>/dev/null || echo 4)" \
  /data/region.osm.pbf

echo "PostGIS import complete."
