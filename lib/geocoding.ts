export interface SearchPlace {
  id: string;
  name: string;
  subtitle: string;
  coordinates: [number, number]; // [lng, lat]
  type?: string;
}

export interface SearchOptions {
  proximity?: [number, number];
}

const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io/api/";

const INDIA_BOUNDS = { minLng: 68, maxLng: 97.5, minLat: 6.5, maxLat: 37.5 };

function isInIndia([lng, lat]: [number, number]): boolean {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lng >= INDIA_BOUNDS.minLng &&
    lng <= INDIA_BOUNDS.maxLng
  );
}

async function nominatimFetch(path: string): Promise<Response> {
  return fetch(`${NOMINATIM}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "IndiaExplore/1.0 (expo-mobile)",
    },
  });
}

function formatAddress(address?: Record<string, string>): string {
  if (!address) return "";
  const parts = [
    address.road,
    address.suburb || address.neighbourhood,
    address.city || address.town || address.village,
    address.state,
  ].filter(Boolean);
  return parts.join(", ");
}

function placeNameFromNominatim(item: {
  display_name: string;
  address?: Record<string, string>;
  name?: string;
}): string {
  return (
    item.name ||
    item.address?.name ||
    item.address?.road ||
    item.address?.city ||
    item.address?.town ||
    item.address?.village ||
    item.display_name.split(",")[0]
  );
}

async function searchNominatim(
  query: string,
  proximity?: [number, number]
): Promise<SearchPlace[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "10",
    addressdetails: "1",
    countrycodes: "in",
    dedupe: "1",
  });

  if (proximity) {
    const [lng, lat] = proximity;
    const delta = 2;
    params.set(
      "viewbox",
      `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`
    );
    params.set("bounded", "0");
  }

  const response = await nominatimFetch(`/search?${params}`);
  if (!response.ok) return [];

  const results = (await response.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
    class?: string;
    name?: string;
    address?: Record<string, string>;
  }>;

  return results.map((item) => ({
    id: `n-${item.place_id}`,
    name: placeNameFromNominatim(item),
    subtitle: formatAddress(item.address) || item.display_name,
    coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
    type: item.type ?? item.class,
  }));
}

async function searchPhoton(
  query: string,
  proximity?: [number, number]
): Promise<SearchPlace[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "8",
    lang: "en",
  });

  if (proximity) {
    params.set("lat", String(proximity[1]));
    params.set("lon", String(proximity[0]));
  }

  const response = await fetch(`${PHOTON}?${params}`);
  if (!response.ok) return [];

  const data = (await response.json()) as {
    features?: Array<{
      properties: {
        osm_id: number;
        name?: string;
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        type?: string;
      };
      geometry: { coordinates: [number, number] };
    }>;
  };

  return (data.features ?? [])
    .filter((f) => {
      const coords = f.geometry.coordinates;
      const country = f.properties.country?.toLowerCase();
      return isInIndia(coords) && (!country || country === "india");
    })
    .map((f) => {
      const p = f.properties;
      const name =
        p.name ||
        [p.street, p.city].filter(Boolean).join(", ") ||
        "Unknown place";
      const subtitle = [p.street, p.city, p.state, "India"]
        .filter(Boolean)
        .join(", ");

      return {
        id: `p-${p.osm_id}`,
        name,
        subtitle,
        coordinates: f.geometry.coordinates,
        type: p.type,
      };
    });
}

function dedupePlaces(places: SearchPlace[]): SearchPlace[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.coordinates[0].toFixed(4)},${place.coordinates[1].toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Search cities, towns, roads, and landmarks anywhere in India. */
export async function searchPlaces(
  query: string,
  options: SearchOptions = {}
): Promise<SearchPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [nominatim, photon] = await Promise.all([
    searchNominatim(trimmed, options.proximity),
    searchPhoton(trimmed, options.proximity),
  ]);

  return dedupePlaces([...nominatim, ...photon]).slice(0, 12);
}

export async function reverseGeocode(
  coordinates: [number, number]
): Promise<string> {
  const [lng, lat] = coordinates;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    zoom: "18",
    addressdetails: "1",
  });

  const response = await nominatimFetch(`/reverse?${params}`);
  if (!response.ok) return "Current location";

  const data = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };

  return formatAddress(data.address) || data.display_name?.split(",")[0] || "Current location";
}
