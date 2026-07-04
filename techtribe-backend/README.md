# TechTribe Backend

Production backend for the TechTribe developer platform — built with **Node.js, Express, TypeScript, PostgreSQL (Prisma), Redis, and JWT auth**.

## ⚠️ Important: matching this backend to the frontend you provided

The uploaded frontend (`devhub_5_5.html`) is a self-contained static demo page with 7 views (home, languages, news, community, ai, dashboard, search). It calls Dev.to/Hacker News and `api.anthropic.com` **directly from the browser with no key**, has no MCQ/challenges/notes/roadmap/admin *pages*, and persists nothing (bookmarks/likes are just visual toggles that reset on reload).

This backend does two things:
1. **Backs every real feature the frontend has** — auth, news aggregation, community posts/comments, the AI tools panel, dashboard stats, and search — properly, with persistence and a secured server-side AI proxy (your Anthropic key never touches the browser).
2. **Adds the modules your original brief called for but the demo page doesn't implement** — MCQ practice, coding challenges, notes, roadmaps, notifications, and an admin dashboard — as complete, working APIs so the platform is ready for a fuller frontend to be built against it.

You will need to wire the static HTML's `fetch` calls (currently hitting Dev.to/HN/Anthropic directly) to point at this API instead — see **Frontend Integration** below.

## Tech Stack

- **Runtime**: Node.js 18+, TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL via Prisma ORM
- **Cache/Sessions/Rate-limiting**: Redis (ioredis)
- **Auth**: JWT access + refresh tokens (rotation, Redis blacklist on logout), bcrypt password hashing
- **Validation**: Zod on every input
- **AI**: Server-side proxy to the Anthropic API (key stored only in backend env)
- **Logging**: Winston + Morgan
- **Email**: Nodemailer (SMTP) for verification/reset — logs to console if SMTP isn't configured

## Getting Started

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use the included `docker-compose.yml`)
- Redis 6+ (or use Docker Compose)
- An Anthropic API key (for the AI features)

### 2. Install & configure

```bash
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL, REDIS_URL, JWT secrets (32+ chars), ANTHROPIC_API_KEY, SMTP (optional)
```

Quickest path — spin up Postgres + Redis with Docker:

```bash
docker compose up -d postgres redis
```

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed        # creates admin user + sample languages/MCQs/challenge/roadmap
```

The seed script creates an admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in your `.env` (defaults: `admin@techtribe.dev` / `ChangeMe123!` — **change this in production**).

### 4. Run

```bash
npm run dev     # ts-node-dev style hot reload via tsx
# or
npm run build && npm start
```

The API listens on `http://localhost:4000` (configurable via `PORT`). Health check: `GET /api/v1/health`.

### 5. Full stack via Docker

```bash
docker compose up -d --build
```

## Project Structure

```
src/
  config/        # env validation, Prisma client, Redis client, logger
  middleware/    # auth, error handling, validation, rate limiting
  modules/       # one folder per domain — routes/controller/service/validation
    auth/ users/ languages/ news/ community/ ai/ bookmarks/
    search/ notifications/ mcq/ challenges/ notes/ roadmaps/ admin/
  routes/        # mounts all module routers under /api/v1
  utils/         # ApiError, JWT helpers, password hashing, pagination, mailer
  app.ts         # Express app assembly (helmet, cors, rate limiting, routes)
  server.ts      # bootstrap: connects DB/Redis, starts server, graceful shutdown
prisma/
  schema.prisma  # full data model
  seed.ts        # bootstrap data
```

Each module follows the same layering: **routes → controller → service → Prisma**. Validation happens via Zod schemas at the route boundary; business logic and DB access live in the service; controllers are thin request/response glue.

## Authentication

- `POST /api/v1/auth/register` — creates account, sends verification email, returns access token + sets httpOnly refresh cookie
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh` — rotates refresh token, issues new access token
- `POST /api/v1/auth/logout` — blacklists current access token in Redis, revokes refresh token
- `POST /api/v1/auth/logout-all` — revokes all refresh tokens for the user
- `GET  /api/v1/auth/verify-email?token=...`
- `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password` (authenticated)
- `GET  /api/v1/auth/me`

Send the access token as `Authorization: Bearer <token>`. Refresh tokens are stored as httpOnly cookies (path-scoped to `/api/v1/auth`) and also returned as a fallback for non-browser clients.

## API Overview

| Module | Base path | Highlights |
|---|---|---|
| Auth | `/api/v1/auth` | register/login/refresh/logout, email verification, password reset |
| Users | `/api/v1/users` | public profile, edit own profile, follow/unfollow, dashboard stats |
| Languages | `/api/v1/languages` | tutorial content (public read, admin write) |
| News | `/api/v1/news` | server-cached Dev.to/HN aggregation, like/bookmark |
| Community | `/api/v1/community` | posts, nested comments, likes, bookmarks, reports |
| AI | `/api/v1/ai` | quiz, summary, learning path, code review, quick-ask — all server-proxied to Claude, auth + daily rate limited |
| Bookmarks | `/api/v1/bookmarks` | unified "Saved" list across all content types |
| Search | `/api/v1/search` | cross-entity search (news, posts, languages, challenges, roadmaps, users) |
| Notifications | `/api/v1/notifications` | list, unread count, mark read, delete |
| MCQ | `/api/v1/mcq` | categories, timed attempts, scoring, XP reward |
| Challenges | `/api/v1/challenges` | CRUD, AI-assisted grading against test cases, XP reward |
| Notes | `/api/v1/notes` | notebooks + notes CRUD, per-user, search/filter |
| Roadmaps | `/api/v1/roadmaps` | template roadmaps, AI-personalized roadmap generation, milestone tracking |
| Admin | `/api/v1/admin` | platform stats, user management/ban, report moderation, announcements, audit log |

All list endpoints support `?page=&limit=` and return `{ items, meta: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }`.

### A note on coding challenges

Running arbitrary user-submitted code safely requires an isolated sandbox (gVisor/Firecracker-style container execution) that is separate infrastructure from this API. Rather than fake it or leave it as a TODO, submissions are graded by having Claude trace the code against the challenge's declared test cases and return structured pass/fail + feedback (`ChallengeSubmission.aiFeedback`). If you later add a real execution sandbox, swap the grading step in `challenges.service.ts::submitSolution` — the rest of the flow (persistence, XP, submission history) stays the same.

## Frontend Integration

To connect `devhub_5_5.html` to this backend:

1. Replace the direct `fetch('https://dev.to/api/...')` / HN calls in the news section with `fetch('/api/v1/news?category=ai')` — the backend does the aggregation, caching, and fallback for you.
2. Replace the direct `fetch('https://api.anthropic.com/v1/messages', ...)` calls in the AI panel with calls to `/api/v1/ai/quiz`, `/api/v1/ai/summary`, `/api/v1/ai/path`, `/api/v1/ai/review`, `/api/v1/ai/quick-ask` (all require the `Authorization: Bearer` header from login).
3. Wire the login/signup modal to `/api/v1/auth/login` and `/api/v1/auth/register`; store the returned `accessToken` in memory (not localStorage, to limit XSS blast radius) and let the refresh cookie handle renewal.
4. Wire the "like"/"bookmark" icon toggles on news/posts to the corresponding `POST .../like` and `.../bookmark` endpoints instead of local-only state.
5. Point the dashboard's stat tiles at `GET /api/v1/users/dashboard`.

## Security Notes

- Passwords: bcrypt, 12 rounds, strong-password policy enforced by Zod
- JWT: short-lived access tokens (15m default) + rotating refresh tokens (30d default) with DB-backed revocation
- Logout invalidates the access token immediately via a Redis blacklist (keyed by token, TTL = remaining lifetime)
- All list/search inputs validated with Zod; Prisma parameterizes all queries (no raw SQL string concatenation)
- `helmet` for HTTP security headers, strict CORS allow-list via `CLIENT_ORIGIN`
- Redis-backed rate limiting: general API, stricter auth endpoints, and a separate daily cap on AI endpoints (they cost real money)
- Role-based access control (`USER` / `MODERATOR` / `ADMIN`) enforced via middleware, never trusted from the client
- The Anthropic API key lives only in backend environment variables — it is never sent to or exposed in the frontend

## ⚠️ Environment limitation encountered while building this

This backend was built in a sandboxed environment whose network egress is restricted to a small allow-list (npm registry, GitHub, etc.) and does **not** include `binaries.prisma.sh`, the CDN Prisma's CLI uses to download its query-engine binary. As a result, `npx prisma generate` / `npx prisma migrate dev` could not be executed here, and the code could not be fully type-checked against the generated Prisma Client in this environment.

**On your machine (with normal internet access) this is a non-issue** — just run:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

The schema was written and manually reviewed carefully (relations, `@@unique` constraints, enum usage), but please run `npx tsc --noEmit` after generating the client as a final check before deploying, and open an issue/fix quickly if anything surfaces — I was not able to run that verification loop myself here.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:studio` | Open Prisma's DB GUI |
| `npm run seed` | Seed admin user + sample content |
| `npm run lint` | ESLint |
