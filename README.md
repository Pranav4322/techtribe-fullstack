# TechTribe

A developer hub: language references, tech news, a community forum, AI-powered
learning tools, and a personal dashboard.

This repo is a **monorepo** with two independently deployable projects:

```
techtribe-backend/    Node.js + Express + Prisma (Postgres) + Redis API
techtribe-frontend/   Single-file static frontend (index.html)
```

## What was wired together

The frontend originally shipped as a self-contained demo: fake login, posts
that only existed in the DOM, and AI tools that called `api.anthropic.com`
directly from the browser (which exposes no key, since none was ever
provided client-side, and would fail on CORS anyway).

It's now wired to the real backend:

| Feature | Backend endpoint(s) |
|---|---|
| Sign up / sign in / sign out (JWT, refresh cookie) | `POST /api/v1/auth/register`, `/login`, `/logout`, `/refresh` |
| Community feed: list / create / like posts | `GET|POST /api/v1/community/posts`, `POST /api/v1/community/posts/:id/like` |
| AI tools (code explainer, debugger, quiz, summarizer, learning path, code review) | `POST /api/v1/ai/quick-ask`, `/quiz`, `/summary`, `/path`, `/review` |
| Home "Quick Ask" widget | `POST /api/v1/ai/quick-ask` |
| Dashboard stats (XP, streak, posts, bookmarks) | `GET /api/v1/users/dashboard` |
| Saved items tab | `GET /api/v1/bookmarks` |
| Global search | `GET /api/v1/search?q=` |

The News and Languages pages still use their original free public sources
(dev.to / Hacker News APIs, and static in-page reference content) — that
part didn't need a backend and was left as-is.

**Not wired (backend supports these, but the current UI has no screens for
them):** challenges, MCQs, roadmaps, notes, admin panel, notifications,
comments, and follow/profile pages. The API is ready for them; the frontend
would need new pages/components to use them.

## Local development

### 1. Backend

```bash
cd techtribe-backend
cp .env.example .env      # fill in DATABASE_URL, REDIS_URL, JWT secrets, GROQ_API_KEY
npm install

# Postgres + Redis for local dev (optional, if you don't already have them running)
docker compose up -d

npm run prisma:migrate     # creates tables
npm run seed                # optional sample data + admin user
npm run dev                 # http://localhost:4000
```

Health check: `curl http://localhost:4000/api/v1/health`

### 2. Frontend

The frontend is a single static HTML file with no build step. It already
auto-detects `localhost` and points at `http://localhost:4000/api/v1`, so
just open it or serve it:

```bash
cd techtribe-frontend
python3 -m http.server 5500
# visit http://localhost:5500
```

Make sure `CLIENT_ORIGIN` in the backend `.env` includes whatever origin
you're serving the frontend from (`http://localhost:5500` by default).

## Deployment

**Why not "everything on Vercel"?** This backend keeps a persistent Redis
connection (`ioredis`) and a pooled Postgres connection (Prisma) open for
caching, rate limiting, and session/blacklist checks — that's a great fit
for a normal long-running Node process, but a poor fit for Vercel's
serverless functions, which spin up/down per request and don't hold
persistent connections well. Forcing it onto serverless would mean
constant reconnect overhead and eventually exhausted connection pools.

So the setup here is:

- **Backend → Render, Railway, Fly.io, or any host that runs a Docker
  container / long-lived Node process** (a `Dockerfile` is already included).
- **Frontend → Vercel**, exactly as you asked. Since it's one static HTML
  file, Vercel needs no build step at all.
- Vercel is configured (`techtribe-frontend/vercel.json`) to transparently
  **proxy** `/api/v1/*` to your backend, so the browser only ever talks to
  your Vercel domain — no CORS headaches, and cookies work normally.

### Deploy the backend (example: Render)

1. Push this repo to GitHub (see below).
2. On Render: New → Web Service → connect the repo → root directory
   `techtribe-backend` → it will detect the `Dockerfile` automatically.
3. Add a managed Postgres instance and a Redis instance (Render or Upstash),
   and set these environment variables on the service:
   `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `GROQ_API_KEY`, `CLIENT_ORIGIN` (your Vercel URL, e.g.
   `https://techtribe.vercel.app`), `NODE_ENV=production`.
4. After first deploy, run migrations once (Render Shell or a one-off job):
   `npx prisma migrate deploy`
5. Note the public URL Render gives you, e.g. `https://techtribe-api.onrender.com`.

### Deploy the frontend (Vercel)

1. In `techtribe-frontend/vercel.json`, replace
   `https://YOUR-BACKEND-URL.onrender.com` with the real backend URL from
   the step above.
2. On Vercel: New Project → import the repo → set **Root Directory** to
   `techtribe-frontend` → Framework Preset: "Other" (no build command
   needed) → Deploy.
3. Visit the Vercel URL — sign up, post, and try the AI tools; everything
   routes through `/api/v1/*` on the same domain.

## Pushing to GitHub

```bash
git init                     # if not already a repo
git add .
git commit -m "Wire TechTribe frontend to backend; add deployment config"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
