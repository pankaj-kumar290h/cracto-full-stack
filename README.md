# Release Checklist Tool

A minimal single-page app for tracking software releases through a fixed
checklist of steps. Built for the Cactro full-stack test.

- **Frontend**: React + Vite + Apollo Client, plain CSS
- **Backend**: Node.js + Apollo Server (GraphQL) + Prisma
- **Database**: PostgreSQL

## Design decisions

- **Single `Release` model, no `Step` table.** The checklist steps are the
  same for every release, so they live as a hardcoded constant
  (`backend/src/steps.js`) shared conceptually between frontend and backend.
  Each release stores only which step keys are completed, as a JSON array
  column (`completed_steps`).
- **`status` is never stored.** It's derived on every read from
  `completed_steps.length` vs. the total step count (`planned` / `ongoing` /
  `done`), so it can never drift out of sync with the actual checklist state.
- **No auth / no multi-user support**, per the spec — this is intentionally a
  single-tenant tool.
- **Two pages, per the provided mockup**, using client-side routing
  (`react-router-dom` — still a single-page app, no full page reloads):
  `/` is a table of all releases with a "New release" button, `/releases/new`
  is the create form, `/releases/:id` is the per-release checklist/detail
  view.
- **Optimistic UI on checkbox toggles.** `toggleStep` mutations use Apollo's
  `optimisticResponse` so checking a box updates the UI instantly instead of
  waiting on a round trip; `createRelease`/`deleteRelease` use
  `refetchQueries` since they change the list itself, which normalized cache
  updates can't handle automatically.
- **Prisma client is a singleton** (`backend/src/db.js`), never instantiated
  per-request — a very common cause of connection-pool exhaustion under load.

## Project structure

```
/
  backend/   Apollo Server (GraphQL) + Prisma + Dockerfile
  frontend/  Vite + React SPA
  docker-compose.yaml   Postgres + backend, for local dev
```

## Running locally with Docker (recommended)

Requires Docker + Docker Compose.

```bash
docker compose up -d --build
```

This starts Postgres and the backend (migrations run automatically on
container start). The API is then available at `http://localhost:4000/graphql`.

Then run the frontend separately:

```bash
cd frontend
cp .env.example .env   # VITE_GRAPHQL_URL defaults to http://localhost:4000/graphql
npm install
npm run dev
```

Open `http://localhost:5173`.

## Running locally without Docker

Requires a local or reachable Postgres instance.

```bash
cd backend
cp .env.example .env        # set DATABASE_URL
npm install
npx prisma migrate deploy
npm run dev                 # http://localhost:4000/graphql
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## Tests

```bash
cd backend
npm test
```

`tests/steps.test.js` covers the pure status-computation logic (no DB
needed). `tests/resolvers.test.js` is an integration test against a real
Postgres (set `DATABASE_URL` — it auto-skips otherwise) covering the full
create → toggle-step → status transition lifecycle.

## API (GraphQL)

Schema lives in `backend/src/schema.js`. Endpoint: `POST /graphql`.

```graphql
type Release {
  id: ID!
  name: String!
  date: String!
  additionalInfo: String
  status: ReleaseStatus!   # planned | ongoing | done — computed, not stored
  steps: [Step!]!
  createdAt: String!
}

type Step {
  key: String!
  label: String!
  completed: Boolean!
}

type Query {
  releases: [Release!]!
  release(id: ID!): Release
  steps: [Step!]!
}

type Mutation {
  createRelease(input: CreateReleaseInput!): Release!
  toggleStep(id: ID!, stepKey: String!, completed: Boolean!): Release!
  updateAdditionalInfo(id: ID!, additionalInfo: String): Release!
  deleteRelease(id: ID!): Boolean!
}

input CreateReleaseInput {
  name: String!
  date: String!
  additionalInfo: String
}
```

## Database schema

```sql
CREATE TABLE releases (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  date             TIMESTAMPTZ NOT NULL,
  additional_info  TEXT,
  completed_steps  JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON releases (created_at);
```

(Exact source of truth: `backend/prisma/schema.prisma`.)

## Deployment

- Frontend: Vercel — set `VITE_GRAPHQL_URL` to the deployed backend's
  `/graphql` URL.
- Backend: Render (native Node service, root directory `backend/`) — set
  `DATABASE_URL` to a hosted Postgres (Neon/Supabase). Build command:
  `npm install`. Start command: `npm start` (this runs
  `prisma migrate deploy` before starting the server, so schema migrations
  apply automatically on every deploy — no manual migration step needed).

Live URLs:
- Backend (GraphQL): https://cracto-full-stack-be.onrender.com/graphql
- Frontend: https://cracto-full-stack-fe.vercel.app/

Both verified end-to-end (create/toggle/status transitions/save/delete)
against the live deployment.

## Stress test / optimization

Script: `backend/stress/run.js` (autocannon), hitting the `releases` query —
the read path a real client hammers hardest (list view, polling). Raw output
for every run below is saved in `backend/stress/results/`.

```bash
cd backend
node stress/run.js <url> <connections> <duration_seconds>
```

Backend runs on Render's free tier — a single small, CPU-constrained
instance. All runs below were against the deployed instance, not localhost.

### Round 1 — naive implementation (no cache)

| Connections | Median latency | p99 latency | Throughput (avg req/s) | Errors |
|---|---|---|---|---|
| 10  | 286 ms | 1,922 ms | ~28  | 0 |
| 50  | 457 ms | 1,207 ms | ~100 | 0 |
| 100 | 896 ms | 1,652 ms | ~104 | 0 |
| 200 | 1,803 ms | 3,024 ms | ~103 | 0 |
| 400 | 3,600 ms | 5,408 ms | ~104 | 0 (1 non-2xx / 1,559) |
| 800 | 6,805 ms | 9,620 ms | ~95  | **51 timeouts** (~2.5% of ~2,000) |

**Finding:** throughput flatlines at ~100 req/s starting at just 50
concurrent connections — going from 50 → 800 connections doesn't move
throughput at all, it only queues requests and inflates latency linearly.
This is the signature of a CPU-bound single instance, not a database
bottleneck: the server can only *process* ~100 requests/sec regardless of
how many arrive, so excess requests just wait in line until enough of them
time out (real breaking point: **~800 concurrent users**, ~2.5% error rate,
p99 latency 9.6s — i.e. actually unusable well before that, around
the 200–400 range where median latency is already 1.8–3.6s).

### Optimization applied

The `releases` query is read constantly by anything polling the list (and
by this exact stress test) but only actually changes on a mutation. Added:

1. **A 2-second in-process TTL cache** on the `releases` query
   (`backend/src/cache.js`), invalidated on every mutation. Concurrent
   identical reads within the 2s window are served from memory instead of
   re-running the DB round trip + GraphQL serialization per request.
2. **Gzip response compression** (`compression` middleware) — cuts payload
   size over the wire.

No infrastructure change (still the same free-tier instance) — this is a
code-only fix.

### Round 2 — after optimization

| Connections | Median latency | p99 latency | Throughput (avg req/s) | Errors |
|---|---|---|---|---|
| 50  | 275 ms | 1,108 ms | ~144 | 0 |
| 100 | 404 ms | 1,450 ms | ~210 | 0 |
| 200 | 791 ms | 1,777 ms | ~241 | 0 (3 non-2xx / 2,408) |
| 400 | 1,662 ms | 3,040 ms | ~252 | 0 (4 non-2xx / 3,781) |
| 500 | 1,719 ms | 3,035 ms | ~304 | **0** |
| 650 | 374 ms | 9,230 ms | ~375 | 44 timeouts + 108 non-2xx / ~5,000 (~3%) |
| 800 | 994 ms | 4,953 ms | ~290 | 562 timeouts / ~6,000 (~9.4%) |

**Result:** at every matched concurrency level up to 500, throughput is
**~2–3x higher** and latency **40–55% lower** than round 1 — the practical
"usable" ceiling (clean, error-free) moved from roughly 100–200 concurrent
users to **~500 concurrent users**, at 3x the throughput.

**Honest caveat:** past ~650 concurrent connections, round 2 actually shows
*more* errors than round 1 did at 800 (9.4% vs 2.5%). This makes sense —
round 2 is doing 2–3x more real work per second (cache hits still cost CPU
for gzip compression + JSON serialization), so it pushes the same
single-core free instance harder before collapsing. The optimization traded
a slightly lower absolute connection ceiling for a much higher useful
throughput below it — the metric that actually matters for real users.

**Further optimization (not implemented, noted for the write-up):** the
remaining ceiling is CPU on a single free-tier instance, not the database.
Next steps would be a paid Render instance (more CPU) or horizontal scaling
(multiple instances behind Render's load balancer), and/or moving the write
path (`toggleStep`, etc.) onto a queue (see `PLAN.md` §5a) if writes — not
reads — turn out to be the bottleneck under a realistic mixed read/write
load instead of this read-only benchmark.

**Optimization applied:** _TODO._

**Round 2 (after optimization):** _TODO._
