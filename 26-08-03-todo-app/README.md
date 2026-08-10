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
├── backend/     Express REST API
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
npm run seed     # (re)creates the 5 demo users
npm run dev       # http://localhost:4000
```

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

All routes are namespaced under `/api`, return JSON, and use standard HTTP status codes
(`200`, `201`, `204`, `400`, `401`, `403`, `404`, `500`) — see `MATURITY.md` for the full
rationale.

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
