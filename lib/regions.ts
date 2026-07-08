export type SearchRegion = "india" | "world";

export interface RegionConfig {
  id: SearchRegion;
  label: string;
  center: [number, number];
  zoom: number;
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  nominatimCountryCode?: string;
}

export const INDIA_REGION: RegionConfig = {
  id: "india",
  label: "India",
  center: [78.9629, 20.5937],
  zoom: 4.8,
  bounds: { minLng: 68, maxLng: 97.5, minLat: 6.5, maxLat: 37.5 },
  nominatimCountryCode: "in",
};

export const WORLD_REGION: RegionConfig = {
  id: "world",
  label: "World",
  center: [0, 20],
  zoom: 2,
  bounds: { minLng: -180, maxLng: 180, minLat: -85, maxLat: 85 },
};

export const DEFAULT_REGION: SearchRegion = "india";

export function getRegion(region: SearchRegion = DEFAULT_REGION): RegionConfig {
  return region === "world" ? WORLD_REGION : INDIA_REGION;
}

export function isInBounds(
  [lng, lat]: [number, number],
  region: RegionConfig
): boolean {
  const b = region.bounds;
  return (
    lat >= b.minLat &&
    lat <= b.maxLat &&
    lng >= b.minLng &&
    lng <= b.maxLng
  );
}
