# Flipwi Maps — Enterprise Mapping Platform

**Production-grade mapping infrastructure** for logistics, delivery, fleet, and navigation — built to replace Google Maps API dependence.

| Layer | Location |
|-------|----------|
| **Platform architecture** | [PLATFORM.md](./PLATFORM.md) |
| **Full technical docs** | [platform/docs/](./platform/docs/) |
| **Mobile client (Expo)** | This directory (`App.tsx`, `components/`, `lib/`) |
| **API gateway (dev)** | [server/](./server/) |

## Vision

Microservices-based platform with **complete India coverage** (every searchable OSM feature) and **world expansion** without architectural changes. OpenStreetMap imported into our infrastructure — **no public OSM APIs in production**.

## Quick links

- [Architecture](./platform/docs/ARCHITECTURE.md)
- [API Reference](./platform/docs/API.md)
- [Deployment](./platform/docs/DEPLOYMENT.md)
- [Database Schema](./platform/docs/DATABASE.md)
- [Data Pipeline](./platform/docs/DATA-PIPELINE.md)

## Mobile client (POC)

```bash
npm install
npx expo start --go --host lan
```

Configure production APIs in `.env` — see [.env.example](./.env.example).

---

*See [PLATFORM.md](./PLATFORM.md) for the complete enterprise roadmap.*

---

## Features

- **Self-hosted search** — Pelias on our infrastructure (every OSM place in India)
- **Self-hosted tiles** — Martin vector tiles from our Planetiler pipeline
- **Self-hosted routing** — Valhalla (driving, walking, cycling, truck, motorcycle)
- **Turn-by-turn navigation** — mobile client with MapLibre GL
- **API keys** — B2B clients authenticate to **our** API gateway only

## Our infrastructure stack

| Component | Technology | Host |
|-----------|------------|------|
| Tiles | Martin + Planetiler | `tiles.maps.flipwi.local` |
| Search | Pelias + OpenSearch | `search.maps.flipwi.local` |
| Routing | Valhalla | `routing.maps.flipwi.local` |
| Database | PostgreSQL + PostGIS | internal |
| Cache | Redis | internal |
| API | Node gateway + NGINX | `api.maps.flipwi.local` |

**No Mapbox. No Google. No MapTiler. No CARTO. No external APIs.**

---

## Tech stack (mobile client)

| Library | Purpose |
|---|---|
| `expo` ~54 | Expo SDK |
| `react-native-webview` | MapLibre GL |
| `expo-location` | GPS, navigation |
| TypeScript | Type safety |

---

## Setup & run

### Prerequisites

- Node.js 18+
- Docker (for full platform stack)
- Expo Go on phone (same Wi‑Fi) for mobile testing

### Mobile app

```bash
npm install
cp .env.example .env
# Set EXPO_PUBLIC_API_GATEWAY_HOST to your API (LAN IP for dev)
npx expo start --go --host lan
```

### Platform stack

```bash
cd platform/infrastructure
cp .env.example .env
docker compose up -d
```

See [platform/docs/DEPLOYMENT.md](./platform/docs/DEPLOYMENT.md).

---

## Configure mobile client

```env
EXPO_PUBLIC_API_GATEWAY_HOST=http://api.maps.flipwi.local
EXPO_PUBLIC_TILESERVER_HOST=http://tiles.maps.flipwi.local
EXPO_PUBLIC_MAP_STYLE_HOST=http://maps.maps.flipwi.local
EXPO_PUBLIC_MAPS_API_KEY=dev-client-key
```

On a physical device (dev), use your PC LAN IP: `http://192.168.x.x:3001`

---

## Project structure

```
├── platform/           # Infrastructure, docs, pipelines, K8s
├── server/             # API gateway → Pelias + Valhalla
├── App.tsx             # Mobile client
├── components/         # Map UI
└── lib/                # API client (our platform only)
```

---

## License

Private — [Flipwi Solutions](https://github.com/flipwesolutions). All rights reserved.
