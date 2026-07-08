# Performance SLAs

## Target latencies (P95)

| Endpoint | Target | Cache |
|----------|--------|-------|
| Autocomplete | <50 ms | Redis 60s |
| Search / Geocode | <100 ms | Redis 300s |
| Reverse geocode | <100 ms | H3 cell 600s |
| Routing | <300 ms | Redis 120s |
| Distance matrix (10×10) | <500 ms | Redis 120s |
| Tile (CDN hit) | <150 ms | CDN immutable |
| Places detail | <100 ms | Redis 600s |

## Scale targets

| Metric | Phase 1 (India) | Phase 2 (World) |
|--------|-----------------|-----------------|
| Indexed places | 50M+ features | 500M+ |
| Requests/day | 10M | 100M+ |
| Concurrent routing | 1,000 RPS | 10,000 RPS |
| API clients | 100 | 10,000 |

## Optimization checklist

- OpenSearch: 3+ data nodes, replica shards, dedicated master
- Pelias: `focus.scale` + `boundary.rect` for India bbox default
- Valhalla: tile extract on local SSD; `max_locations` tuned
- Redis: cluster mode; separate cache for routing vs search
- API Gateway: connection pooling to backends
- CDN: vector tiles with `Cache-Control: public, max-age=31536000, immutable`

## Load testing

Use `k6` scripts in `platform/tests/load/`:

```bash
k6 run platform/tests/load/autocomplete.js
k6 run platform/tests/load/routing.js
```

Pass criteria: P95 within SLA at 2× expected peak RPS.
