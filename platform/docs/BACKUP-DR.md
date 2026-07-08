# Backup & disaster recovery

## Backup scope

| Asset | Method | Frequency | Retention |
|-------|--------|-----------|-----------|
| PostGIS | `pg_dump` + WAL archiving | Daily full, hourly WAL | 30 days |
| OpenSearch | Snapshot to object storage | Daily | 14 days |
| Valhalla tiles | Copy `valhalla_tiles.tar` to `BACKUP_STORAGE` | Weekly | 4 versions |
| MBTiles | Sync to MinIO/S3 `OBJECT_STORAGE_HOST` | After each tile build | 4 versions |
| Pelias config | Git | Every change | indefinite |
| API keys | Sealed Secrets / Vault | On rotation | audit trail |

## Object storage layout

```
s3://flipwi-maps-backups/
  postgis/YYYY-MM-DD/
  opensearch/YYYY-MM-DD/
  valhalla/india-YYYY-MM-DD.tar
  mbtiles/india-YYYY-MM-DD.mbtiles
  offline-packs/IN-KA/
```

## Recovery procedures

### RTO / RPO targets

| Tier | RTO | RPO |
|------|-----|-----|
| API Gateway + Redis | 15 min | 0 |
| PostGIS | 2 hours | 1 hour |
| OpenSearch (Pelias) | 4 hours | 24 hours |
| Valhalla tiles | 6 hours | 7 days |
| Vector tiles | 4 hours | 7 days |

### Failover steps

1. Restore PostGIS from latest `pg_dump`
2. Restore OpenSearch snapshot → re-alias Pelias index
3. Mount Valhalla tile volume from backup
4. Point Martin at restored MBTiles
5. Scale API gateway pods; verify `/health`
6. Run smoke tests: search, reverse, route Mumbai→Pune

## Scaling strategy

- **API Gateway** — HPA on CPU + request rate (3–20 pods)
- **Pelias API** — stateless; scale horizontally behind NGINX
- **OpenSearch** — add data nodes; shard by `region_code`
- **Valhalla** — ReadOnlyMany PVC; one pod per AZ
- **Martin** — CDN in front of `tiles.maps.flipwi.local`

## Monitoring alerts

- Pelias P95 > 100ms
- Valhalla P95 > 300ms
- PostGIS replication lag > 5 min
- Disk usage > 85% on tile volumes
