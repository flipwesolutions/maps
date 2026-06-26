/** Detailed street map with roads, labels, and POIs (OpenStreetMap data). */
export const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 18;

/** Zoom when flying to a searched place. */
export function zoomForPlace(type?: string): number {
  if (!type) return 14;
  if (type === "country" || type === "state") return 6;
  if (type === "city" || type === "town" || type === "administrative") return 11;
  if (type === "suburb" || type === "neighbourhood" || type === "village") return 13;
  return 15;
}
