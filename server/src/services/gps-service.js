/**
 * Driver GPS intelligence — Layer 5.
 */
import { query } from "../db/pool.js";
import { scoreGpsCluster } from "./ai-confidence.js";

export async function uploadGpsTrace(body) {
  const { driver_id, session_id, points, speed_kmh, heading, accuracy_m, road_osm_id } = body;

  if (!driver_id || !points?.length || points.length < 2) {
    throw new Error("driver_id and points (min 2) are required");
  }

  const coords = points.map(([lng, lat]) => `${lng} ${lat}`).join(",");
  const wkt = `LINESTRING(${coords})`;

  const result = await query(
    `INSERT INTO driver_traces (driver_id, session_id, geom, speed_kmh, heading, accuracy_m, road_osm_id, recorded_at)
     VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6, $7, NOW())
     RETURNING id`,
    [driver_id, session_id ?? null, wkt, speed_kmh ?? null, heading ?? null, accuracy_m ?? null, road_osm_id ?? null]
  );

  return { trace_id: result?.rows?.[0]?.id };
}

export async function reportRoad(body) {
  const { report_type, description, geom, osm_way_id, reporter_id, effective_from, effective_until } = body;

  const result = await query(
    `INSERT INTO road_reports (report_type, description, geom, osm_way_id, reporter_id, effective_from, effective_until)
     VALUES ($1, $2,
       CASE WHEN $3::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($4,$3),4326) ELSE NULL END,
       $5, $6, $7, $8)
     RETURNING id, verification_status`,
    [
      report_type,
      description,
      geom?.lat ?? null,
      geom?.lng ?? null,
      osm_way_id ?? null,
      reporter_id,
      effective_from ?? new Date().toISOString(),
      effective_until ?? null,
    ]
  );

  return result?.rows?.[0];
}

/** Cluster driver stops to suggest new places */
export async function upsertGpsConfidence({ lat, lng, driver_id, suggested_name }) {
  const existing = await query(
    `SELECT id, visit_count, unique_drivers FROM gps_confidence
     WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, 50)
     LIMIT 1`,
    [lat, lng]
  );

  if (existing?.rows?.[0]) {
    const row = existing.rows[0];
    const visitCount = row.visit_count + 1;
    const score = scoreGpsCluster({
      visitCount,
      uniqueDrivers: row.unique_drivers,
      gpsAccuracy: 20,
    });
    await query(
      `UPDATE gps_confidence SET visit_count = $2, confidence_score = $3, updated_at = NOW()
       WHERE id = $1`,
      [row.id, visitCount, score]
    );
    if (score >= 0.75 && visitCount >= 50) {
      await query(
        `INSERT INTO ai_place_suggestions (suggestion_type, geom, payload, confidence_score, evidence)
         VALUES ('new_place', ST_SetSRID(ST_MakePoint($2,$1),4326), $3, $4, $5)`,
        [
          lat,
          lng,
          JSON.stringify({ name: suggested_name ?? "Suggested place", visit_count: visitCount }),
          score,
          JSON.stringify({ drivers: row.unique_drivers }),
        ]
      );
    }
    return { updated: true, visit_count: visitCount, confidence_score: score };
  }

  await query(
    `INSERT INTO gps_confidence (geom, visit_count, unique_drivers, confidence_score, suggested_place_name)
     VALUES (ST_SetSRID(ST_MakePoint($2,$1),4326), 1, 1, 0.1, $3)`,
    [lat, lng, suggested_name ?? null]
  );
  return { created: true };
}
