#!/usr/bin/env bash
# Build Valhalla routing tiles from India OSM extract
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PBF="$SCRIPT_DIR/../../data/osm/india-latest.osm.pbf"
OUT_DIR="$SCRIPT_DIR/../../data/valhalla"

if [[ ! -f "$PBF" ]]; then
  echo "Missing $PBF — run osm-import/download.sh IN"
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Building Valhalla tiles from $PBF (this may take hours)..."

docker run --rm \
  -v "$PBF:/data/region.osm.pbf:ro" \
  -v "$OUT_DIR:/custom_files" \
  ghcr.io/gis-ops/docker-valhalla/valhalla:latest \
  build_tiles

echo "Valhalla tiles written to $OUT_DIR"
echo "Restart Valhalla: docker compose --profile full up -d valhalla"
