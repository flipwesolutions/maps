/**
 * OSM road routing fallback when Valhalla is unavailable.
 * Uses OSRM public demo (OpenStreetMap data) until self-hosted Valhalla is up.
 */

const OSRM_BASE =
  process.env.OSRM_FALLBACK_URL ?? "https://router.project-osrm.org";

/**
 * @param {[number, number][]} points [lng, lat]
 * @param {number} alternatives
 */
export async function fetchOsrmRoutes(points, alternatives = 1) {
  const coordStr = points.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "true",
    alternatives: String(Math.min(alternatives, 3)),
  });

  const response = await fetch(
    `${OSRM_BASE}/route/v1/driving/${coordStr}?${params}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`OSRM fallback failed (${response.status})`);
  }

  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(data.message ?? "No OSRM route");
  }

  return { routes: data.routes };
}

/** Last-resort straight-line route */
export function createDirectRoute(from, to) {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  const distance = 2 * R * Math.asin(Math.sqrt(a));
  const duration = Math.max(60, distance / 11.1);

  const segments = 16;
  const coordinates = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    coordinates.push([
      fromLng + (toLng - fromLng) * t,
      fromLat + (toLat - fromLat) * t,
    ]);
  }

  return {
    routes: [
      {
        distance,
        duration,
        geometry: { type: "LineString", coordinates },
        legs: [
          {
            steps: [
              {
                distance: distance * 0.95,
                duration: duration * 0.95,
                name: "",
                maneuver: { type: "depart", location: from },
              },
              {
                distance: distance * 0.05,
                duration: duration * 0.05,
                name: "",
                maneuver: { type: "arrive", location: to },
              },
            ],
          },
        ],
      },
    ],
    _fallback: "direct",
  };
}
