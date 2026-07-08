# Flipwi Maps Platform — infrastructure

```bash
cp .env.example .env
docker compose up -d                    # core: postgres, redis, opensearch, api-gateway
docker compose --profile full up -d     # + valhalla, martin, pelias (after data import)
```

See `../docs/DEPLOYMENT.md`.
