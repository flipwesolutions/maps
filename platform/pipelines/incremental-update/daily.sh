#!/usr/bin/env bash
# Nightly incremental OSM update pipeline
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REGION="${1:-IN}"
LOG_DIR="$SCRIPT_DIR/../../data/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/update-$(date +%Y%m%d).log"

exec > >(tee -a "$LOG") 2>&1

echo "=== Flipwi Maps incremental update $(date -Iseconds) ==="

"$SCRIPT_DIR/../osm-import/download.sh" "$REGION"
"$SCRIPT_DIR/../osm-import/import-postgis.sh" "$REGION"
"$SCRIPT_DIR/../pelias-index/build-india.sh"
"$SCRIPT_DIR/../valhalla/build-india.sh"
"$SCRIPT_DIR/../tile-generation/build-india.sh"

echo "=== Update complete ==="
