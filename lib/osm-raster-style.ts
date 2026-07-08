/**
 * OpenStreetMap raster basemap — works without self-hosted Martin tiles.
 * Used as fallback until vector tiles (Planetiler + Martin) are deployed.
 * Data: © OpenStreetMap contributors (same OSM base data).
 */
export const OSM_RASTER_STYLE = {
  version: 8 as const,
  name: "OpenStreetMap",
  metadata: {
    "flipwi:source": "openstreetmap",
    "flipwi:attribution": "© OpenStreetMap contributors",
  },
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster" as const,
      source: "osm",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export type MapStyleSpec = string | typeof OSM_RASTER_STYLE;

/** True when style is our self-hosted vector tile URL (needs Martin running). */
export function isVectorStyleUrl(style: MapStyleSpec): style is string {
  return typeof style === "string" && style.length > 0;
}
