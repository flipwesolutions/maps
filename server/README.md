# Flipwi Solutions — API Gateway

Self-hosted maps API. Clients authenticate with **X-API-Key**; the gateway calls **Pelias** (search) and **Valhalla** (routing) on our infrastructure.

## Setup (local, no Docker)

```bash
cd server
npm install
cp .env.example .env
npm start
```

## Setup (Docker Compose)

```bash
cd platform/infrastructure
docker compose up -d postgres redis api-gateway
```

## Environment

| Variable | Description |
|----------|-------------|
| `PELIAS_HOST` | Our Pelias API (e.g. `http://localhost:4000`) |
| `VALHALLA_HOST` | Our Valhalla API (e.g. `http://localhost:8002`) |
| `TILESERVER_HOST` | Our Martin tile server |
| `CLIENT_API_KEYS` | Comma-separated client keys |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Platform health |
| GET | `/api/v1/search` | Place search (Pelias) |
| GET | `/api/v1/autocomplete` | Autocomplete |
| GET | `/api/v1/reverse` | Reverse geocoding |
| GET | `/api/v1/route` | Driving routes (Valhalla) |
| GET | `/styles/flipwi-streets.json` | MapLibre style (self-hosted) |

See [../platform/docs/API.md](../platform/docs/API.md) for full reference.
