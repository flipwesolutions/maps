#!/usr/bin/env bash
# Build Pelias search index for India (requires OpenSearch + Pelias docker-compose profile)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/../.."
PBF="$ROOT/data/osm/india-latest.osm.pbf"
PELIAS_JSON="$ROOT/infrastructure/pelias/pelias.json"

if [[ ! -f "$PBF" ]]; then
  echo "Missing $PBF — run osm-import/download.sh IN"
  exit 1
fi

echo "=== Pelias India index build ==="
echo "1. Ensure OpenSearch is healthy: curl http://localhost:9200/_cluster/health"
echo "2. Run Pelias import containers (see https://github.com/pelias/docker)"
echo "3. Config: $PELIAS_JSON"
echo ""
echo "Typical Pelias workflow:"
echo "  docker compose -f infrastructure/docker-compose.yml --profile full up -d opensearch"
echo "  # pelias prepare / import / index steps per pelias/docker documentation"
echo ""
echo "PBF ready at: $PBF ($(du -h "$PBF" | cut -f1))"
