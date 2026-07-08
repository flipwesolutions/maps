/**
 * Rank and merge OSM (Pelias) + proprietary PostGIS search results.
 */

const LAYER_BOOST = {
  flipwi_verified: 55,
  flipwi_business: 50,
  flipwi_warehouse: 48,
  flipwi_address: 45,
  flipwi_pickup: 42,
  flipwi_apartment: 40,
  osm: 20,
};

/**
 * @param {{ id: string; name: string; subtitle: string; coordinates: [number, number]; type?: string; source?: string; layer?: string; confidence_score?: number; verification_status?: string; usage_count?: number; distance_m?: number }} place
 * @param {[number, number] | undefined} proximity
 */
export function scorePlace(place, proximity) {
  let score = LAYER_BOOST[place.layer ?? place.source ?? "osm"] ?? 15;

  if (place.verification_status === "approved") score += 25;
  score += (place.confidence_score ?? 0) * 20;
  score += Math.min(place.usage_count ?? 0, 500) * 0.05;

  if (proximity && place.coordinates) {
    const dist = haversineM(proximity, place.coordinates);
    place.distance_m = Math.round(dist);
    if (dist < 500) score += 30;
    else if (dist < 2000) score += 20;
    else if (dist < 10000) score += 10;
    else if (dist < 50000) score += 5;
  }

  return score;
}

function haversineM(a, b) {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * @param {Array<Record<string, unknown>>} lists
 * @param {{ proximity?: [number, number]; limit: number }} opts
 */
export function mergeSearchResults(lists, opts) {
  const { proximity, limit } = opts;
  const seen = new Map();

  for (const list of lists) {
    for (const raw of list) {
      const place = /** @type {any} */ (raw);
      if (!place?.coordinates?.length) continue;

      const key = `${place.coordinates[0].toFixed(4)}:${place.coordinates[1].toFixed(4)}:${String(place.name).toLowerCase().slice(0, 32)}`;
      const score = scorePlace(place, proximity);

      const existing = seen.get(key);
      if (!existing || score > existing._score) {
        seen.set(key, { ...place, _score: score });
      }
    }
  }

  return [...seen.values()]
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...place }) => ({
      ...place,
      rank_score: Math.round(_score),
    }));
}
