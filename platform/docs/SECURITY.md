# Security

## Authentication

| Method | Use case |
|--------|----------|
| **API Key** (`X-API-Key`) | B2B mobile apps, logistics SDKs |
| **JWT** (`Authorization: Bearer`) | Fleet dashboard, admin GIS |
| **mTLS** | Service-to-service (Kubernetes) |

API keys stored as **bcrypt hashes** in `api_clients`. Never log raw keys.

## Rate limiting

Redis token bucket per `api_key`:

| Tier | RPM |
|------|-----|
| Free | 60 |
| Standard | 600 |
| Enterprise | 6000 |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.

## Audit logging

All requests log: `request_id`, `client_id`, `endpoint`, `ip`, `timestamp`.  
Write operations (admin GIS) log `user_id`, `before`, `after`.

## Network

- TLS 1.3 everywhere (Let's Encrypt / cert-manager)
- Private subnets for PostGIS, OpenSearch, Valhalla
- API Gateway only public entry point

## Secrets

- Kubernetes Sealed Secrets / AWS Secrets Manager
- `LOCATIONIQ_*` not used in production (self-hosted only)
- Rotate API keys quarterly

## Monitoring & alerts

- Failed auth spike → alert
- 502 from Valhalla/OpenSearch → PagerDuty
- Disk >85% on tile volumes → alert

## Compliance

- OSM ODbL attribution on map + in API responses (`attribution` field)
- GDPR: audit log retention policy; no PII in search logs (hash queries optional)
