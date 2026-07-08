/**
 * Live OpenStreetMap geocoding (Nominatim + Photon).
 * Uses OSM community services — not commercial map providers.
 * Fallback until self-hosted Pelias is deployed.
 */
import type { SearchPlace, SearchOptions } from "./place-types";
import { formatLocationLabel } from "./location-label";
import { getRegion, isInBounds } from "./regions";

const USER_AGENT = "FlipwiMaps/1.0 (contact@flipwisolutions.com)";

/** Nominatim viewbox: minLon,maxLat,maxLon,minLat */
function viewboxAround([lng, lat]: [number, number], delta = 0.45): string {
  return `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
}

/** Photon bbox: minLon,minLat,maxLon,maxLat */
function bboxAround([lng, lat]: [number, number], delta = 0.45): string {
  return `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
}

function nominatimPlace(
  item: Record<string, unknown>,
  index: number
): SearchPlace | null {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const address = (item.address ?? {}) as Record<string, string>;
  const name =
    String(item.name ?? item.display_name ?? "").split(",")[0]?.trim() ||
    address.road ||
    address.suburb ||
    "Unknown";

  const subtitle =
    formatLocationLabel(address, String(item.display_name ?? "")) ||
    String(item.display_name ?? "").split(",").slice(1, 4).join(", ").trim();

  return {
    id: `nominatim-${item.osm_id ?? item.place_id ?? index}`,
    name,
    subtitle: subtitle || "OpenStreetMap",
    coordinates: [lon, lat],
    type: String(item.type ?? item.class ?? "place"),
  };
}

function photonPlace(
  feature: {
    geometry?: { coordinates?: number[] };
    properties?: Record<string, unknown>;
  },
  index: number
): SearchPlace | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;
  const p = feature.properties ?? {};
  const name = String(p.name ?? p.street ?? "Unknown");
  const parts = [p.street, p.city, p.state, p.country].filter(Boolean);
  return {
    id: `photon-${p.osm_id ?? index}`,
    name,
    subtitle: parts.join(", ") || "OpenStreetMap",
    coordinates: [lon, lat],
    type: String(p.osm_value ?? p.type ?? "place"),
  };
}

function mergePlaces(lists: SearchPlace[][]): SearchPlace[] {
  const seen = new Set<string>();
  const out: SearchPlace[] = [];
  for (const list of lists) {
    for (const place of list) {
      const key = `${place.name.toLowerCase()}@${place.coordinates.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(place);
    }
  }
  return out;
}

/** Search via Nominatim + Photon (full OSM coverage). */
export async function searchOsmLive(
  query: string,
  options: SearchOptions = {}
): Promise<SearchPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const region = options.region ?? "india";
  const cfg = getRegion(region);
  const limit = options.limit ?? 25;
  const proximity = options.proximity;
  const focus = proximity ?? cfg.center;
  const [focusLng, focusLat] = focus;
  const fetchLimit = Math.min(limit, 20);

  const nominatimParams = new URLSearchParams({
    q: trimmed,
    format: "json",
    addressdetails: "1",
    limit: String(fetchLimit),
    dedupe: "0",
  });
  if (cfg.nominatimCountryCode) {
    nominatimParams.set("countrycodes", cfg.nominatimCountryCode);
  }
  if (proximity) {
    nominatimParams.set("viewbox", viewboxAround(proximity));
    nominatimParams.set("bounded", "0");
  }

  const photonParams = new URLSearchParams({
    q: trimmed,
    limit: String(fetchLimit),
    lat: String(focusLat),
    lon: String(focusLng),
  });
  if (proximity) {
    photonParams.set("bbox", bboxAround(proximity));
  } else if (region === "india") {
    const b = cfg.bounds;
    photonParams.set("bbox", `${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`);
  }

  const headers = { Accept: "application/json", "User-Agent": USER_AGENT };

  const [nominatimRes, photonRes] = await Promise.allSettled([
    fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams}`, {
      headers,
    }),
    fetch(`https://photon.komoot.io/api/?${photonParams}`, { headers }),
  ]);

  const nominatim: SearchPlace[] = [];
  if (nominatimRes.status === "fulfilled" && nominatimRes.value.ok) {
    const data = (await nominatimRes.value.json()) as Record<string, unknown>[];
    for (let i = 0; i < data.length; i++) {
      const p = nominatimPlace(data[i], i);
      if (p) nominatim.push(p);
    }
  }

  const photon: SearchPlace[] = [];
  if (photonRes.status === "fulfilled" && photonRes.value.ok) {
    const data = (await photonRes.value.json()) as {
      features?: Array<{
        geometry?: { coordinates?: number[] };
        properties?: Record<string, unknown>;
      }>;
    };
    for (let i = 0; i < (data.features ?? []).length; i++) {
      const p = photonPlace(data.features![i], i);
      if (p) photon.push(p);
    }
  }

  const merged = mergePlaces([nominatim, photon]);

  if (region === "india") {
    return merged
      .filter((p) => isInBounds(p.coordinates, cfg))
      .slice(0, limit);
  }

  return merged.slice(0, limit);
}

/** Reverse geocode via Nominatim — street / suburb / city level. */
export async function reverseOsmLive(
  coordinates: [number, number]
): Promise<string> {
  const [lng, lat] = coordinates;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
    zoom: "18",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    }
  );

  if (!response.ok) throw new Error(`Nominatim reverse failed (${response.status})`);

  const data = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };

  const address = data.address ?? {};
  const formatted = formatLocationLabel(address, data.display_name);
  if (formatted) return formatted;

  if (data.display_name) {
    const parts = data.display_name
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      return `${parts[0]},\n${parts[1]},\n${parts[2]}`;
    }
    if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
    if (parts.length === 1) return parts[0];
  }

  throw new Error("No reverse geocode result");
}
