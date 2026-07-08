import "dotenv/config";
import cors from "cors";
import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { requireApiKey, rateLimit } from "./middleware/auth.js";
import { requestLogger } from "./middleware/logger.js";
import {
  reverseGeocode,
} from "./providers/geocoding.js";
import { fetchDrivingRoute } from "./providers/routing.js";
import { mergedSearch, mergedAutocomplete } from "./services/merged-search.js";
import { isDatabaseReady } from "./db/pool.js";
import placesRouter from "./routes/places.js";
import adminRouter from "./routes/admin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({
    service: "Flipwi Maps API Gateway",
    version: "1.0.0",
    health: "/health",
    endpoints: {
      search: "GET /api/v1/search?q=... (merged OSM + proprietary)",
      placesSearch: "GET /api/v1/places/search?q=...",
      autocomplete: "GET /api/v1/autocomplete?q=...",
      reverse: "GET /api/v1/reverse?lat=...&lng=...",
      route: "GET /api/v1/route?fromLat=...&fromLng=...&toLat=...&toLng=...",
      placesCreate: "POST /api/v1/places/create",
      deliveryComplete: "POST /api/v1/places/delivery/complete",
      gpsUpload: "POST /api/v1/places/gps/upload",
      businessVerify: "POST /api/v1/places/business/verify",
      admin: "/api/v1/admin/* (X-Admin-Key)",
      mapStyle: "GET /styles/flipwi-streets.json",
    },
    docs: "platform/docs/PROPRIETARY-PLATFORM.md",
  });
});

app.get("/health", async (_req, res) => {
  const dbReady = await isDatabaseReady();
  res.json({
    ok: true,
    platform: "flipwi-maps",
    search: "merged-osm-proprietary",
    routing: "valhalla",
    tiles: "martin",
    proprietary_db: dbReady,
    external_providers: false,
  });
});

/** Self-hosted MapLibre style — no MapTiler/CARTO/Google */
app.get("/styles/flipwi-streets.json", (_req, res) => {
  try {
    const stylePath = join(
      __dirname,
      "../../platform/infrastructure/map-styles/flipwi-streets.json"
    );
    const raw = readFileSync(stylePath, "utf8");
    const tilesHost =
      process.env.TILESERVER_HOST ?? "http://tiles.maps.flipwi.local";
    const style = raw.replace(/\{\{TILESERVER_HOST\}\}/g, tilesHost);
    res.type("application/json").send(style);
  } catch (err) {
    res.status(500).json({ error: "Map style not found on platform" });
  }
});

app.use("/api/v1", requireApiKey, rateLimit);

app.get("/api/v1/autocomplete", async (req, res) => {
  try {
    const query = String(req.query.q ?? "").trim();
    if (query.length < 1) return res.json({ suggestions: [] });

    const region = req.query.region === "world" ? "world" : "india";
    const limit = Math.min(Number(req.query.limit ?? 10), 20);
    let proximity;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) proximity = [lng, lat];

    const suggestions = await mergedAutocomplete({
      query,
      region,
      proximity,
      limit,
    });
    res.json({ suggestions, merged: true });
  } catch (err) {
    console.error("autocomplete error:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Autocomplete failed",
    });
  }
});

app.get("/api/v1/search", async (req, res) => {
  try {
    const query = String(req.query.q ?? "").trim();
    if (query.length < 2) return res.json({ results: [] });

    const region = req.query.region === "world" ? "world" : "india";
    const limit = Math.min(Number(req.query.limit ?? 25), 40);
    let proximity;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) proximity = [lng, lat];

    const results = await mergedSearch({ query, region, proximity, limit });
    res.json({ results, merged: true });
  } catch (err) {
    console.error("search error:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Search failed",
    });
  }
});

app.get("/api/v1/reverse", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const label = await reverseGeocode({ coordinates: [lng, lat] });
    res.json({ label });
  } catch (err) {
    console.error("reverse error:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Reverse geocoding failed",
    });
  }
});

app.use("/api/v1/places", requireApiKey, rateLimit, placesRouter);
app.use("/api/v1/admin", adminRouter);

app.get("/api/v1/route", async (req, res) => {
  try {
    const fromLng = Number(req.query.fromLng);
    const fromLat = Number(req.query.fromLat);
    const toLng = Number(req.query.toLng);
    const toLat = Number(req.query.toLat);
    const alternatives = Number(req.query.alternatives ?? 1);
    const profile = String(req.query.profile ?? "auto");

    if (![fromLng, fromLat, toLng, toLat].every((n) => Number.isFinite(n))) {
      return res.status(400).json({
        error: "fromLng, fromLat, toLng, toLat are required",
      });
    }

    /** waypoints format: "lng,lat;lng,lat" */
    const waypoints = [];
    const wpRaw = String(req.query.waypoints ?? "").trim();
    if (wpRaw) {
      for (const pair of wpRaw.split(";")) {
        const [lng, lat] = pair.split(",").map(Number);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          waypoints.push([lng, lat]);
        }
      }
    }

    const data = await fetchDrivingRoute({
      from: [fromLng, fromLat],
      to: [toLng, toLat],
      waypoints,
      alternatives,
      profile,
    });

    res.json(data);
  } catch (err) {
    console.error("route error:", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Routing failed",
    });
  }
});

app.listen(port, () => {
  console.log(`Flipwi Maps API Gateway → http://localhost:${port}`);
  console.log(`Search: Pelias @ ${process.env.PELIAS_HOST ?? "(not set)"}`);
  console.log(`Routing: Valhalla @ ${process.env.VALHALLA_HOST ?? "(not set)"}`);
});
