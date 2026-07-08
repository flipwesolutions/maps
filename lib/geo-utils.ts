/** Haversine distance in meters between two [lng, lat] points. */
export function distanceMeters(
  a: [number, number],
  b: [number, number]
): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Bearing in degrees (0=north, 90=east) from point a to b. */
export function bearingBetween(
  a: [number, number],
  b: [number, number]
): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Smooth heading changes to reduce GPS jitter. */
export function smoothHeading(
  previous: number,
  next: number,
  factor = 0.35
): number {
  const diff = ((next - previous + 540) % 360) - 180;
  return (previous + diff * factor + 360) % 360;
}

/** Resolve heading from movement, GPS course, or compass while driving. */
export function resolveHeading(
  coords: [number, number],
  gpsHeading: number | null | undefined,
  previousCoords: [number, number] | null,
  previousHeading: number,
  speedMps: number | null | undefined
): number {
  const movementHeading =
    previousCoords && distanceMeters(previousCoords, coords) > 2
      ? bearingBetween(previousCoords, coords)
      : null;

  // When moving, trust direction of travel most (best for driving).
  if (speedMps != null && speedMps > 1.5 && movementHeading != null) {
    return smoothHeading(previousHeading, movementHeading, 0.55);
  }

  if (movementHeading != null && speedMps != null && speedMps > 0.5) {
    return smoothHeading(previousHeading, movementHeading, 0.4);
  }

  if (
    gpsHeading != null &&
    !Number.isNaN(gpsHeading) &&
    gpsHeading >= 0
  ) {
    return smoothHeading(previousHeading, gpsHeading, 0.35);
  }

  if (movementHeading != null) {
    return smoothHeading(previousHeading, movementHeading, 0.35);
  }

  return previousHeading;
}

/** Closest point on segment a→b; t is 0..1 along the segment. */
export function closestPointOnSegment(
  point: [number, number],
  a: [number, number],
  b: [number, number]
): { point: [number, number]; t: number } {
  const [px, py] = point;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { point: a, t: 0 };

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { point: [ax + t * dx, ay + t * dy], t };
}

/** Snap GPS to route polyline and return progress along it. */
export function closestPointOnPolyline(
  point: [number, number],
  polyline: [number, number][]
): {
  index: number;
  point: [number, number];
  distanceMeters: number;
  distanceAlongMeters: number;
} {
  if (polyline.length === 0) {
    return { index: 0, point, distanceMeters: 0, distanceAlongMeters: 0 };
  }
  if (polyline.length === 1) {
    return {
      index: 0,
      point: polyline[0],
      distanceMeters: distanceMeters(point, polyline[0]),
      distanceAlongMeters: 0,
    };
  }

  let bestDist = Infinity;
  let bestPoint: [number, number] = polyline[0];
  let bestIndex = 0;
  let bestAlong = 0;
  let distanceAlong = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const segLen = distanceMeters(a, b);
    const { point: closest, t } = closestPointOnSegment(point, a, b);
    const d = distanceMeters(point, closest);
    const along = distanceAlong + segLen * t;

    if (d < bestDist) {
      bestDist = d;
      bestPoint = closest;
      bestIndex = i;
      bestAlong = along;
    }
    distanceAlong += segLen;
  }

  return {
    index: bestIndex,
    point: bestPoint,
    distanceMeters: bestDist,
    distanceAlongMeters: bestAlong,
  };
}

/** Index of the next step the user should follow (legacy helper). */
export function findCurrentStepIndex(
  userLocation: [number, number],
  steps: { location: [number, number] }[]
): number {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < steps.length; i++) {
    const d = distanceMeters(userLocation, steps[i].location);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }

  if (bestDistance < 40 && bestIndex < steps.length - 1) {
    return bestIndex + 1;
  }

  return bestIndex;
}

/** Point reached from origin along bearing for distanceM meters. */
export function destinationPoint(
  origin: [number, number],
  bearingDeg: number,
  distanceM: number
): [number, number] {
  const [lng, lat] = origin;
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const δ = distanceM / R;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(brng)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
}

/** Waypoint offset sideways from the direct line to force a different route. */
export function viaPointOffset(
  from: [number, number],
  to: [number, number],
  sideSign: 1 | -1,
  offsetKm: number
): [number, number] {
  const mid: [number, number] = [
    from[0] + (to[0] - from[0]) * 0.45,
    from[1] + (to[1] - from[1]) * 0.45,
  ];
  const perp = (bearingBetween(from, to) + 90 * sideSign + 360) % 360;
  return destinationPoint(mid, perp, offsetKm * 1000);
}

/** Total length of a coordinate polyline in meters. */
export function polylineLength(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += distanceMeters(coords[i], coords[i + 1]);
  }
  return total;
}
