# IndiaExplore — Maps for India (Expo + MapLibre)

A mobile map app for searching places across India, comparing routes, and navigating with live GPS — built with **React Native**, **Expo**, and **MapLibre GL** (via WebView).

Inspired by [mapcn](https://mapcn.dev), adapted for React Native.

**Repository:** [github.com/flipwesolutions/maps](https://github.com/flipwesolutions/maps)

---

## Features

- **India-wide search** — cities, areas, roads, and landmarks via OpenStreetMap (Nominatim + Photon)
- **Street map tiles** — CARTO Voyager basemap with roads, labels, and POIs
- **Current location + destination** — stacked search fields (pickup / drop)
- **Multiple routes** — at least 2 route options with time and distance; tap to compare
- **Turn-by-turn navigation** — step list with live GPS tracking
- **Navigation arrow** — green dot becomes a direction arrow while driving; map follows your heading
- **Saved places** — star destinations and reopen them from quick chips
- **Route summary** — distance and duration on the search panel

---

## Tech stack

| Library | Purpose |
|---|---|
| `expo` ~54 | Expo SDK |
| `react-native-webview` | MapLibre GL map in WebView |
| `expo-location` | GPS, heading, turn-by-turn tracking |
| `@react-native-async-storage/async-storage` | Saved places |
| `react-native` 0.81 | Core framework |
| TypeScript | Type safety |

### External APIs (no API keys required for POC)

| Service | Used for |
|---|---|
| [CARTO Voyager](https://basemaps.cartocdn.com) | Map tiles / style |
| [Nominatim](https://nominatim.openstreetmap.org) | Geocoding & reverse geocoding |
| [Photon](https://photon.komoot.io) | Place search (India-filtered) |
| [OSRM demo](https://router.project-osrm.org) | Driving routes & alternatives |

---

## Setup & run

### Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) on your phone (same Wi‑Fi as your PC), or Android Studio / Xcode for emulators

### Install

```bash
git clone https://github.com/flipwesolutions/maps.git
cd maps
npm install
```

### Start dev server

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

### Android (device or emulator)

```bash
npx expo start --android
```

Requires a connected device with USB debugging, or a running Android emulator.

---

## How to use

1. Allow **location** when prompted — map centers on you with a green dot.
2. Type a destination under **Destination** (e.g. `Connaught Place Delhi`, `Pune`, `MG Road Bangalore`).
3. Tap a search result — map flies to that place.
4. Tap **Get directions here** — multiple routes appear on the map; pick one from the chips at the top.
5. Tap **Start navigation** — green dot becomes an arrow; map follows you as you move.
6. Tap **Stop** to end navigation.

**Saved places:** tap ☆ on the destination card to save; long-press a saved chip to remove.

---

## Project structure

```
maps/
├── App.tsx                      # Main screen & app state
├── components/
│   ├── MapWebView.tsx           # MapLibre map (WebView)
│   ├── LocationSearchPanel.tsx  # Pickup / destination search
│   ├── RouteOptionsPanel.tsx    # Multi-route picker
│   ├── TurnByTurnPanel.tsx      # Navigation steps
│   └── SavedPlacesBar.tsx       # Saved place chips
├── lib/
│   ├── geocoding.ts             # India place search
│   ├── routing.ts               # OSRM routes + alternatives
│   ├── geo-utils.ts             # Distance, bearing, heading
│   ├── map-config.ts            # Basemap style & zoom
│   ├── saved-places.ts          # AsyncStorage helpers
│   └── india-places.ts          # Default map center (India)
├── app.json                     # Expo config & permissions
└── assets/                      # App icon & splash
```

---

## Reuse in another project

This app calls public map APIs directly from the client. To reuse in another app:

- **Mobile (Expo/RN):** copy `lib/` and `components/` into your project.
- **Web (Next.js):** use [mapcn](https://mapcn.dev) — `npx shadcn@latest add @mapcn/map`.
- **Production:** put geocoding and routing behind your own backend; self-host or pay for OSRM, geocoding, and map tiles at scale.

---

## Production notes

The free OSRM demo server and public Nominatim instance are **for development only**. For a production app in India, plan for:

- Self-hosted or paid **routing** (OSRM, GraphHopper, Mapbox Directions)
- Licensed **geocoding** (LocationIQ, MapTiler, Geoapify, or self-hosted Nominatim)
- Licensed **map tiles** per [CARTO terms](https://carto.com/legal/bmap) or alternatives (MapTiler, Stadia, Mapbox)

---

## License

Private — [FlipWe Solutions](https://github.com/flipwesolutions). All rights reserved unless otherwise specified.
