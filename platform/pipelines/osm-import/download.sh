#!/usr/bin/env bash
# Download OSM extract for region code (default: IN)
set -euo pipefail
REGION="${1:-IN}"
DATA_DIR="$(dirname "$0")/../../data/osm"
mkdir -p "$DATA_DIR"

case "$REGION" in
  IN)
    URL="https://download.geofabrik.de/asia/india-latest.osm.pbf"
    OUT="$DATA_DIR/india-latest.osm.pbf"
    ;;
  *)
    echo "Add URL for region $REGION in download.sh"
    exit 1
    ;;
esac

echo "Downloading $URL → $OUT"
wget -c -O "$OUT" "$URL"
echo "Done: $(du -h "$OUT" | cut -f1)"
