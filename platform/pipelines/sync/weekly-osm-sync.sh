#!/usr/bin/env bash
# Weekly OpenStreetMap sync — preserves all verified proprietary data.
# Never overwrites approved Flipwi records.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/../.."
REGION="${1:-IN}"
LOG_DIR="$ROOT/data/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/weekly-sync-$(date +%Y%m%d).log"

exec > >(tee -a "$LOG") 2>&1

echo "=== Flipwi weekly OSM sync $(date -Iseconds) ==="

# 1. Download latest extract
"$ROOT/pipelines/osm-import/download.sh" "$REGION"

# 2. Register new dataset version in PostGIS (manual step until automated)
echo ">>> Create new dataset_version row with status=importing"

# 3. Import OSM to planet_osm_* (never touch verified_* tables)
"$ROOT/pipelines/osm-import/import-postgis.sh" "$REGION"

# 4. Detect conflicts between OSM changes and proprietary data
echo ">>> Run conflict detection: proprietary rows linked to changed osm_id"
# psql -f "$ROOT/pipelines/sync/detect-conflicts.sql"

# 5. Rebuild search index (blue/green — new index, swap alias)
"$ROOT/pipelines/pelias-index/build-india.sh"

# 6. Rebuild routing tiles
"$ROOT/pipelines/valhalla/build-india.sh"

# 7. Regenerate vector tiles
"$ROOT/pipelines/tile-generation/build-india.sh"

# 8. Mark old dataset_version as superseded, new as active
echo ">>> UPDATE dataset_versions SET status='superseded' WHERE status='active'"
echo ">>> UPDATE dataset_versions SET status='active' WHERE version_tag='<new>'"

# 9. Publish — restart Martin, Valhalla, Pelias; purge NGINX/CDN cache
echo ">>> docker compose --profile full restart martin valhalla pelias-api"

echo "=== Weekly sync complete ==="
