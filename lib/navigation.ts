import { distanceMeters, closestPointOnPolyline, bearingBetween } from "./geo-utils";
import type { RouteResult, RouteStep } from "./routing";

export interface NavigationProgress {
  stepIndex: number;
  distanceToManeuverMeters: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  etaMs: number;
  isOffRoute: boolean;
  hasArrived: boolean;
  snappedLocation: [number, number];
  routeVertexIndex: number;
  remainingCoordinates: [number, number][];
}

const OFF_ROUTE_METERS = 35;
const ARRIVAL_METERS = 30;
const STEP_ADVANCE_METERS = 20;

function polylineLength(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += distanceMeters(coords[i], coords[i + 1]);
  }
  return total;
}

function distanceAlongToStep(
  coordinates: [number, number][],
  stepLocation: [number, number]
): number {
  const snap = closestPointOnPolyline(stepLocation, coordinates);
  return snap.distanceAlongMeters;
}

function ensureEndsAt(
  coords: [number, number][],
  destination: [number, number]
): [number, number][] {
  if (coords.length === 0) return [destination];
  const last = coords[coords.length - 1];
  if (distanceMeters(last, destination) > 8) {
    return [...coords, destination];
  }
  const next = [...coords];
  next[next.length - 1] = destination;
  return next;
}

/** Live navigation state from GPS position and active route. */
export function computeNavigationProgress(
  userLocation: [number, number],
  route: RouteResult,
  steps: RouteStep[],
  destination: [number, number]
): NavigationProgress {
  const coordinates = route.coordinates;
  const snap = closestPointOnPolyline(userLocation, coordinates);
  const totalLength = polylineLength(coordinates);
  const distToDestDirect = distanceMeters(snap.point, destination);
  const remainingAlong = Math.max(0, totalLength - snap.distanceAlongMeters);
  const remainingDistance = Math.min(remainingAlong, distToDestDirect + 15);
  const progressRatio =
    totalLength > 0 ? snap.distanceAlongMeters / totalLength : 0;
  const remainingDuration = Math.max(
    15,
    Math.round(route.durationSeconds * (1 - progressRatio))
  );

  const distUserToDest = distanceMeters(userLocation, destination);
  const hasArrived =
    distUserToDest < ARRIVAL_METERS ||
    distToDestDirect < ARRIVAL_METERS ||
    remainingDistance < ARRIVAL_METERS;

  const isOffRoute =
    snap.distanceMeters > OFF_ROUTE_METERS &&
    !hasArrived &&
    distUserToDest > ARRIVAL_METERS * 2;

  let stepIndex = 0;
  if (steps.length > 0) {
    const userAlong = snap.distanceAlongMeters;
    for (let i = 0; i < steps.length; i++) {
      const stepAlong = distanceAlongToStep(coordinates, steps[i].location);
      if (stepAlong >= userAlong - STEP_ADVANCE_METERS) {
        stepIndex = i;
        break;
      }
      stepIndex = i;
    }
    if (hasArrived) {
      stepIndex = steps.length - 1;
    }
  }

  const maneuverPoint = steps[stepIndex]?.location ?? destination;
  const maneuverAlong = distanceAlongToStep(coordinates, maneuverPoint);
  const distanceToManeuver = Math.max(
    0,
    maneuverAlong - snap.distanceAlongMeters
  );

  const remainingCoordinates = ensureEndsAt(
    [snap.point, ...coordinates.slice(snap.index + 1)],
    destination
  );

  return {
    stepIndex,
    distanceToManeuverMeters: hasArrived ? 0 : distanceToManeuver,
    remainingDistanceMeters: hasArrived ? 0 : remainingDistance,
    remainingDurationSeconds: hasArrived ? 0 : remainingDuration,
    etaMs: Date.now() + remainingDuration * 1000,
    isOffRoute,
    hasArrived,
    snappedLocation: snap.point,
    routeVertexIndex: snap.index,
    remainingCoordinates,
  };
}

/** Voice cue thresholds (meters) — announce once per step per threshold. */
export const VOICE_THRESHOLDS = [500, 200, 100, 50] as const;

export function voiceCueKey(
  stepIndex: number,
  threshold: number
): string {
  return `${stepIndex}-${threshold}`;
}

export function formatEtaTime(etaMs: number): string {
  const d = new Date(etaMs);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${m} ${ampm}`;
}

export function navigationHeading(
  userLocation: [number, number],
  remainingCoordinates: [number, number][],
  fallback: number
): number {
  for (let i = 1; i < remainingCoordinates.length; i++) {
    const next = remainingCoordinates[i];
    if (distanceMeters(userLocation, next) > 8) {
      return bearingBetween(userLocation, next);
    }
  }
  return fallback;
}
