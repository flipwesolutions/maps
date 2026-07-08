/**
 * Place submission — always pending verification, never auto-published.
 */
import { query } from "../db/pool.js";
import { scoreSubmission } from "./ai-confidence.js";

const SUBMISSION_TARGETS = {
  place: "verified_places",
  business: "verified_businesses",
  apartment: "apartments",
  warehouse: "warehouse_locations",
  office: "verified_places",
  building: "verified_buildings",
  school: "verified_places",
  hospital: "verified_places",
  temple: "verified_places",
  landmark: "verified_landmarks",
  pickup_point: "pickup_locations",
  drop_point: "drop_locations",
  address_correction: "address_corrections",
  road_correction: "road_reports",
  missing_road: "road_reports",
  missing_village: "verified_places",
  missing_layout: "verified_places",
  missing_colony: "verified_places",
};

export async function createSubmission({
  submissionType,
  payload,
  submitterId,
  submitterRole = "customer",
  gps,
}) {
  const ai = scoreSubmission({ submissionType, payload, gps });

  const result = await query(
    `INSERT INTO data_submissions
      (submission_type, payload, submitter_id, submitter_role, gps_geom, gps_accuracy_m, status, ai_confidence_score, ai_flags)
     VALUES ($1, $2, $3, $4,
       CASE WHEN $5::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($6, $5), 4326) ELSE NULL END,
       $7, 'scored', $8, $9)
     RETURNING id, status, ai_confidence_score, created_at`,
    [
      submissionType,
      JSON.stringify(payload),
      submitterId,
      submitterRole,
      gps?.lat ?? null,
      gps?.lng ?? null,
      gps?.accuracy_m ?? null,
      ai.score,
      JSON.stringify(ai.flags),
    ]
  );

  if (!result?.rows?.[0]) {
    throw new Error("Database unavailable — cannot create submission");
  }

  return result.rows[0];
}

export async function createPlaceSubmission(body, submitterId) {
  const submissionType = body.type ?? "place";
  const target = SUBMISSION_TARGETS[submissionType] ?? "verified_places";

  const payload = {
    ...body,
    target_table: target,
    name: body.name,
    category: body.category ?? submissionType,
    address: body.address,
    geom: body.geom,
  };

  return createSubmission({
    submissionType,
    payload,
    submitterId,
    submitterRole: body.submitter_role ?? "customer",
    gps: body.gps,
  });
}

export async function approveSubmission(submissionId, adminId, notes) {
  const sub = await query(
    `SELECT * FROM data_submissions WHERE id = $1`,
    [submissionId]
  );
  if (!sub?.rows?.[0]) throw new Error("Submission not found");

  const row = sub.rows[0];
  const payload = row.payload;
  const target = payload.target_table ?? "verified_places";

  let productionId = null;

  if (target === "verified_places" && payload.geom) {
    const ins = await query(
      `INSERT INTO verified_places
        (name, category, street, locality, district, state, postal_code, country, geom, verification_status, confidence_score, verified_at, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
         ST_SetSRID(ST_MakePoint($9,$10),4326), 'approved', $11, NOW(), 'flipwi')
       RETURNING id`,
      [
        payload.name,
        payload.category,
        payload.address?.street,
        payload.address?.locality,
        payload.address?.district,
        payload.address?.state,
        payload.address?.postal_code,
        payload.address?.country ?? "India",
        payload.geom.lng,
        payload.geom.lat,
        row.ai_confidence_score ?? 0.85,
      ]
    );
    productionId = ins?.rows?.[0]?.id;
  }

  await query(
    `UPDATE data_submissions SET status = 'approved', reviewer_id = $2, review_notes = $3,
      production_record_id = $4, production_table = $5, reviewed_at = NOW()
     WHERE id = $1`,
    [submissionId, adminId, notes, productionId, target]
  );

  return { submissionId, productionId, target, status: "approved" };
}

export async function rejectSubmission(submissionId, adminId, notes) {
  await query(
    `UPDATE data_submissions SET status = 'rejected', reviewer_id = $2, review_notes = $3, reviewed_at = NOW()
     WHERE id = $1`,
    [submissionId, adminId, notes]
  );
  return { submissionId, status: "rejected" };
}
