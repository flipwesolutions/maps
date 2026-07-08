import { getMapStyleUrl } from "./api-config";
import { OSM_RASTER_STYLE, type MapStyleSpec } from "./osm-raster-style";

/**
 * Map style for MapLibre.
 * Default: OSM raster (always renders).
 * Set EXPO_PUBLIC_USE_VECTOR_TILES=true when Martin tiles are deployed.
 */
export function getMapStyle(): MapStyleSpec {
  const useVector = process.env.EXPO_PUBLIC_USE_VECTOR_TILES === "true";
  const vectorUrl = getMapStyleUrl();
  if (useVector && vectorUrl) return vectorUrl;
  return OSM_RASTER_STYLE;
}

export const MAP_STYLE = getMapStyle();
export const MAP_STYLE_FALLBACK = OSM_RASTER_STYLE;

export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 19;

export function isMapStyleConfigured(): boolean {
  return true;
}

/** Zoom when flying to a searched place. */
export function zoomForPlace(type?: string): number {
  if (!type) return 14;
  if (type === "country" || type === "state") return 6;
  if (type === "city" || type === "town" || type === "administrative") return 11;
  if (type === "suburb" || type === "neighbourhood" || type === "village") return 13;
  return 15;
}
