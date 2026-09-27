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
- Frontend: _TODO_

## Stress test / optimization

Script: `backend/stress/run.js` (autocannon), hitting the `releases` query.

```bash
cd backend
node stress/run.js <url> <connections> <duration_seconds>
```

**Round 1 (naive implementation):** _TODO — fill in after running against
the deployed backend._

**Optimization applied:** _TODO._

**Round 2 (after optimization):** _TODO._
