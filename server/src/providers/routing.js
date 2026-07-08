/**
 * Routing — Valhalla (primary) with OSM OSRM fallback when Valhalla is down.
 */

import { fetchOsrmRoutes, createDirectRoute } from "./osrm-fallback.js";

function valhallaHost() {
  const host = process.env.VALHALLA_HOST ?? process.env.VALHALLA_URL;
  if (!host) {
    throw new Error("VALHALLA_HOST is not configured");
  }
  return host.replace(/\/$/, "");
}

const PROFILE_MAP = {
  auto: "auto",
  driving: "auto",
  car: "auto",
  van: "auto",
  walking: "pedestrian",
  pedestrian: "pedestrian",
  cycling: "bicycle",
  bicycle: "bicycle",
  bike: "bicycle",
  motorcycle: "motorcycle",
  truck: "truck",
};

/** Map Valhalla numeric maneuver types to OSRM-style strings for mobile client */
const MANEUVER_TYPE_MAP = {
  0: "continue",
  1: "depart",
  2: "depart",
  3: "depart",
  4: "arrive",
  5: "arrive",
  6: "arrive",
  15: "continue",
  16: "turn",
  17: "turn",
  18: "turn",
  19: "turn",
  20: "turn",
  21: "turn",
  22: "turn",
  23: "turn",
  24: "merge",
  25: "merge",
  26: "merge",
  27: "merge",
  28: "merge",
  29: "roundabout",
  30: "roundabout",
  31: "roundabout",
  32: "roundabout",
  33: "roundabout",
  34: "roundabout",
  35: "roundabout",
  36: "roundabout",
  37: "roundabout",
  38: "roundabout",
  39: "roundabout",
  40: "roundabout",
  41: "roundabout",
  42: "roundabout",
  43: "roundabout",
  44: "roundabout",
  45: "roundabout",
  46: "fork",
  47: "fork",
  48: "fork",
  49: "end of road",
  50: "end of road",
  51: "end of road",
  52: "end of road",
  53: "end of road",
  54: "end of road",
  55: "continue",
  56: "continue",
};

const MANEUVER_MODIFIER_MAP = {
  16: "slight right",
  17: "right",
  18: "sharp right",
  19: "uturn",
  20: "slight left",
  21: "left",
  22: "sharp left",
  23: "uturn",
  46: "left",
  47: "straight",
  48: "right",
  49: "left",
  50: "right",
  51: "straight",
  52: "left",
  53: "right",
  54: "straight",
};

function mapManeuverType(type) {
  if (typeof type === "string") return type;
  return MANEUVER_TYPE_MAP[type] ?? "continue";
}

function mapManeuverModifier(type) {
  if (typeof type === "string") return undefined;
  return MANEUVER_MODIFIER_MAP[type];
}

/**
 * @param {object} opts
 * @param {[number, number]} opts.from [lng, lat]
 * @param {[number, number]} opts.to [lng, lat]
 * @param {[number, number][]} [opts.waypoints] intermediate [lng, lat]
 * @param {number} opts.alternatives
 * @param {string} opts.profile
 */
export async function fetchDrivingRoute({
  from,
  to,
  waypoints = [],
  alternatives = 1,
  profile = "auto",
}) {
  const points = [from, ...waypoints, to];

  try {
    return await fetchValhallaRoute({ from, to, waypoints, alternatives, profile });
  } catch (valhallaErr) {
    console.warn("Valhalla unavailable, using OSRM fallback:", valhallaErr.message);
    try {
      const osrm = await fetchOsrmRoutes(points, alternatives);
      return { ...osrm, _routing: "osrm_fallback" };
    } catch (osrmErr) {
      console.warn("OSRM fallback failed, using direct route:", osrmErr.message);
      return createDirectRoute(from, to);
    }
  }
}

async function fetchValhallaRoute({
  from,
  to,
  waypoints = [],
  alternatives = 1,
  profile = "auto",
}) {
  const base = valhallaHost();
  const costing = PROFILE_MAP[profile] ?? "auto";

  const locations = [
    { lon: from[0], lat: from[1] },
    ...waypoints.map(([lng, lat]) => ({ lon: lng, lat })),
    { lon: to[0], lat: to[1] },
  ];
  const body = {
    locations,
    costing,
    directions_options: { units: "kilometers" },
    alternates: Math.min(alternatives, 3),
  };

  const response = await fetch(`${base}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Valhalla error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return valhallaToOsrmShape(data);
}

/** Convert Valhalla response to OSRM-compatible shape for mobile client */
function valhallaToOsrmShape(valhalla) {
  const trip = valhalla.trip;
  if (!trip) return { routes: [] };

  const routes = [];

  const main = tripToRoute(trip);
  if (main) routes.push(main);

  for (const alt of valhalla.alternates ?? []) {
    const r = tripToRoute(alt.trip ?? alt);
    if (r) routes.push(r);
  }

  return { routes };
}

function tripToRoute(trip) {
  if (!trip?.legs?.length) return null;

  const coordinates = [];
  const steps = [];
  let distance = 0;
  let duration = 0;

  for (const leg of trip.legs) {
    distance += leg.summary?.length ?? 0;
    duration += leg.summary?.time ?? 0;

    if (leg.shape) {
      const decoded = decodePolyline6(leg.shape);
      coordinates.push(...decoded);
    }

    for (const maneuver of leg.maneuvers ?? []) {
      const mType = mapManeuverType(maneuver.type);
      const mModifier = mapManeuverModifier(maneuver.type);
      steps.push({
        distance: maneuver.length * 1000,
        duration: maneuver.time,
        name: maneuver.street_names?.[0] ?? "",
        maneuver: {
          type: mType,
          modifier: mModifier,
          location: [maneuver.lon, maneuver.lat],
        },
      });
    }
  }

  return {
    distance: distance * 1000,
    duration,
    geometry: {
      type: "LineString",
      coordinates,
    },
    legs: [{ steps }],
  };
}

/** Valhalla encoded polyline (precision 6) */
function decodePolyline6(encoded) {
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lng / 1e6, lat / 1e6]);
  }

  return coords;
}
