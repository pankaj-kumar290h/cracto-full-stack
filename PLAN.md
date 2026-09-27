# Release Checklist Tool — Execution Plan

Test window: 9/27/2026, 9:00 AM – 5:00 PM (8 hours)

## 1. Data model

Single `Release` table — no separate steps table needed.

```
Release
  id               uuid/serial, PK
  name             text, not null
  date             timestamptz, not null
  additional_info  text, nullable
  completed_steps  jsonb (array of step keys, e.g. ["design","code_freeze"])
  created_at       timestamptz
```

Steps are a hardcoded constant shared by frontend and backend, e.g.:

```
STEPS = ["design", "code_freeze", "qa", "staging", "docs", "release_notes", "deploy", "monitor"]
```

`status` is never stored — always derived:
- `completed_steps.length === 0` → `planned`
- `0 < completed_steps.length < STEPS.length` → `ongoing`
- `completed_steps.length === STEPS.length` → `done`

## 2. Stack

- **Backend**: Node.js + Apollo Server (GraphQL) + Prisma → Postgres
- **Frontend**: React + Vite + Apollo Client, plain CSS (no UI kit)
- **DB (hosted)**: Neon or Supabase free Postgres
- **Deploy**: Frontend → Vercel. Backend → Render or Railway (long-lived process, not serverless, so stress-test results are real)
- **Docker**: `Dockerfile` for the API + `docker-compose.yaml` (API + local Postgres) for local dev
- **Tests**: Vitest + a couple of resolver/integration tests (create release, toggle step → status changes)
- **Stress tool**: `autocannon` or `k6` against the GraphQL endpoint

## 3. Hour-by-hour execution plan

| Time | Task |
|---|---|
| Hr 1 | Repo scaffold (backend + frontend in one repo), Prisma schema, Neon DB, GraphQL schema (typeDefs + resolvers) |
| Hr 2 | Backend CRUD resolvers: `releases` query, `createRelease`, `toggleStep`, `updateAdditionalInfo`, `deleteRelease`. Status computed in a resolver field, not stored |
| Hr 3 | Frontend: list view + create form + Apollo wiring, deploy early scaffolding to Vercel/Render to de-risk deploy issues |
| Hr 4 | Frontend: release detail (checklist toggles, edit additional info, delete), responsive CSS pass |
| Hr 5 | Docker (Dockerfile + compose), Vitest tests, README (endpoints + schema) |
| Hr 6 | **Stress test round 1** on deployed naive API — ramp concurrent users with autocannon/k6 until latency/errors spike, record the breaking point |
| Hr 7 | **Optimize**: DB connection pooling (pgbouncer / Prisma pool tuning), indexes, cache the steps constant, DataLoader if N+1 exists, avoid per-request Prisma client instantiation. If writes (not reads) are the round-1 bottleneck, consider a write queue (see 5a). Re-run stress test, record new ceiling |
| Hr 8 | Record demo video (face + voice, 3–4 min): show app → round-1 breaking point → explain the fix → round-2 improved ceiling. Final polish, submit form |

## 4. Repo structure

```
/
  backend/   (Apollo Server, Prisma, Dockerfile)
  frontend/  (Vite React app)
  docker-compose.yaml
  README.md
```

## 5. Stress test methodology (mandatory, graded)

1. Deploy naive version.
2. Hit the `releases` query (or `createRelease` mutation) with increasing concurrency (10 → 50 → 100 → 200...) using autocannon/k6, plot latency/error rate.
3. Identify the concurrency level where p95 latency blows up or errors start — this is the "initial breaking point" for the video.
4. Apply 1-2 targeted fixes (connection pool size, avoid new Prisma client per request, response caching if reads dominate, indexing).
5. Re-run the same test, show the new ceiling — that delta is the story of the video.

### 5a. Optional: write queue (if round-1 shows writes collapsing, not reads)

- Push mutations (`createRelease`, `toggleStep`, `updateAdditionalInfo`, `deleteRelease`) onto a Redis-backed queue (BullMQ) instead of writing to Postgres synchronously.
- API responds optimistically (compute/cache the resulting state, return immediately) while a small worker pool drains the queue and writes to Postgres serially/batched — this caps concurrent DB connections regardless of API request volume.
- Serve the `releases` query from a Redis cache updated on write, so reads don't hit Postgres per-request either.
- Tradeoff to state explicitly in the video: writes become eventually-consistent (client sees an optimistic response before the row is actually persisted) — a deliberate design decision, not a bug.
- More moving parts (Redis + BullMQ + worker process) than pooling/caching alone — only add if time allows in hour 7.

## 6. Demo video checklist (2–5 min, ideal 3–4 min, face + English audio required)

1. Show the constraints (# concurrent users) where the initial implementation degrades — actually demonstrate the breaking point.
2. Explain the optimization approach.
3. Show the final, improved constraints after optimization.

## 7. Risks given the time limit

- GraphQL + Prisma + Docker + hosted Postgres + deploy + stress test + video is a lot for 8 hours. Cut frontend styling scope first if time runs short — never cut must-have functional/GraphQL/Docker/test items.
- Deploy early (hour 3), not last — deployment config issues (CORS, env vars, Prisma binary targets on Render) are the most common time sink.

## 8. README must include

- Setup/run instructions (local, via Docker)
- API endpoints (GraphQL schema: queries/mutations)
- Database schema
- Design decisions
- Stress test results (before/after optimization)
