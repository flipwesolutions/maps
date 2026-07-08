import { distanceMeters, viaPointOffset, polylineLength, bearingBetween } from "./geo-utils";
import { isPlatformConfigured, mapsApiFetch } from "./api-config";
import { createDirectRoute } from "./routing-fallback";
import { fetchOsrmRoutes } from "./osm-routing-fallback";

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  location: [number, number];
  type: string;
  modifier?: string;
  streetName?: string;
}

export interface RouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  label?: string;
}

interface OsrmManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
}

interface OsrmStep {
  distance: number;
  duration: number;
  name?: string;
  maneuver: OsrmManeuver;
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  legs?: Array<{ steps?: OsrmStep[] }>;
}

interface OsrmRouteResponse {
  routes?: OsrmRoute[];
  code?: string;
}

const MIN_ROUTES = 2;
const MAX_ROUTES = 3;
const PLATFORM_ROUTE_TIMEOUT_MS = 4000;

function isValidCoord([lng, lat]: [number, number]): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lng === 0 && lat === 0)
  );
}

function assertValidRoutePoints(points: [number, number][]): void {
  if (points.length < 2) throw new Error("Route needs pickup and destination");
  for (const p of points) {
    if (!isValidCoord(p)) throw new Error("Invalid route coordinates");
  }
}

function formatManeuver(step: OsrmStep): string {
  const { type, modifier } = step.maneuver;
  const street = step.name ? ` onto ${step.name}` : "";

  if (type === "depart") return `Head${street}`;
  if (type === "arrive") return "You have arrived at your destination";
  if (type === "roundabout") {
    return modifier
      ? `At the roundabout, take the ${modifier} exit${street}`
      : `Enter the roundabout${street}`;
  }
  if (type === "merge") return `Merge${street}`;
  if (type === "fork") {
    if (modifier === "left") return `Keep left at the fork${street}`;
    if (modifier === "right") return `Keep right at the fork${street}`;
    return `Keep straight at the fork${street}`;
  }
  if (type === "end of road") {
    if (modifier === "left") return `Turn left${street}`;
    if (modifier === "right") return `Turn right${street}`;
    return `Continue${street}`;
  }

  if (type === "turn" || type === "new name" || type === "continue") {
    const dir = modifier ?? "straight";
    if (dir === "straight") return `Continue straight${street}`;
    if (dir === "uturn") return `Make a U-turn${street}`;
    if (dir === "slight left") return `Slight left${street}`;
    if (dir === "slight right") return `Slight right${street}`;
    if (dir === "sharp left") return `Turn sharp left${street}`;
    if (dir === "sharp right") return `Turn sharp right${street}`;
    if (dir === "left") return `Turn left${street}`;
    if (dir === "right") return `Turn right${street}`;
    return `Continue${street}`;
  }

  return `Continue${street}`;
}

function parseOsrmRoute(route: OsrmRoute, label?: string): RouteResult {
  const rawSteps = route.legs?.flatMap((leg) => leg.steps ?? []) ?? [];
  const steps: RouteStep[] = rawSteps.map((step) => ({
    instruction: formatManeuver(step),
    distanceMeters: step.distance,
    durationSeconds: step.duration,
    location: step.maneuver.location,
    type: step.maneuver.type,
    modifier: step.maneuver.modifier,
    streetName: step.name || undefined,
  }));

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    steps,
    label,
  };
}

const ENDPOINT_SNAP_METERS = 30;

/** Snap route polyline to exact pickup/destination so the line reaches both pins. */
export function alignRouteToEndpoints(
  route: RouteResult,
  from: [number, number],
  to: [number, number]
): RouteResult {
  let coordinates = [...route.coordinates];

  if (coordinates.length === 0) {
    coordinates = [from, to];
  } else {
    if (distanceMeters(coordinates[0], from) > ENDPOINT_SNAP_METERS) {
      coordinates.unshift(from);
    } else {
      coordinates[0] = from;
    }
    const last = coordinates.length - 1;
    if (distanceMeters(coordinates[last], to) > ENDPOINT_SNAP_METERS) {
      coordinates.push(to);
    } else {
      coordinates[last] = to;
    }
  }

  const steps =
    route.steps.length > 0
      ? route.steps.map((step, i) =>
          i === route.steps.length - 1 ? { ...step, location: to } : step
        )
      : route.steps;

  const alignedDistance = polylineLength(coordinates);

  return {
    ...route,
    coordinates,
    steps,
    distanceMeters: alignedDistance,
  };
}

async function fetchRoutesViaPlatform(
  points: [number, number][],
  alternatives: number | false = false
): Promise<RouteResult[]> {
  const response = await mapsApiFetch(
    "/api/v1/route",
    {
      fromLng: points[0][0],
      fromLat: points[0][1],
      toLng: points[points.length - 1][0],
      toLat: points[points.length - 1][1],
      waypoints:
        points.length > 2
          ? points
              .slice(1, -1)
              .map(([lng, lat]) => `${lng},${lat}`)
              .join(";")
          : undefined,
      alternatives: alternatives === false ? 0 : alternatives,
      profile: "auto",
    },
    PLATFORM_ROUTE_TIMEOUT_MS
  );

  if (!response.ok) throw new Error("Could not fetch routes from platform");

  const data = (await response.json()) as OsrmRouteResponse & {
    routes?: OsrmRoute[];
  };

  const routes = data.routes ?? [];
  if (!routes.length) throw new Error("No route found");

  return routes
    .filter((r) => r.geometry?.coordinates?.length)
    .map((r) => parseOsrmRoute(r));
}

async function fetchRoutesViaOsrm(
  points: [number, number][],
  alternatives: number | false = false
): Promise<RouteResult[]> {
  const altCount = alternatives === false ? 0 : alternatives;
  const routes = await fetchOsrmRoutes(points, Math.max(altCount, 1));
  return routes.map((r) => ({
    ...r,
    steps: r.steps.map((step) => ({
      ...step,
      instruction:
        step.instruction === step.type
          ? formatManeuver({
              distance: step.distanceMeters,
              duration: step.durationSeconds,
              name: step.streetName,
              maneuver: {
                type: step.type,
                modifier: step.modifier,
                location: step.location,
              },
            })
          : step.instruction,
    })),
  }));
}

async function fetchRoutes(
  points: [number, number][],
  alternatives: number | false = false
): Promise<RouteResult[]> {
  assertValidRoutePoints(points);

  if (isPlatformConfigured()) {
    try {
      const platformRoutes = await fetchRoutesViaPlatform(points, alternatives);
      if (platformRoutes.length) return platformRoutes;
    } catch {
      /* API down or Valhalla unavailable — OSRM fallback */
    }
  }

  return fetchRoutesViaOsrm(points, alternatives);
}

function routesAreSimilar(a: RouteResult, b: RouteResult): boolean {
  const durDiff =
    Math.abs(a.durationSeconds - b.durationSeconds) /
    Math.max(a.durationSeconds, 1);
  const distDiff =
    Math.abs(a.distanceMeters - b.distanceMeters) /
    Math.max(a.distanceMeters, 1);

  if (durDiff < 0.04 && distDiff < 0.04) return true;

  const midA = a.coordinates[Math.floor(a.coordinates.length / 2)];
  const midB = b.coordinates[Math.floor(b.coordinates.length / 2)];
  if (!midA || !midB) return false;

  return distanceMeters(midA, midB) < 400;
}

function addUniqueRoute(
  list: RouteResult[],
  candidate: RouteResult
): RouteResult[] {
  if (list.some((r) => routesAreSimilar(r, candidate))) return list;
  return [...list, candidate];
}

function offsetKmForTrip(from: [number, number], to: [number, number]): number {
  const direct = distanceMeters(from, to);
  return Math.min(Math.max(direct / 5000, 2), 25);
}

async function fetchViaAlternative(
  from: [number, number],
  to: [number, number],
  sideSign: 1 | -1,
  offsetKm: number,
  label: string
): Promise<RouteResult | null> {
  try {
    const via = viaPointOffset(from, to, sideSign, offsetKm);
    const routes = await fetchRoutes([from, via, to], false);
    const route = routes[0];
    if (!route) return null;
    return { ...route, label };
  } catch {
    return null;
  }
}

export function isValidRouteCoord(coord: [number, number]): boolean {
  return isValidCoord(coord);
}

/** Always returns at least 1 route; uses direct route when routing services unavailable. */
export async function fetchDrivingRoutes(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult[]> {
  if (!isValidCoord(from) || !isValidCoord(to)) {
    throw new Error("Invalid pickup or destination coordinates");
  }

  let routes: RouteResult[] = [];

  try {
    routes = await fetchRoutes([from, to], 1);
  } catch {
    try {
      routes = await fetchRoutes([from, to], false);
    } catch {
      routes = [];
    }
  }

  if (routes.length === 0) {
    const direct = alignRouteToEndpoints(
      createDirectRoute(from, to, "Direct route (approx.)"),
      from,
      to
    );
    return [
      direct,
      { ...direct, label: "Alternative (approx.)" },
    ];
  }

  routes = routes.map((r, i) => ({
    ...r,
    label: i === 0 ? undefined : `Alternative ${i}`,
  }));

  const offsetKm = offsetKmForTrip(from, to);

  if (routes.length < MIN_ROUTES) {
    const altA = await fetchViaAlternative(from, to, 1, offsetKm, "Route B");
    if (altA) routes = addUniqueRoute(routes, altA);
  }

  if (routes.length < MIN_ROUTES) {
    const altB = await fetchViaAlternative(
      from,
      to,
      -1,
      offsetKm * 1.3,
      "Route B"
    );
    if (altB) routes = addUniqueRoute(routes, altB);
  }

  if (routes.length < MIN_ROUTES) {
    const altC = await fetchViaAlternative(
      from,
      to,
      1,
      offsetKm * 2,
      "Route B"
    );
    if (altC) routes = addUniqueRoute(routes, altC);
  }

  if (routes.length < MIN_ROUTES) {
    const direct = createDirectRoute(from, to, "Direct route (approx.)");
    routes = addUniqueRoute(routes, direct);
  }

  return routes
    .sort((a, b) => a.durationSeconds - b.durationSeconds)
    .slice(0, MAX_ROUTES)
    .map((r, i) =>
      alignRouteToEndpoints(
        {
          ...r,
          label:
            i === 0 ? "Fastest" : r.label ?? `Route ${String.fromCharCode(65 + i)}`,
        },
        from,
        to
      )
    );
}

/** Single route fallback. */
export async function fetchDrivingRoute(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult> {
  const routes = await fetchDrivingRoutes(from, to);
  return routes[0];
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 min";
  if (seconds < 60) return "< 1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

/** ETA duration for navigation bottom bar (rounds up like Google Maps). */
export function formatNavDuration(seconds: number): string {
  if (seconds <= 0) return "0 min";
  if (seconds < 60) return "< 1 min";
  const mins = Math.max(1, Math.ceil(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}
