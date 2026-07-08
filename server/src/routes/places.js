import { Router } from "express";
import { mergedSearch, mergedAutocomplete } from "../services/merged-search.js";
import { nearbyProprietaryPlaces } from "../services/proprietary-search.js";
import { query } from "../db/pool.js";
import { createPlaceSubmission } from "../services/submission-service.js";
import { recordDeliveryComplete } from "../services/delivery-service.js";
import { uploadGpsTrace, reportRoad } from "../services/gps-service.js";
import { submitBusinessVerification } from "../services/business-service.js";

const router = Router();

/** GET /places/search — merged OSM + proprietary */
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 1) return res.json({ results: [] });

    const region = req.query.region === "world" ? "world" : "india";
    const limit = Math.min(Number(req.query.limit ?? 25), 40);
    let proximity;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) proximity = [lng, lat];

    const results = await mergedSearch({ query: q, region, proximity, limit });
    res.json({ results, merged: true });
  } catch (err) {
    console.error("places/search:", err);
    res.status(502).json({ error: err.message });
  }
});

/** GET /places/nearby */
router.get("/nearby", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusM = Number(req.query.radius_m ?? 2000);
    const limit = Math.min(Number(req.query.limit ?? 20), 50);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    const results = await nearbyProprietaryPlaces({ lat, lng, radiusM, limit });
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

/** POST /places/create — user submission (pending verification) */
router.post("/create", async (req, res) => {
  try {
    const submitterId = req.headers["x-client-id"] ?? req.body.submitter_id ?? "anonymous";
    const submission = await createPlaceSubmission(req.body, submitterId);
    res.status(201).json({ submission, message: "Submitted for verification" });
  } catch (err) {
    res.status(err.message.includes("unavailable") ? 503 : 400).json({ error: err.message });
  }
});

/** PUT /places/update — address correction submission */
router.put("/update", async (req, res) => {
  try {
    const submitterId = req.headers["x-client-id"] ?? "anonymous";
    const submission = await createPlaceSubmission(
      { ...req.body, type: "address_correction" },
      submitterId
    );
    res.json({ submission });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /delivery/complete */
router.post("/delivery/complete", async (req, res) => {
  try {
    const result = await recordDeliveryComplete(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /gps/upload */
router.post("/gps/upload", async (req, res) => {
  try {
    const result = await uploadGpsTrace(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /road/report */
router.post("/road/report", async (req, res) => {
  try {
    const result = await reportRoad(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /business/verify */
router.post("/business/verify", async (req, res) => {
  try {
    const claimantId = req.headers["x-client-id"] ?? req.body.claimant_id ?? "anonymous";
    const result = await submitBusinessVerification(req.body, claimantId);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /analytics/search — popular queries */
router.get("/analytics/search", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 7), 90);
    const result = await query(
      `SELECT query, COUNT(*)::int AS count
       FROM recent_searches
       WHERE created_at > NOW() - ($1 || ' days')::interval
       GROUP BY query ORDER BY count DESC LIMIT 50`,
      [days]
    );
    res.json({ popular: result?.rows ?? [] });
  } catch (err) {
    res.json({ popular: [] });
  }
});

/** Record search for analytics */
router.post("/search/log", async (req, res) => {
  try {
    const { query: q, user_id, client_id, lat, lng, region_code, selected_place_id } = req.body;
    if (!q) return res.status(400).json({ error: "query required" });
    await query(
      `INSERT INTO recent_searches (query, user_id, client_id, geom, region_code, selected_place_id)
       VALUES ($1,$2,$3, CASE WHEN $4::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($5,$4),4326) ELSE NULL END, $6, $7)`,
      [q, user_id, client_id, lat ?? null, lng ?? null, region_code ?? "IN", selected_place_id ?? null]
    );
    res.status(201).json({ ok: true });
  } catch {
    res.status(201).json({ ok: true });
  }
});

export default router;
