import type { SearchPlace, SearchOptions } from "./place-types";
import {
  isPlatformConfigured,
  mapsApiFetch,
} from "./api-config";
import {
  searchLocalPlacesAsync,
  reverseGeocodeOffline,
  rankSearchResults,
} from "./place-index";
import { searchOsmLive, reverseOsmLive } from "./osm-live-geocoding";

export type { SearchPlace, SearchOptions } from "./place-types";

export {
  isPlatformConfigured,
  isServerGeocodingEnabled,
  isPlatformMode,
  getMapsApiUrl,
  getMapStyleUrl,
  getTileServerUrl,
} from "./api-config";

const PLATFORM_TIMEOUT_MS = 5000;

function isRawCoordinateLabel(label: string): boolean {
  return /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(label.trim());
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

async function searchViaPlatform(
  query: string,
  options: SearchOptions = {}
): Promise<SearchPlace[]> {
  const region = options.region ?? "india";
  const proximity = options.proximity;
  const limit = options.limit ?? 25;

  const response = await mapsApiFetch("/api/v1/search", {
    q: query,
    region,
    limit,
    lat: proximity?.[1],
    lng: proximity?.[0],
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ??
        `Platform search failed (${response.status})`
    );
  }

  const data = (await response.json()) as { results?: SearchPlace[] };
  return data.results ?? [];
}

async function reverseViaPlatform(
  coordinates: [number, number]
): Promise<string> {
  const response = await mapsApiFetch("/api/v1/reverse", {
    lat: coordinates[1],
    lng: coordinates[0],
  });

  if (!response.ok) throw new Error(`Reverse geocode failed (${response.status})`);

  const data = (await response.json()) as { label?: string };
  const label = data.label?.trim();
  if (!label || isRawCoordinateLabel(label)) {
    throw new Error("No address from platform");
  }
  return label;
}

async function autocompleteViaPlatform(
  query: string,
  options: SearchOptions = {}
): Promise<SearchPlace[]> {
  const region = options.region ?? "india";
  const proximity = options.proximity;
  const limit = options.limit ?? 10;

  const response = await mapsApiFetch("/api/v1/autocomplete", {
    q: query,
    region,
    limit,
    lat: proximity?.[1],
    lng: proximity?.[0],
  });

  if (!response.ok) throw new Error(`Autocomplete failed (${response.status})`);

  const data = (await response.json()) as { suggestions?: SearchPlace[] };
  return data.suggestions ?? [];
}

async function tryPlatform<T>(fn: () => Promise<T>): Promise<T | null> {
  if (!isPlatformConfigured()) return null;
  try {
    return await withTimeout(fn(), PLATFORM_TIMEOUT_MS);
  } catch {
    return null;
  }
}

function mergeDedupe(lists: SearchPlace[][]): SearchPlace[] {
  const seen = new Set<string>();
  const out: SearchPlace[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = `${p.name.toLowerCase()}@${p.coordinates[0].toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function mergeAndRank(
  query: string,
  lists: SearchPlace[][],
  options: SearchOptions = {}
): SearchPlace[] {
  const limit = options.limit ?? 25;
  const merged = mergeDedupe(lists);
  const ranked = rankSearchResults(
    query,
    merged,
    options.proximity,
    Math.max(limit, merged.length)
  );
  if (ranked.length >= limit) return ranked.slice(0, limit);

  const rankedIds = new Set(ranked.map((p) => p.id));
  const rest = merged.filter((p) => !rankedIds.has(p.id));
  return [...ranked, ...rest].slice(0, limit);
}

/**
 * Search: self-hosted Pelias → OSM live (Nominatim/Photon) → offline index.
 * Runs fallbacks in parallel for speed.
 */
export async function searchPlaces(
  query: string,
  options: SearchOptions = {}
): Promise<SearchPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options.limit ?? 30;

  const [platform, osmLive, offline] = await Promise.all([
    tryPlatform(() => searchViaPlatform(trimmed, { ...options, limit })),
    searchOsmLive(trimmed, { ...options, limit }).catch(() => [] as SearchPlace[]),
    searchLocalPlacesAsync(
      trimmed,
      options.proximity,
      limit,
      options.region ?? "india"
    ),
  ]);

  return mergeAndRank(trimmed, [platform ?? [], osmLive, offline], {
    ...options,
    limit,
  });
}

/** Autocomplete: platform → OSM live → offline (parallel). */
export async function autocompletePlaces(
  query: string,
  options: SearchOptions = {}
): Promise<SearchPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const limit = options.limit ?? 20;

  const [platform, osmLive, offline] = await Promise.all([
    tryPlatform(() => autocompleteViaPlatform(trimmed, { ...options, limit })),
    searchOsmLive(trimmed, { ...options, limit }).catch(
      () => [] as SearchPlace[]
    ),
    searchLocalPlacesAsync(
      trimmed,
      options.proximity,
      limit,
      options.region ?? "india"
    ),
  ]);

  return mergeAndRank(trimmed, [platform ?? [], osmLive, offline], {
    ...options,
    limit,
  });
}

/**
 * Reverse geocode: Pelias → Nominatim → nearest offline place.
 * Never returns raw coordinates.
 */
export async function reverseGeocode(
  coordinates: [number, number]
): Promise<string> {
  const platform = await tryPlatform(() => reverseViaPlatform(coordinates));
  if (platform) return platform;

  try {
    return await reverseOsmLive(coordinates);
  } catch {
    /* offline fallback */
  }

  return reverseGeocodeOffline(coordinates);
}

export { getLocalPlaceCount } from "./place-index";
