/**
 * Merged search — Layer 8: OSM (Pelias) + proprietary PostGIS.
 */
import { searchPlaces as searchOsm } from "../providers/geocoding.js";
import { searchProprietaryPlaces } from "./proprietary-search.js";
import { mergeSearchResults } from "./search-merge.js";
import { cached, cacheKey } from "../cache.js";

function tagOsmResults(results) {
  return results.map((p) => ({
    ...p,
    source: "osm",
    layer: "osm",
    id: p.id?.startsWith("pelias-") ? p.id : `osm-${p.id ?? Math.random()}`,
  }));
}

export async function mergedSearch({
  query,
  region = "india",
  proximity,
  limit = 25,
}) {
  const key = cacheKey("merged-search", [
    query,
    region,
    proximity?.map((n) => n.toFixed(4)).join(","),
    limit,
  ]);

  return cached(
    key,
    async () => {
      const [osmSettled, propSettled] = await Promise.allSettled([
        searchOsm({ query, region, proximity, limit }),
        searchProprietaryPlaces({ query, limit, proximity }),
      ]);

      const osm =
        osmSettled.status === "fulfilled" ? tagOsmResults(osmSettled.value) : [];
      const proprietary =
        propSettled.status === "fulfilled" ? propSettled.value : [];

      return mergeSearchResults([proprietary, osm], { proximity, limit });
    },
    120
  );
}

export async function mergedAutocomplete({
  query,
  region = "india",
  proximity,
  limit = 10,
}) {
  return mergedSearch({ query, region, proximity, limit });
}
