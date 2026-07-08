import {
  distanceMeters,
  closestPointOnPolyline,
  bearingBetween,
  polylineLength,
} from "./geo-utils";
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
  if (distanceMeters(last, destination) > 5) {
    return [...coords, destination];
  }
  const next = [...coords];
  next[next.length - 1] = destination;
  return next;
}

/** Remaining drive time from OSRM step durations + distance fallback. */
function remainingDurationSeconds(
  steps: RouteStep[],
  stepIndex: number,
  distanceToManeuverMeters: number,
  remainingDistanceMeters: number,
  route: RouteResult
): number {
  const totalDist = Math.max(route.distanceMeters, 1);
  const byDistance =
    route.durationSeconds * (remainingDistanceMeters / totalDist);

  if (steps.length === 0) {
    return Math.max(30, Math.round(byDistance));
  }

  let fromSteps = 0;
  for (let i = stepIndex; i < steps.length; i++) {
    fromSteps += steps[i].durationSeconds;
  }

  const current = steps[stepIndex];
  if (
    current &&
    current.distanceMeters > 5 &&
    distanceToManeuverMeters < current.distanceMeters
  ) {
    const traveledInStep =
      1 - distanceToManeuverMeters / current.distanceMeters;
    fromSteps -= current.durationSeconds * traveledInStep;
  }

  fromSteps = Math.max(0, fromSteps);
  const blended =
    fromSteps > 0 ? fromSteps * 0.75 + byDistance * 0.25 : byDistance;

  return Math.max(30, Math.round(blended));
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

  const remainingCoordinates = ensureEndsAt(
    [snap.point, ...coordinates.slice(snap.index + 1)],
    destination
  );
  const remainingDistance = polylineLength(remainingCoordinates);

  const distUserToDest = distanceMeters(userLocation, destination);
  const distSnapToDest = distanceMeters(snap.point, destination);
  const hasArrived =
    distUserToDest < ARRIVAL_METERS ||
    distSnapToDest < ARRIVAL_METERS ||
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

  const remainingDuration = hasArrived
    ? 0
    : remainingDurationSeconds(
        steps,
        stepIndex,
        distanceToManeuver,
        remainingDistance,
        route
      );

  return {
    stepIndex,
    distanceToManeuverMeters: hasArrived ? 0 : distanceToManeuver,
    remainingDistanceMeters: hasArrived ? 0 : remainingDistance,
    remainingDurationSeconds: remainingDuration,
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
  const ampm = h < 12 ? "am" : "pm";
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
