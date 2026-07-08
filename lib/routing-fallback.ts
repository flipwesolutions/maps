import { distanceMeters, bearingBetween } from "./geo-utils";
import type { RouteResult, RouteStep } from "./routing";

const AVG_SPEED_MPS = 11.1; // ~40 km/h urban driving

/** Straight-line route when Valhalla is unavailable — keeps UI functional. */
export function createDirectRoute(
  from: [number, number],
  to: [number, number],
  label = "Direct route"
): RouteResult {
  const dist = distanceMeters(from, to);
  const durationSeconds = Math.max(60, dist / AVG_SPEED_MPS);
  const bearing = bearingBetween(from, to);

  const segments = Math.max(8, Math.min(40, Math.round(dist / 500)));
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    coordinates.push([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
    ]);
  }

  const steps: RouteStep[] = [
    {
      instruction: `Head ${bearingLabel(bearing)} toward destination`,
      distanceMeters: dist * 0.95,
      durationSeconds: durationSeconds * 0.95,
      location: from,
      type: "depart",
    },
    {
      instruction: "You have arrived at your destination",
      distanceMeters: dist * 0.05,
      durationSeconds: durationSeconds * 0.05,
      location: to,
      type: "arrive",
    },
  ];

  return {
    coordinates,
    distanceMeters: dist,
    durationSeconds,
    steps,
    label,
  };
}

function bearingLabel(deg: number): string {
  const dirs = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx] ?? "toward";
}
