# Demo Video Script

Target: 3-4 min (min 2, max 5). Face on camera throughout, speak in English.
Record with Loom or similar, screen + webcam. All 3 required parts are
marked below — don't skip any.

---

## 0:00–0:20 — Intro (face on camera)

"Hi, I'm [name]. This is the Release Checklist Tool I built for the Cactro
test — a React + GraphQL + Postgres app for tracking release progress
through a fixed checklist. It's live at [frontend URL], backend at
[backend URL]. Let me walk through it."

## 0:20–1:10 — Live demo on the deployed link (screen share)

Open **https://cracto-full-stack-fe.vercel.app** in the browser (not
localhost — the task requires the deployed link).

1. Show the releases list page.
2. Click **New release**, fill in a name + date, Save.
3. On the detail page, check a couple of checklist steps — point out the
   status badge changing planned → ongoing live.
4. Check the rest → status becomes done.
5. Type something in "Additional remarks", click Save → back on the list,
   status shows done.
6. Quickly show an explicit **API call to the deployed backend** — either
   open browser devtools → Network tab and click a request to show the
   GraphQL POST going to the Render URL, or run one `curl` against
   `https://cracto-full-stack-be.onrender.com/graphql` in a terminal on
   screen. (Task explicitly asks to show API calls to the deployed link,
   not just the UI.)
7. Delete the release, confirm it's gone.

One line on the stack: "React + Vite + Apollo Client on the frontend, Node
+ Apollo Server + GraphQL + Prisma on the backend, Postgres for storage,
deployed on Vercel and Render."

## 1:10–2:10 — **[REQUIRED 1/3] Show the initial breaking point**

Switch to a terminal. Don't just describe it — actually run it on camera
(or show real captured terminal output/scrollback, not a slide):

```bash
cd backend
node stress/run.js https://cracto-full-stack-be.onrender.com/graphql 100 10
node stress/run.js https://cracto-full-stack-be.onrender.com/graphql 800 15
```

Talking points while it runs / after:
- "At 100 concurrent connections, throughput caps at about 104 requests a
  second — and it's the *same* ~100 req/s I get at 50 connections too, so
  the server isn't actually scaling with load, it's just queuing."
- "Latency climbs linearly with concurrency — median goes from 457ms at 50
  connections to 3.6 seconds at 400."
- Point at the 800-connection run: **"51 timeouts here, about 2.5% of
  requests failing outright, p99 latency 9.6 seconds. That's the breaking
  point — this is a single small free-tier instance on Render, so it's
  CPU-bound, not a database problem."**

(Full numbers if you want them on screen: `PERFORMANCE.md` round 1 table.)

## 2:10–2:50 — **[REQUIRED 2/3] Explain the optimization**

Face on camera or screen-share the diff/code briefly:

"The endpoint under load is `releases` — a read that's identical for every
concurrent caller within the same couple of seconds, but the naive version
re-ran a full DB round trip and GraphQL serialization on every single
request. I added a 2-second in-process cache on that query, invalidated on
every write, so concurrent identical reads get served from memory instead
of hitting Postgres every time. I also added gzip compression on
responses. Both are code-only changes — no infrastructure upgrade, same
free instance."

(Optionally show `backend/src/cache.js` on screen for a few seconds.)

## 2:50–3:40 — **[REQUIRED 3/3] Show the final, optimized constraints**

Back to the terminal, same live deployed URL:

```bash
node stress/run.js https://cracto-full-stack-be.onrender.com/graphql 500 12
```

Talking points:
- "500 concurrent connections, zero errors, throughput is now about 304
  requests a second — three times what the naive version could do, and
  that's still error-free."
- "Compared side by side: at 200 concurrent connections, median latency
  went from 1.8 seconds down to 791 milliseconds — the same load feels
  more than twice as fast."
- Be honest about the limit: "Push it further, past about 650 concurrent,
  and it does start erroring again — actually at a slightly higher rate
  than the original at 800, because it's now doing 2-3x more real work per
  second on the same single CPU core before it tips over. So the delta I'm
  bringing isn't 'no more limit' — it's a 3x higher *useful* ceiling before
  hitting one."

## 3:40–4:00 — Close (face on camera)

"So: naive implementation caps out around 100-200 usable concurrent users;
after a two-function optimization — a short TTL cache and compression —
that's roughly 500, at 3x the throughput. Full write-up with all the
numbers is in PERFORMANCE.md in the repo. Thanks for watching."

---

## Pre-recording checklist

- [ ] Deployed frontend and backend are both up and responsive (hit
      `/health` and the site once before hitting record)
- [ ] Terminal font size large enough to read on screen
- [ ] Have `backend/stress/run.js` commands ready/typed so you're not
      fumbling live
- [ ] Decide in advance whether you'll re-run stress tests live (more
      authentic, but slower/riskier) or show the already-captured output
      in `backend/stress/results/` while narrating (faster, safer) — the
      task says "actually show" the breaking point, so prefer live or a
      real terminal scrollback over a slide/screenshot
- [ ] Clear out any leftover test releases from the list before recording
      so the demo looks clean
- [ ] Camera visible for intro, optimization explanation, and close at
      minimum (task requires face shown, doesn't require it 100% of the
      time screen-sharing)
