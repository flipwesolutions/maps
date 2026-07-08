/**
 * OSM-based routing via public OSRM demo (OpenStreetMap road data).
 * Fallback until self-hosted Valhalla is deployed.
 */
import type { RouteResult } from "./routing";

const OSRM_BASE =
  process.env.EXPO_PUBLIC_OSRM_URL ?? "https://router.project-osrm.org";
const ROUTE_TIMEOUT_MS = 20000;

interface OsrmRouteResponse {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs?: Array<{
      steps?: Array<{
        distance: number;
        duration: number;
        name?: string;
        maneuver: {
          type: string;
          modifier?: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
  code?: string;
  message?: string;
}

function parseRoute(
  route: NonNullable<OsrmRouteResponse["routes"]>[0],
  label?: string
): RouteResult {
  const steps =
    route.legs?.flatMap((leg) => leg.steps ?? []).map((step) => ({
      instruction: step.maneuver.type,
      distanceMeters: step.distance,
      durationSeconds: step.duration,
      location: step.maneuver.location,
      type: step.maneuver.type,
      modifier: step.maneuver.modifier,
      streetName: step.name,
    })) ?? [];

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps,
    label,
  };
}

export async function fetchOsrmRoutes(
  points: [number, number][],
  alternatives = 2
): Promise<RouteResult[]> {
  const coordStr = points.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "true",
    alternatives: String(Math.min(alternatives, 3)),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${OSRM_BASE}/route/v1/driving/${coordStr}?${params}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`OSRM routing failed (${response.status})`);
    }

    const data = (await response.json()) as OsrmRouteResponse;
    if (data.code && data.code !== "Ok") {
      throw new Error(data.message ?? `OSRM error: ${data.code}`);
    }

    const routes = data.routes ?? [];
    if (!routes.length) throw new Error("No OSRM route found");

    return routes
      .filter((r) => r.geometry?.coordinates?.length)
      .map((r, i) => parseRoute(r, i === 0 ? undefined : `Alternative ${i}`));
  } finally {
    clearTimeout(timer);
  }
}
