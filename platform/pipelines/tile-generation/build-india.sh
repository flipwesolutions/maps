#!/usr/bin/env bash
# Generate vector tiles (MBTiles) from India OSM using Planetiler
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PBF="$SCRIPT_DIR/../../data/osm/india-latest.osm.pbf"
OUT_DIR="$SCRIPT_DIR/../../data/tiles"
OUT_FILE="$OUT_DIR/india.mbtiles"

if [[ ! -f "$PBF" ]]; then
  echo "Missing $PBF — run osm-import/download.sh IN"
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Generating vector tiles with Planetiler (2–4 hours for India)..."

docker run --rm \
  -e JAVA_TOOL_OPTIONS="-Xmx8g" \
  -v "$PBF:/data/region.osm.pbf:ro" \
  -v "$OUT_DIR:/output" \
  ghcr.io/onthegomap/planetiler:latest \
  --download \
  --osm-path=/data/region.osm.pbf \
  --output=/output/india.mbtiles \
  --area=india

echo "Tiles written to $OUT_FILE"
echo "Martin serves from: $OUT_DIR (mount in docker-compose)"
