/**
 * Flipwi Solutions — 100% self-hosted platform configuration.
 * No third-party map, tile, routing, or geocoding providers.
 *
 * Mobile client reads EXPO_PUBLIC_* at build time.
 * All hosts are OUR infrastructure (internal DNS or LAN IP in dev).
 */

function host(name: string, fallback = ""): string {
  const v = process.env[name] ?? "";
  return v.replace(/\/$/, "") || fallback;
}

/** API gateway — search, reverse, route, styles */
export const API_GATEWAY_HOST = host("EXPO_PUBLIC_API_GATEWAY_HOST");

/** Vector tile server (Martin / TileServer GL) */
export const TILESERVER_HOST = host("EXPO_PUBLIC_TILESERVER_HOST");

/** MapLibre style JSON on our map-style service */
export const MAP_STYLE_HOST = host("EXPO_PUBLIC_MAP_STYLE_HOST");

/** Client API key (issued by us, not external providers) */
export const MAPS_API_KEY = (
  process.env.EXPO_PUBLIC_MAPS_API_KEY ?? ""
).trim();

export function isPlatformConfigured(): boolean {
  return API_GATEWAY_HOST.length > 0 && MAPS_API_KEY.length > 0;
}

export function getMapsApiUrl(): string {
  return API_GATEWAY_HOST;
}

export function getMapsApiKey(): string {
  return MAPS_API_KEY;
}

/** Self-hosted MapLibre style — served by our API gateway or map-style service */
export function getMapStyleUrl(): string {
  if (MAP_STYLE_HOST) {
    return `${MAP_STYLE_HOST}/styles/flipwi-streets.json`;
  }
  if (API_GATEWAY_HOST) {
    return `${API_GATEWAY_HOST}/styles/flipwi-streets.json`;
  }
  return "";
}

export function getTileServerUrl(): string {
  return TILESERVER_HOST;
}

export function getRoutingApiBase(): string {
  return API_GATEWAY_HOST ? `${API_GATEWAY_HOST}/api/v1` : "";
}

export function usePlatformRouting(): boolean {
  return Boolean(API_GATEWAY_HOST);
}

/** @deprecated use isPlatformConfigured */
export function isServerGeocodingEnabled(): boolean {
  return isPlatformConfigured();
}

/** @deprecated use isPlatformConfigured */
export function isPlatformMode(): boolean {
  return isPlatformConfigured();
}

export async function mapsApiFetch(
  path: string,
  params: Record<string, string | number | undefined> = {},
  timeoutMs = 8000
): Promise<Response> {
  if (!API_GATEWAY_HOST) {
    throw new Error("EXPO_PUBLIC_API_GATEWAY_HOST is not configured");
  }
  if (!MAPS_API_KEY) {
    throw new Error(
      "EXPO_PUBLIC_MAPS_API_KEY is not set. Add it to .env and restart Expo with: npx expo start --go --host lan -c"
    );
  }

  const url = new URL(`${API_GATEWAY_HOST}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-API-Key": MAPS_API_KEY,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
