/**
 * Proprietary places search — PostGIS full-text + trigram.
 * Only returns approved/public records.
 */
import { query } from "../db/pool.js";
import { cached, cacheKey } from "../cache.js";

function rowToPlace(row, layer, source) {
  const parts = [row.street, row.locality, row.district, row.state, row.country]
    .filter(Boolean)
    .join(", ");

  return {
    id: `flipwi-${layer}-${row.id}`,
    name: row.name || row.display_name || row.formatted_address || row.label,
    subtitle: parts || row.subtitle || "Flipwi Verified",
    coordinates: [Number(row.lng), Number(row.lat)],
    type: row.category || row.place_type || layer,
    source,
    layer,
    confidence_score: Number(row.confidence_score ?? 0),
    verification_status: row.verification_status,
    usage_count: Number(row.usage_count ?? 0),
  };
}

const PROPRIETARY_SEARCH_SQL = `
  WITH q AS (SELECT $1::text AS term)
  (
    SELECT vp.id, vp.name, vp.street, vp.locality, vp.district, vp.state, vp.country,
           vp.category, vp.confidence_score, vp.verification_status::text,
           0 AS usage_count, ST_X(vp.geom) AS lng, ST_Y(vp.geom) AS lat,
           'verified_place' AS place_type
    FROM verified_places vp, q
    WHERE vp.verification_status = 'approved'
      AND (vp.name ILIKE '%' || q.term || '%' OR vp.name % q.term)
    ORDER BY similarity(vp.name, q.term) DESC
    LIMIT $2
  )
  UNION ALL
  (
    SELECT vb.id, vb.display_name AS name, NULL, NULL, NULL, NULL, 'India',
           bc.name AS category, vb.confidence_score, vb.verification_status::text,
           0, ST_X(vb.geom), ST_Y(vb.geom), 'business'
    FROM verified_businesses vb
    LEFT JOIN business_categories bc ON bc.id = vb.category_id, q
    WHERE vb.verification_status = 'approved'
      AND (vb.display_name ILIKE '%' || q.term || '%' OR vb.display_name % q.term)
    ORDER BY similarity(vb.display_name, q.term) DESC
    LIMIT $2
  )
  UNION ALL
  (
    SELECT va.id, va.formatted_address AS name, va.street, va.locality, va.district, va.state, 'India',
           'address', va.confidence_score, va.verification_status::text,
           0, ST_X(va.geom), ST_Y(va.geom), 'address'
    FROM verified_addresses va, q
    WHERE va.verification_status = 'approved'
      AND (va.formatted_address ILIKE '%' || q.term || '%' OR va.formatted_address % q.term)
    ORDER BY similarity(va.formatted_address, q.term) DESC
    LIMIT $2
  )
  UNION ALL
  (
    SELECT wl.id, wl.name, NULL, NULL, NULL, NULL, 'India',
           'warehouse', 0.9, wl.verification_status::text,
           0, ST_X(wl.geom), ST_Y(wl.geom), 'warehouse'
    FROM warehouse_locations wl, q
    WHERE wl.verification_status = 'approved'
      AND wl.name ILIKE '%' || q.term || '%'
    LIMIT $2
  )
  UNION ALL
  (
    SELECT pa.id, pa.alias AS name, NULL, NULL, NULL, NULL, 'India',
           'alias', 0.7, 'approved',
           0, ST_X(vp.geom), ST_Y(vp.geom), 'alias'
    FROM place_aliases pa
    JOIN verified_places vp ON vp.id = pa.proprietary_id AND pa.proprietary_table = 'verified_places', q
    WHERE pa.alias ILIKE '%' || q.term || '%' OR pa.alias % q.term
    LIMIT $2
  )
`;

async function searchProprietaryUncached(searchQuery, limit, proximity) {
  const db = await query(PROPRIETARY_SEARCH_SQL, [searchQuery, limit]);
  if (!db) return [];

  let rows = db.rows.map((r) =>
    rowToPlace(
      r,
      r.place_type,
      r.place_type === "business"
        ? "flipwi_business"
        : r.place_type === "warehouse"
          ? "flipwi_warehouse"
          : r.place_type === "address"
            ? "flipwi_address"
            : "flipwi_verified"
    )
  );

  if (proximity) {
    rows = rows.sort((a, b) => {
      const da = dist(a.coordinates, proximity);
      const db_ = dist(b.coordinates, proximity);
      return da - db_;
    });
  }

  return rows.slice(0, limit);
}

function dist(a, b) {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  return (lng1 - lng2) ** 2 + (lat1 - lat2) ** 2;
}

export async function searchProprietaryPlaces({
  query: searchQuery,
  limit = 20,
  proximity,
}) {
  const key = cacheKey("prop-search", [
    searchQuery,
    limit,
    proximity?.map((n) => n.toFixed(3)).join(","),
  ]);
  return cached(
    key,
    () => searchProprietaryUncached(searchQuery, limit, proximity),
    180
  );
}

/** Nearby approved proprietary places */
export async function nearbyProprietaryPlaces({ lat, lng, radiusM = 2000, limit = 20 }) {
  const sql = `
    SELECT vp.id, vp.name, vp.street, vp.locality, vp.district, vp.state, vp.country,
           vp.category, vp.confidence_score, vp.verification_status::text,
           0 AS usage_count, ST_X(vp.geom) AS lng, ST_Y(vp.geom) AS lat,
           'verified_place' AS place_type,
           ST_Distance(vp.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS dist_m
    FROM verified_places vp
    WHERE vp.verification_status = 'approved'
      AND ST_DWithin(vp.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
    ORDER BY dist_m
    LIMIT $4
  `;
  const db = await query(sql, [lat, lng, radiusM, limit]);
  if (!db) return [];
  return db.rows.map((r) => ({
    ...rowToPlace(r, "verified_place", "flipwi_verified"),
    distance_m: Math.round(Number(r.dist_m)),
  }));
}
