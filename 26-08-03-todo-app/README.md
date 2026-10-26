# Task Manager — Learning Project

A small full-stack task management (to-do list) app:

- **Backend**: Node.js + Express REST API, MongoDB persistence (Mongoose), JWT sessions,
  5 fixed demo users, plain email/password auth (no hashing — see [Auth](#auth) below).
- **Frontend**: React (Vite), warm ledger/journal-themed UI.
- **CLI**: Node CLI to sign in and manage tasks from the terminal.
- **Docker**: Dockerfile per service + a `docker-compose.yml` to run everything together.

See [`MATURITY.md`](./MATURITY.md) for the Richardson Maturity Model evaluation of the API.

## Project layout

```
todo-app/
├── backend/     Express REST API (+ src/events: async event bus, reminders, analytics)
├── frontend/    React SPA (Vite)
├── cli/         Terminal client (sign-in + task management)
├── docker-compose.yml
├── MATURITY.md
└── README.md
```

## Quick start (Docker — recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:4000/api/health

## Quick start (manual, no Docker)

**Prerequisite: MongoDB running locally** (or a `MONGO_URI` pointing at a remote instance,
e.g. MongoDB Atlas). Easiest local option:

```bash
docker run -d --name todo-mongo -p 27017:27017 mongo:7
```

**Backend**

```bash
cd backend
cp .env.example .env
npm install
npm run seed     # resets demo data; creates 5 users, sample tasks, and analytics
npm run dev       # http://localhost:4000
```

For the Docker setup, start the services first and run the seed inside the backend container:

```bash
docker compose up -d --build
docker compose exec backend npm run seed
```

The seed resets users, tasks, reminders, and analytics, then creates sample tasks and daily
analytics rollups so the dashboard is populated immediately. **It deletes existing task data.**

**Frontend**

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

**CLI**

```bash
cd cli
npm install
node index.js login
node index.js list
```

## Demo accounts (fixed, 5 users)

| email               | password  |
|---------------------|-----------|
| user1@todo.local    | password1 |
| user2@todo.local    | password2 |
| user3@todo.local    | password3 |
| user4@todo.local    | password4 |
| user5@todo.local    | password5 |

## Auth

This project intentionally uses the simplest possible auth:

- 5 hardcoded users, seeded into MongoDB (`npm run seed`).
- Passwords are stored and compared **in plain text** — no hashing, no salting.
- On successful login, the API issues a JWT (`backend/src/utils/jwt.js`) that the client
  sends back as `Authorization: Bearer <token>` on every subsequent request.
- Signing in from the terminal (`cli/index.js login`) is a first-class flow, not an
  afterthought — it prompts for email/password, calls `POST /api/auth/login`, and stores the
  token in `~/.todo-cli/config.json`.

This is a deliberate simplification for a learning project and should never be reused for
anything handling real user data.

## API overview

| Method | Route | Auth? | Description |
|--------|-------|-------|--------------|
| POST | `/api/auth/login` | No | Sign in, returns `{ token, user }` |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/tasks` | Yes | List tasks (`?status=`, `?priority=`, `?q=`, `?sortBy=`, `?order=`, `?page=`, `?limit=`) |
| POST | `/api/tasks` | Yes | Create a task |
| GET | `/api/tasks/:id` | Yes | Read one task |
| PUT | `/api/tasks/:id` | Yes | Full update |
| PATCH | `/api/tasks/:id` | Yes | Partial update (e.g. change status only) |
| DELETE | `/api/tasks/:id` | Yes | Delete a task |
| GET | `/api/reminders` | Yes | Fired reminders (`?unread=true`, `?limit=`) |
| PATCH | `/api/reminders/:id` | Yes | Mark one reminder read |
| POST | `/api/reminders/read-all` | Yes | Mark all reminders read |
| GET | `/api/analytics/productivity` | Yes | Productivity analytics (`?days=1..30`, default 7) |
| GET | `/api/events/stream?token=<jwt>` | Token in query | Server-Sent Events: `reminder`, `analytics` |

Tasks also accept an optional `remindAt` (ISO date-time) on `POST`/`PUT`/`PATCH`.

All routes are namespaced under `/api`, return JSON, and use standard HTTP status codes
(`200`, `201`, `204`, `400`, `401`, `403`, `404`, `500`) — see `MATURITY.md` for the full
rationale.

## Asynchronous reminders & analytics (event-driven)

Reminders and productivity analytics run **off the request path** using an in-process,
event-driven design (`backend/src/events/`):

```
 task.service ──publish──▶ eventBus (async queue, retries, dead-letter)
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
 reminder handlers     analytics handlers     notification handler
 (sync timers, deliver (atomic $inc into      (SSE "analytics" hint)
  reminder, SSE push)   DailyStat rollups)
```

- **Events**: `task.created / updated / completed / reopened / deleted`,
  `reminder.scheduled / due`, `analytics.updated` (`events/eventTypes.js`).
- **Event bus**: `publish()` returns immediately; handlers run later with capped
  concurrency, 3 attempts with exponential backoff, then a dead-letter list.
- **Reminders**: set `remindAt` on a task. One timer per pending reminder (no polling);
  `REMINDER_DUE` creates a `Reminder` document, marks the task, and pushes it to the browser
  over SSE (bell icon, toast, optional desktop notification). Timers are re-armed from MongoDB
  on startup, and delivery is claimed atomically so a reminder fires once.
- **Analytics**: handlers maintain per-day counters (created, completed, reopened, deleted,
  reminders fired, completion time). `GET /api/analytics/productivity` reads those rollups plus
  live overdue/upcoming counts: completion rate, streak, average time to finish, 7-day chart.
  The dashboard refreshes itself when the server pushes an `analytics` event.
- **Limits (by design for a learning project)**: the bus and timers live in one Node process,
  so run a single backend instance. To scale out, keep the `publish`/`subscribe` API and back it
  with Redis Streams / BullMQ / RabbitMQ. Analytics days are UTC. The SSE endpoint takes the JWT
  as a query parameter because `EventSource` can't send headers.

## AI features (Groq)

Two AI features run on [Groq](https://console.groq.com)'s OpenAI-compatible API. The key lives only on the backend and the browser never sees it.

| Feature | Where | What it does |
| --- | --- | --- |
| **Smart fill** | button next to *Add* | Turns a sentence such as `pay rent Friday 5pm, remind me, urgent` into title, priority, due date and reminder. It only fills the form, so you review and press *Add* yourself. |
| **Plan my day** | panel above the form | Reads your open tasks (overdue, due dates, priority, in-progress) and returns an ordered top-5 focus list with a reason for each, plus a one-click *Start*. |

**Enable it:** set `GROQ_API_KEY` in `.env` (see `.env.example`) and restart the backend. With no key the AI buttons are hidden and the rest of the app is unchanged. Optional: `GROQ_MODEL` (default `llama-3.3-70b-versatile`).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/ai/status` | `{ data: { enabled } }` |
| POST | `/api/ai/parse-task` | body `{ text, timezone }` returns `{ title, description, priority, dueDate, remindAt }` |
| GET | `/api/ai/plan?timezone=` | returns `{ headline, focus: [{ id, title, priority, dueDate, status, reason }] }` |

Design notes: model output is validated and coerced server-side (enums, date formats, task ids) before reaching the client; AI endpoints are rate-limited per user (`AI_RATE_LIMIT_PER_MIN`, default 15); and upstream Groq 401s are mapped to 503 so they never log the user out.

## Color palette

The UI is built strictly from this fixed palette (a "ledger/journal" theme):

| Token | Hex |
|-------|-----|
| Black | `#000000` |
| Espresso (base background) | `#1F150C` |
| Umber (panels/accents) | `#412D15` |
| Parchment (text/light surface) | `#E1DCC9` |

## Notes on data persistence

Data is stored in **MongoDB** via Mongoose (`backend/src/models/`). Controllers and
services only ever call model methods — no raw driver calls scattered around the
codebase. In Docker, MongoDB runs as its own `mongo` service with a named volume
(`todo-mongo-data`) so data survives container restarts. Locally, point `MONGO_URI` in
`backend/.env` at any MongoDB instance (local, Docker, or Atlas).

Validation (required fields, the `status`/`priority` enums, etc.) lives on the Mongoose
schemas themselves (`backend/src/models/task.model.js`). A pre-`save` hook trims
whitespace from `title` before it's persisted. Raw Mongoose errors (`ValidationError`,
`CastError`, duplicate-key errors) are never sent to the client as-is — they're caught
centrally in `backend/src/middleware/error.middleware.js` and reshaped into the same
`{ error: { status, message, details } }` JSON envelope used everywhere else in the API.

### Testing with Postman

A ready-to-import collection is included at `backend/postman_collection.json`. It covers
login, and full CRUD on `/api/tasks` (create, list, get-by-id, update, patch, delete),
plus negative cases: missing title, invalid `priority`, and a GET on a nonexistent ID
(expects a `404` JSON body). Import it into Postman, set the collection variable
`baseUrl` (defaults to `http://localhost:4000/api`), run **Login** first to capture a
token into `{{token}}`, then run the rest of the requests.
