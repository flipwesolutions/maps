import type { SearchPlace } from "./place-types";
import { distanceMeters } from "./geo-utils";
import type { SearchRegion } from "./regions";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(query: string, place: SearchPlace): number {
  const q = normalize(query);
  const name = normalize(place.name);
  const sub = normalize(place.subtitle);
  const combined = `${name} ${sub}`;

  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 75;
  if (combined.includes(q)) return 60;
  const words = q.split(" ").filter((w) => w.length >= 2);
  if (words.length > 1 && words.every((w) => combined.includes(w))) return 55;
  if (q.split(" ").every((w) => w.length >= 1 && combined.includes(w))) return 50;
  if (words.some((w) => name.includes(w) || sub.includes(w))) return 40;
  return 0;
}

function bucketKey(name: string, len = 2): string {
  return normalize(name).slice(0, len);
}

function buildBuckets(places: SearchPlace[]): Map<string, SearchPlace[]> {
  const buckets = new Map<string, SearchPlace[]>();
  for (const place of places) {
    const key = bucketKey(place.name);
    const list = buckets.get(key);
    if (list) list.push(place);
    else buckets.set(key, [place]);
  }
  return buckets;
}

function bucketCandidates(
  query: string,
  buckets: Map<string, SearchPlace[]>,
  allPlaces: SearchPlace[]
): SearchPlace[] {
  const q = normalize(query);
  if (q.length < 1) return [];

  const seen = new Set<string>();
  const out: SearchPlace[] = [];

  const add = (list: SearchPlace[]) => {
    for (const place of list) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      out.push(place);
    }
  };

  if (q.length === 1) {
    for (const [key, list] of buckets.entries()) {
      if (key.startsWith(q)) add(list);
    }
    return out;
  }

  add(buckets.get(bucketKey(q)) ?? []);

  for (const word of q.split(" ").filter((w) => w.length >= 2)) {
    add(buckets.get(bucketKey(word)) ?? []);
  }

  if (out.length < 50) {
    const words = q.split(" ").filter(Boolean);
    for (const place of allPlaces) {
      if (seen.has(place.id)) continue;
      const combined = `${normalize(place.name)} ${normalize(place.subtitle)}`;
      const matches =
        combined.includes(q) ||
        words.every((w) => w.length >= 2 && combined.includes(w));
      if (matches) add([place]);
    }
  }

  return out;
}

let indiaIndex: SearchPlace[] | null = null;
let indiaBuckets: Map<string, SearchPlace[]> | null = null;
let indiaLoadPromise: Promise<SearchPlace[]> | null = null;

let worldIndex: SearchPlace[] | null = null;
let worldBuckets: Map<string, SearchPlace[]> | null = null;
let worldLoadPromise: Promise<SearchPlace[]> | null = null;

function loadIndiaIndex(): Promise<SearchPlace[]> {
  if (indiaIndex) return Promise.resolve(indiaIndex);
  if (!indiaLoadPromise) {
    indiaLoadPromise = Promise.resolve().then(() => {
      const places = require("./places/india-places.json") as SearchPlace[];
      indiaIndex = places;
      indiaBuckets = buildBuckets(places);
      return places;
    });
  }
  return indiaLoadPromise;
}

function loadWorldIndex(): Promise<SearchPlace[]> {
  if (worldIndex) return Promise.resolve(worldIndex);
  if (!worldLoadPromise) {
    worldLoadPromise = Promise.resolve().then(() => {
      try {
        const places = require("./places/world-places.json") as SearchPlace[];
        worldIndex = places;
        worldBuckets = buildBuckets(places);
        return places;
      } catch {
        worldIndex = [];
        worldBuckets = buildBuckets([]);
        return [];
      }
    });
  }
  return worldLoadPromise;
}

function searchIndex(
  query: string,
  places: SearchPlace[],
  proximity?: [number, number],
  limit = 8
): SearchPlace[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const scored = places
    .map((place) => ({
      place,
      score: scoreMatch(trimmed, place),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (proximity) {
        return (
          distanceMeters(proximity, a.place.coordinates) -
          distanceMeters(proximity, b.place.coordinates)
        );
      }
      return a.place.name.localeCompare(b.place.name);
    });

  return scored.slice(0, limit).map((x) => x.place);
}

/** Rank any search results by text match + optional proximity. */
export function rankSearchResults(
  query: string,
  places: SearchPlace[],
  proximity?: [number, number],
  limit = 25
): SearchPlace[] {
  const trimmed = query.trim();
  if (trimmed.length < 1) return places.slice(0, limit);

  return places
    .map((place) => ({
      place,
      score: scoreMatch(trimmed, place),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (proximity) {
        return (
          distanceMeters(proximity, a.place.coordinates) -
          distanceMeters(proximity, b.place.coordinates)
        );
      }
      return a.place.name.localeCompare(b.place.name);
    })
    .slice(0, limit)
    .map((x) => x.place);
}

/** Preload bundled place indexes (call on app start). */
export async function ensureIndiaIndex(): Promise<void> {
  await loadIndiaIndex();
}

/** Loads world city index on first use. */
export async function ensureWorldIndex(): Promise<void> {
  await loadWorldIndex();
}

/** Fast offline search over bundled place data. */
export function searchLocalPlaces(
  query: string,
  proximity?: [number, number],
  limit = 8,
  region: SearchRegion = "india"
): SearchPlace[] {
  if (region === "india" && indiaIndex && indiaBuckets) {
    const candidates = bucketCandidates(query, indiaBuckets, indiaIndex);
    return searchIndex(query, candidates, proximity, limit);
  }
  if (region === "world" && worldIndex && worldBuckets) {
    const candidates = bucketCandidates(query, worldBuckets, worldIndex);
    return searchIndex(query, candidates, proximity, limit);
  }
  return [];
}

/** Async local search — loads JSON index on first use. */
export async function searchLocalPlacesAsync(
  query: string,
  proximity?: [number, number],
  limit = 12,
  region: SearchRegion = "india"
): Promise<SearchPlace[]> {
  if (region === "world") {
    await loadWorldIndex();
    const candidates = bucketCandidates(query, worldBuckets!, worldIndex!);
    return searchIndex(query, candidates, proximity, limit);
  }

  await loadIndiaIndex();
  const candidates = bucketCandidates(query, indiaBuckets!, indiaIndex!);
  return searchIndex(query, candidates, proximity, limit);
}

export function getLocalPlaceCount(region: SearchRegion = "india"): number {
  if (region === "world") return worldIndex?.length ?? 170_000;
  return indiaIndex?.length ?? 9_000;
}

export function getIndiaPlaceCount(): number {
  return indiaIndex?.length ?? 9_000;
}

/** Nearest bundled places to a coordinate (for offline reverse geocoding). */
export async function findNearestPlaces(
  coordinates: [number, number],
  limit = 3,
  maxRadiusM = 20_000
): Promise<SearchPlace[]> {
  await loadIndiaIndex();
  if (!indiaIndex?.length) return [];

  return indiaIndex
    .map((place) => ({
      place,
      dist: distanceMeters(coordinates, place.coordinates),
    }))
    .filter((x) => x.dist <= maxRadiusM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((x) => x.place);
}

/** Offline reverse geocode — nearest known place, never raw coordinates. */
export async function reverseGeocodeOffline(
  coordinates: [number, number]
): Promise<string> {
  const nearest = await findNearestPlaces(coordinates, 1, 25_000);
  if (nearest.length === 0) return "Current location";

  const place = nearest[0];
  const subtitle = place.subtitle?.trim();
  if (subtitle && subtitle !== "India") {
    return `${place.name},\n${subtitle}`;
  }
  return place.name;
}
