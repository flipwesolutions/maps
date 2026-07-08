/**
 * Delivery intelligence — every delivery improves address confidence.
 */
import { query } from "../db/pool.js";

export async function recordDeliveryComplete(body) {
  const {
    order_id,
    driver_id,
    customer_id,
    pickup,
    drop,
    route_coordinates,
    outcome = "success",
    failure_reason,
    duration_s,
    distance_m,
    entrance_type,
    verified_address_id,
  } = body;

  if (!drop?.lat || !drop?.lng) {
    throw new Error("drop.lat and drop.lng are required");
  }

  const hist = await query(
    `INSERT INTO delivery_history
      (order_id, driver_id, customer_id, pickup_geom, drop_geom, route_geom, outcome, failure_reason, duration_s, distance_m, delivered_at)
     VALUES ($1,$2,$3,
       CASE WHEN $4::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($5,$4),4326) ELSE NULL END,
       ST_SetSRID(ST_MakePoint($7,$6),4326),
       CASE WHEN $8::text IS NOT NULL THEN ST_GeomFromGeoJSON($8) ELSE NULL END,
       $9,$10,$11,$12, NOW())
     RETURNING id`,
    [
      order_id,
      driver_id,
      customer_id,
      pickup?.lat ?? null,
      pickup?.lng ?? null,
      drop.lat,
      drop.lng,
      route_coordinates ? JSON.stringify({ type: "LineString", coordinates: route_coordinates }) : null,
      outcome,
      failure_reason ?? null,
      duration_s ?? null,
      distance_m ?? null,
    ]
  );

  if (outcome === "success") {
    await query(
      `INSERT INTO delivery_success_addresses (verified_address_id, geom, entrance_type, success_count, last_success_at)
       VALUES ($1, ST_SetSRID(ST_MakePoint($3,$2),4326), $4, 1, NOW())
       ON CONFLICT (verified_address_id) DO UPDATE SET
         success_count = delivery_success_addresses.success_count + 1,
         last_success_at = NOW(),
         entrance_type = COALESCE(EXCLUDED.entrance_type, delivery_success_addresses.entrance_type)`,
      [verified_address_id ?? null, drop.lat, drop.lng, entrance_type ?? null]
    );

    if (verified_address_id) {
      const existing = await query(
        `SELECT id FROM address_confidence WHERE verified_address_id = $1`,
        [verified_address_id]
      );
      if (existing?.rows?.[0]) {
        await query(
          `UPDATE address_confidence SET
             sample_deliveries = sample_deliveries + 1,
             success_rate = (COALESCE(success_rate,0) * sample_deliveries + 1) / (sample_deliveries + 1),
             deliverability_score = LEAST(1, COALESCE(deliverability_score,0.5) + 0.02),
             updated_at = NOW()
           WHERE verified_address_id = $1`,
          [verified_address_id]
        );
      } else {
        await query(
          `INSERT INTO address_confidence (verified_address_id, geom, deliverability_score, sample_deliveries, success_rate)
           VALUES ($1, ST_SetSRID(ST_MakePoint($3,$2),4326), 0.8, 1, 1.0)`,
          [verified_address_id, drop.lat, drop.lng]
        );
      }
    }
  } else if (outcome === "failed") {
    await query(
      `INSERT INTO delivery_failed_addresses (verified_address_id, geom, failure_reason, failure_count, last_failure_at)
       VALUES ($1, ST_SetSRID(ST_MakePoint($3,$2),4326), $4, 1, NOW())`,
      [verified_address_id ?? null, drop.lat, drop.lng, failure_reason ?? "unknown"]
    );
  }

  return { delivery_id: hist?.rows?.[0]?.id, outcome };
}
