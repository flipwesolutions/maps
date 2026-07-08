# Restoration Fix — Root Cause Analysis (2026-07-07)

## Summary

The refactor to "platform-only" mode broke the app because **Pelias, Valhalla, and Martin are not running** on the dev machine (Docker not installed). The client was configured to depend on services that do not exist yet.

---

## Issue 1: Blank map

| | |
|---|---|
| **Symptom** | Gray/blank map area |
| **Root cause** | `flipwi-streets.json` references vector tiles at `TILESERVER_HOST` (`:3000`). Martin is not running; no MBTiles exist. MapLibre loads style but fetches zero tiles. |
| **Fix** | OSM raster default + WebView `baseUrl` fix for tile loading. Nominatim/Photon for search/reverse. OSRM for routing when Valhalla down. |

---

## Issue 2: Search returns nothing

| | |
|---|---|
| **Symptom** | No search results for cities, landmarks |
| **Root cause** | Platform configured → calls Pelias via gateway → 502/fetch failed. Offline `place-index.ts` existed but was not reliably used; platform calls blocked without timeout. |
| **Fix** | Hybrid search: 4s platform timeout → offline index fallback. Preload India index on app start. 1-char autocomplete bucket fix. |

---

## Issue 3: Reverse geocoding shows coordinates

| | |
|---|---|
| **Symptom** | `12.90510, 77.62873` instead of area name |
| **Root cause** | `reverseViaPlatform` returned raw coords on Pelias failure. `reverseGeocode` had no offline fallback. |
| **Fix** | Throw on platform failure; `reverseGeocodeOffline()` finds nearest bundled place. Never show coords in pickup label. |

---

## Issue 4: Routing broken

| | |
|---|---|
| **Symptom** | No route polyline, no ETA |
| **Root cause** | Valhalla not running; `fetchDrivingRoutes` threw with no fallback |
| **Fix** | `createDirectRoute()` fallback when platform routing fails. Approximate distance/time/polyline until Valhalla tiles built. |

---

## Issue 5: Map tiles not loading

Same as Issue 1 — vector tile server not deployed.

---

## What was NOT changed

- UI components and layout
- Navigation flow
- MapWebView architecture (only style fallback added)
- Self-hosted platform direction (Pelias/Valhalla/Martin for production)

---

## Production path (unchanged)

1. Install Docker → run `platform/infrastructure/docker compose`
2. Run India OSM pipeline
3. Set `EXPO_PUBLIC_USE_VECTOR_TILES=true`
4. Pelias/Valhalla provide full search/routing quality
