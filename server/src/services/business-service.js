/**
 * Business verification & claims — Layer 6.
 */
import { query } from "../db/pool.js";
import { createSubmission } from "./submission-service.js";

export async function submitBusinessVerification(body, claimantId) {
  const {
    business_name,
    display_name,
    gst_number,
    phone,
    website,
    category_code,
    opening_hours,
    geom,
    photos,
  } = body;

  if (!display_name || !geom?.lat || !geom?.lng) {
    throw new Error("display_name and geom are required");
  }

  const cat = category_code
    ? await query(`SELECT id FROM business_categories WHERE code = $1`, [category_code])
    : null;

  const biz = await query(
    `INSERT INTO verified_businesses
      (legal_name, display_name, gst_number, phone, website, category_id, opening_hours, geom, verification_status, claim_status, claimed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7, ST_SetSRID(ST_MakePoint($9,$8),4326), 'pending', 'pending', $10)
     RETURNING id`,
    [
      business_name ?? display_name,
      display_name,
      gst_number ?? null,
      phone ?? null,
      website ?? null,
      cat?.rows?.[0]?.id ?? null,
      JSON.stringify(opening_hours ?? {}),
      geom.lat,
      geom.lng,
      claimantId,
    ]
  );

  const businessId = biz?.rows?.[0]?.id;
  if (!businessId) throw new Error("Database unavailable");

  await query(
    `INSERT INTO business_verification_claims (business_id, claimant_id, gst_number, documents, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [businessId, claimantId, gst_number ?? null, JSON.stringify(photos ?? [])]
  );

  await createSubmission({
    submissionType: "business",
    payload: { business_id: businessId, display_name, gst_number },
    submitterId: claimantId,
    submitterRole: "merchant",
    gps: geom,
  });

  return { business_id: businessId, status: "pending" };
}

export async function approveBusiness(businessId, adminId) {
  await query(
    `UPDATE verified_businesses SET verification_status = 'approved', claim_status = 'claimed', verified_at = NOW()
     WHERE id = $1`,
    [businessId]
  );
  await query(
    `INSERT INTO verification_history (entity_table, entity_id, action, to_status, actor_id, actor_type)
     VALUES ('verified_businesses', $1, 'approve', 'approved', $2, 'admin')`,
    [businessId, adminId]
  );
  return { business_id: businessId, status: "approved" };
}
