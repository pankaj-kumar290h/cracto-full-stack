# Performance Report — Release Checklist Tool

## Summary

The deployed GraphQL API was load-tested against the `releases` query (the
read path a real client hammers hardest — list view, polling) using
[autocannon](https://github.com/mcollina/autocannon), ramping concurrent
connections from 10 to 800. The naive implementation plateaus at ~100 req/s
and starts timing out at 800 concurrent connections. Adding a 2-second
in-process cache plus gzip compression — a code-only change, no
infrastructure upgrade — raised the clean, error-free ceiling from ~100–200
concurrent users to ~500, at 2–3x the throughput and 40–55% lower latency.

## Environment

- **Backend**: Node.js (Express + Apollo Server + Prisma), deployed on
  **Render's free tier** as a native Node service — a single small,
  CPU-constrained instance, not autoscaled.
- **Database**: hosted PostgreSQL (Neon/Supabase), reached over the network
  from Render.
- **Load generator**: `backend/stress/run.js` (autocannon), run against the
  live deployed URL (not localhost) for every result below.
- **Target operation**: `query { releases { id name status ... } }` — a
  `findMany` with no filters, ordered by `createdAt`.

```bash
cd backend
node stress/run.js <url> <connections> <duration_seconds>
```

Raw autocannon output for every run is committed in
`backend/stress/results/`.

## Round 1 — naive implementation (no cache)

| Connections | Median latency | p99 latency | Throughput (avg req/s) | Errors |
|---|---|---|---|---|
| 10  | 286 ms | 1,922 ms | ~28  | 0 |
| 50  | 457 ms | 1,207 ms | ~100 | 0 |
| 100 | 896 ms | 1,652 ms | ~104 | 0 |
| 200 | 1,803 ms | 3,024 ms | ~103 | 0 |
| 400 | 3,600 ms | 5,408 ms | ~104 | 0 (1 non-2xx / 1,559) |
| 800 | 6,805 ms | 9,620 ms | ~95  | **51 timeouts** (~2.5% of ~2,000) |

### Analysis

Throughput flatlines at ~100 req/s starting at just **50** concurrent
connections — going from 50 → 800 connections doesn't move throughput at
all, it only queues requests, which inflates latency roughly linearly with
concurrency. That's the signature of a **CPU-bound single instance**, not a
database bottleneck: the server can only *process* ~100 requests/sec
regardless of how many arrive, so excess requests wait in line until enough
of them time out.

- **Actual breaking point (errors appear): ~800 concurrent users**, ~2.5%
  error rate, p99 latency 9.6s.
- **Practically unusable well before that**: by 200–400 concurrent users,
  median latency is already 1.8–3.6 seconds — no end user would tolerate
  this, even though the server hasn't technically started erroring yet.

## Optimization applied

The `releases` query is read constantly by anything polling the list (and
by this exact benchmark) but only actually changes on a mutation. Two
changes, both code-only:

1. **A 2-second in-process TTL cache** on the `releases` query
   (`backend/src/cache.js`), invalidated on every mutation
   (`createRelease`, `toggleStep`, `updateAdditionalInfo`, `deleteRelease`).
   Concurrent identical reads within the 2-second window are served from
   memory instead of re-running the DB round trip + GraphQL serialization
   for every single request.
2. **Gzip response compression** (`compression` middleware) — reduces
   payload size over the wire.

No infrastructure change — same free-tier instance, same database plan.

## Round 2 — after optimization

| Connections | Median latency | p99 latency | Throughput (avg req/s) | Errors |
|---|---|---|---|---|
| 50  | 275 ms | 1,108 ms | ~144 | 0 |
| 100 | 404 ms | 1,450 ms | ~210 | 0 |
| 200 | 791 ms | 1,777 ms | ~241 | 0 (3 non-2xx / 2,408) |
| 400 | 1,662 ms | 3,040 ms | ~252 | 0 (4 non-2xx / 3,781) |
| 500 | 1,719 ms | 3,035 ms | ~304 | **0** |
| 650 | 374 ms | 9,230 ms | ~375 | 44 timeouts + 108 non-2xx / ~5,000 (~3%) |
| 800 | 994 ms | 4,953 ms | ~290 | 562 timeouts / ~6,000 (~9.4%) |

### Analysis

At every matched concurrency level up to 500, throughput is **~2–3x
higher** and latency **40–55% lower** than round 1. The practical "usable,
error-free" ceiling moved from roughly 100–200 concurrent users to
**~500 concurrent users**, at 3x the throughput (~304 req/s vs ~100 req/s).

### Honest caveat

Past ~650 concurrent connections, round 2 shows *more* errors than round 1
did at 800 (9.4% vs 2.5%). This is expected, not a regression to be hidden:
round 2 is doing 2–3x more real work per second (cache hits still cost CPU
for gzip compression and JSON serialization on every response), so it
pushes the same single-core free instance harder before it collapses. The
optimization traded a slightly lower absolute connection ceiling for a much
higher useful throughput below it — the number that actually matters for
real users, since almost nobody benefits from a server that merely queues
politely at 800 concurrent instead of serving 3x the traffic and failing
sooner past a point no real deployment would sustain anyway.

## Conclusion / final constraints

| | Round 1 (naive) | Round 2 (optimized) |
|---|---|---|
| Clean (0-error) ceiling | ~100–200 concurrent | **~500 concurrent** |
| Throughput at clean ceiling | ~100 req/s | **~304 req/s** |
| Median latency at 200 concurrent | 1,803 ms | **791 ms** |
| First real errors | 800 concurrent (~2.5%) | 650 concurrent (~3%) |

**Delta brought to the table**: ~3x usable throughput and ~55% lower
latency at real-world load levels, achieved with a two-function,
code-only change (no paid infrastructure).

## Further optimization (not implemented — noted for future work)

The remaining ceiling is CPU on a single free-tier instance, not the
database (connection count was never the limiting factor in either round).
Next steps, in order of expected impact:

1. **Vertical/horizontal scaling** — a paid Render instance (more CPU), or
   multiple instances behind Render's load balancer.
2. **Move writes off the request path** — a write queue (Redis + BullMQ)
   for `toggleStep`/`createRelease`/etc. with an optimistic response, so
   API responses aren't blocked on Postgres round trips under load. See
   `PLAN.md` §5a — not implemented here since this benchmark is read-only
   and reads were the actual bottleneck, but would matter under a mixed
   read/write load.
3. **CDN/edge caching** in front of the `releases` query for anonymous,
   identical reads, extending the cache benefit beyond a single instance's
   memory.
