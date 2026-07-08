/**
 * Admin GIS panel API — requires X-Admin-Key header.
 */
import { Router } from "express";
import { query } from "../db/pool.js";
import {
  approveSubmission,
  rejectSubmission,
} from "../services/submission-service.js";
import { approveBusiness } from "../services/business-service.js";

export function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || key !== expected) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

const router = Router();
router.use(requireAdmin);

/** GET /admin/submissions/pending */
router.get("/submissions/pending", async (_req, res) => {
  const result = await query(
    `SELECT id, submission_type, payload, submitter_id, status, ai_confidence_score, created_at
     FROM data_submissions WHERE status IN ('pending', 'scored', 'gps_validated')
     ORDER BY ai_confidence_score DESC, created_at ASC LIMIT 100`
  );
  res.json({ submissions: result?.rows ?? [] });
});

/** POST /admin/submissions/:id/approve */
router.post("/submissions/:id/approve", async (req, res) => {
  try {
    const adminId = req.headers["x-admin-user"] ?? "admin";
    const result = await approveSubmission(req.params.id, adminId, req.body.notes);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /admin/submissions/:id/reject */
router.post("/submissions/:id/reject", async (req, res) => {
  try {
    const adminId = req.headers["x-admin-user"] ?? "admin";
    const result = await rejectSubmission(req.params.id, adminId, req.body.notes);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /admin/business/:id/approve */
router.post("/business/:id/approve", async (req, res) => {
  try {
    const adminId = req.headers["x-admin-user"] ?? "admin";
    const result = await approveBusiness(req.params.id, adminId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /admin/ai-suggestions */
router.get("/ai-suggestions", async (_req, res) => {
  const result = await query(
    `SELECT id, suggestion_type, ST_Y(geom) AS lat, ST_X(geom) AS lng, payload, confidence_score, status, created_at
     FROM ai_place_suggestions WHERE status = 'pending' ORDER BY confidence_score DESC LIMIT 50`
  );
  res.json({ suggestions: result?.rows ?? [] });
});

/** GET /admin/stats */
router.get("/stats", async (_req, res) => {
  const counts = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM verified_places WHERE verification_status = 'approved') AS verified_places,
      (SELECT COUNT(*)::int FROM verified_businesses WHERE verification_status = 'approved') AS businesses,
      (SELECT COUNT(*)::int FROM data_submissions WHERE status = 'pending') AS pending_submissions,
      (SELECT COUNT(*)::int FROM delivery_history WHERE created_at > NOW() - interval '7 days') AS deliveries_7d,
      (SELECT COUNT(*)::int FROM driver_traces WHERE created_at > NOW() - interval '7 days') AS gps_traces_7d
  `);
  res.json({ stats: counts?.rows?.[0] ?? {} });
});

export default router;
