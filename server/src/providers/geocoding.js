/**
 * Self-hosted geocoding — Pelias only (our infrastructure).
 * No LocationIQ, Nominatim.org, or any external geocoding API.
 */

import { cached, cacheKey } from "../cache.js";

/** @typedef {{ id: string; name: string; subtitle: string; coordinates: [number, number]; type?: string }} SearchPlace */

function peliasHost() {
  const host = process.env.PELIAS_HOST ?? process.env.PELIAS_API_URL;
  if (!host) {
    throw new Error("PELIAS_HOST is not configured");
  }
  return host.replace(/\/$/, "");
}

function formatSubtitle(props = {}) {
  const parts = [
    props.street,
    props.locality || props.localadmin,
    props.region,
    props.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function peliasToPlace(feature) {
  const p = feature.properties ?? {};
  const coords = feature.geometry?.coordinates ?? [0, 0];
  return {
    id: `pelias-${p.gid ?? p.id ?? Math.random()}`,
    name: p.name ?? p.label?.split(",")[0] ?? "Unknown",
    subtitle: p.label ?? formatSubtitle(p),
    coordinates: [coords[0], coords[1]],
    type: p.layer ?? p.type,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.query
 * @param {'india'|'world'} opts.region
 * @param {[number, number]|undefined} opts.proximity
 * @param {number} opts.limit
 */
export async function searchPlaces({ query, region, proximity, limit }) {
  const key = cacheKey("search", [
    query,
    region,
    proximity?.map((n) => n.toFixed(4)).join(","),
    limit,
  ]);
  return cached(key, () => searchPlacesUncached({ query, region, proximity, limit }), 300);
}

async function searchPlacesUncached({ query, region, proximity, limit }) {
  const base = peliasHost();
  const params = new URLSearchParams({
    text: query,
    size: String(Math.min(limit, 40)),
  });

  if (region === "india") {
    params.set("boundary.country", "IND");
  }

  if (proximity) {
    const [lng, lat] = proximity;
    params.set("focus.point.lat", String(lat));
    params.set("focus.point.lon", String(lng));
  }

  const response = await fetch(`${base}/v1/search?${params}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pelias search failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return (data.features ?? []).map(peliasToPlace);
}

/**
 * @param {object} opts
 * @param {[number, number]} opts.coordinates
 */
export async function reverseGeocode({ coordinates }) {
  const [lng, lat] = coordinates;
  const key = cacheKey("reverse", [lat.toFixed(5), lng.toFixed(5)]);
  return cached(
    key,
    () => reverseGeocodeUncached({ coordinates }),
    600
  );
}

async function reverseGeocodeUncached({ coordinates }) {
  const base = peliasHost();
  const [lng, lat] = coordinates;
  const params = new URLSearchParams({
    "point.lat": String(lat),
    "point.lon": String(lng),
    size: "1",
  });

  const response = await fetch(`${base}/v1/reverse?${params}`);
  if (!response.ok) {
    throw new Error(`Pelias reverse failed: ${response.status}`);
  }

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error("No reverse geocode result");

  const p = feature.properties ?? {};
  const label = p.label ?? p.name;
  if (!label) throw new Error("Empty reverse geocode label");
  return label;
}

/** Pelias autocomplete — target <50ms with Redis cache at gateway */
export async function autocomplete({ query, region, proximity, limit = 10 }) {
  const key = cacheKey("autocomplete", [
    query,
    region,
    proximity?.map((n) => n.toFixed(4)).join(","),
    limit,
  ]);
  return cached(
    key,
    () => autocompleteUncached({ query, region, proximity, limit }),
    120
  );
}

async function autocompleteUncached({ query, region, proximity, limit = 10 }) {
  const base = peliasHost();
  const params = new URLSearchParams({
    text: query,
    size: String(limit),
  });

  if (region === "india") params.set("boundary.country", "IND");
  if (proximity) {
    params.set("focus.point.lat", String(proximity[1]));
    params.set("focus.point.lon", String(proximity[0]));
  }

  const response = await fetch(`${base}/v1/autocomplete?${params}`);
  if (!response.ok) return [];

  const data = await response.json();
  return (data.features ?? []).map(peliasToPlace);
}
