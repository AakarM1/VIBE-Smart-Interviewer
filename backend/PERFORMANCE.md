# Performance & Scalability Guide

This document summarizes current optimizations and recommendations to support up to ~1000 concurrent users.

## Backend Runtime
- FastAPI async-friendly endpoints (IO-bound DB + network) – ensure running under Uvicorn with multiple workers in production.
- Recommended production command:
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 --loop uvloop --http httptools
  (Tune workers = CPU cores * 2 for primarily IO-bound workload.)

## Database Layer
- Added indexes:
  - ix_test_assignments_user_test(user_id, test_type)
  - ix_test_attempts_user_test_status(user_id, test_type, status)
  - ix_test_attempts_user_test_number(user_id, test_type, attempt_number)
- Assignment and attempt retrieval now O(log n) with proper coverage.
- Connection pooling (PostgreSQL): pool_size=20, max_overflow=0. Adjust upward if sustained concurrent request volume > ~50 RPS.
- Schema auto-verification: init_database() re-checks table presence for resilience.

## Caching
- In-memory configuration cache (TTL=30s) reduces repeated config queries for availability/start endpoints.
- Future: Introduce Redis for shared cache across instances if horizontally scaled.

## Concurrency Considerations
- Start attempt endpoint blocks if an in-progress attempt exists (prevents double-start race). For stricter race safety:
  - Add a unique partial index for (user_id, test_type, status='in_progress') OR use SELECT ... FOR UPDATE when promoting attempt state.
- For 1000 concurrent users on a single node:
  - Ensure PostgreSQL with adequate shared_buffers and connection limit; avoid SQLite in production.
  - Consider pgbouncer if many short-lived connections beyond pool_size.

## Suggested Next Wave (Not Yet Implemented)
1. Redis / Memcached tier for:
   - Rate limiting centralization
   - Cross-instance config & attempt session caching
2. Background task queue (RQ/Celery) for heavy AI processing / report generation.
3. Streaming responses (Server-Sent Events / WebSocket) for real-time attempt status.
4. Write-behind analytics table(s) (event log) instead of inline heavy aggregation.

## Frontend
- Availability fetched once on load; consider SWR/react-query for revalidation with focus events.
- Potential code-splitting for admin dashboards to reduce candidate bundle weight.

## Observability
- Add request timing middleware (e.g., logging X-Process-Time header) & OpenTelemetry exporter for traces.
- Add index usage monitoring via pg_stat_statements (PostgreSQL).

## Hardening & Future Efficiency
- Replace create_all based pseudo-migrations with Alembic for safer iterative schema changes.
- Add optimistic concurrency version field to mutable tables if concurrent admin edits become common.
- Use JSONB (PostgreSQL) with GIN indexes for querying inside config_data / attempt_metadata if analytic queries needed.

## Quick Checklist Before Load Test
- [ ] Deploy on PostgreSQL
- [ ] Set appropriate worker count
- [ ] Confirm pool_size * workers <= DB max connections
- [ ] Enable gunzip / brotli at reverse proxy (NGINX) for frontend assets
- [ ] Turn off SQL echo
- [ ] Baseline k6 or Locust scenario: login -> availability -> start attempt -> complete attempt

## Sample k6 Sketch
```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 200, duration: '2m' };

export default function () {
  const login = http.post('https://api.example.com/auth/login', JSON.stringify({ email: 'user@example.com', password: 'pass' }), { headers: { 'Content-Type': 'application/json' }});
  check(login, { 'login ok': r => r.status === 200 });
  const token = login.json('access_token');
  const headers = { Authorization: `Bearer ${token}` };
  const avail = http.get('https://api.example.com/api/v1/tests/availability?test_type=SJT', { headers });
  check(avail, { 'avail ok': r => r.status === 200 });
  if (avail.json('can_start')) {
    const start = http.post('https://api.example.com/api/v1/tests/attempts/start', JSON.stringify({ test_type: 'SJT' }), { headers: { ...headers, 'Content-Type': 'application/json' }});
    check(start, { 'start ok': r => r.status === 200 });
  }
  sleep(1);
}
```

## Conclusion
Current setup is optimized for moderate concurrency. Implement the "Next Wave" for large-scale / multi-node deployment.
