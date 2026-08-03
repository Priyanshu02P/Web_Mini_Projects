# MATURITY.md — Richardson Maturity Model Evaluation

This document evaluates the Task Management API against the **Richardson Maturity Model
(RMM)** and explains the changes made to reach **Level 2**.

## The model, briefly

| Level | Name | Requirement |
|-------|------|-------------|
| 0 | The Swamp of POX | One URI, one HTTP verb (usually POST). The body carries an "action"/method name. This is RPC-over-HTTP. |
| 1 | Resources | Multiple URIs, one per resource/concept, but usually still a single HTTP verb (often POST/GET) driving everything. |
| 2 | HTTP Verbs | Resources **and** correct use of HTTP verbs (GET/POST/PUT/PATCH/DELETE) **and** correct, meaningful HTTP status codes. |
| 3 | Hypermedia Controls (HATEOAS) | Level 2, plus responses contain links describing the next valid actions/state transitions, so a client can navigate the API without hard-coding URIs. |

## Where this API started

Before this pass, a "quick and dirty" version of this project (the kind most people
naturally reach for first) would typically look like this:

```
POST /api/taskService
Body: { "action": "createTask", "title": "...", "userId": "u1" }

POST /api/taskService
Body: { "action": "listTasks", "userId": "u1", "filter": "pending" }

POST /api/taskService
Body: { "action": "deleteTask", "taskId": "abc123" }
```

Everything goes through **one endpoint** and **one verb (POST)**. The HTTP layer is just
a transport for an RPC call — the URI and verb carry no meaning, and every response would
likely return `200 OK` regardless of whether the operation succeeded, failed validation, or
hit a missing resource. That design sits at **Level 0**.

A slightly better but still-common in-between step is giving each action its own URI while
still using one verb for everything (`POST /api/createTask`, `POST /api/deleteTask`,
`POST /api/listTasks`) — this is **Level 1**: resources exist, but HTTP itself still isn't
doing any work.

## Where this API is now: Level 2

The implemented API (`backend/src/routes`, `backend/src/controllers`) satisfies **Level 2**:

### 1. Resources, identified by nouns, not verbs

```
/api/auth/login
/api/auth/me
/api/tasks
/api/tasks/:id
```

There is no `/api/createTask` or `/api/getTaskById` — the resource is `tasks`, and `/tasks/:id`
addresses one specific task. Filtering/sorting/pagination (`?status=`, `?priority=`, `?q=`,
`?sortBy=`, `?page=`, `?limit=`) are expressed as query parameters on the same resource,
not as separate endpoints — see `backend/src/services/task.service.js:listTasks`.

### 2. HTTP verbs carry real, distinct meaning

| Verb | Route | Behavior |
|------|-------|----------|
| `GET` | `/api/tasks` | List the current user's tasks (safe, read-only) |
| `GET` | `/api/tasks/:id` | Read one task |
| `POST` | `/api/tasks` | Create a new task |
| `PUT` | `/api/tasks/:id` | Full replace of a task's editable fields |
| `PATCH` | `/api/tasks/:id` | Partial update (e.g. just `{ "status": "completed" }`) |
| `DELETE` | `/api/tasks/:id` | Remove a task |

See `backend/src/routes/task.routes.js` — each verb maps to a distinct controller function
with distinct semantics, not one generic handler branching on a `method` field in the body.

### 3. Status codes are meaningful, not just 200/500

Implemented in `backend/src/utils/apiError.js` and `backend/src/middleware/error.middleware.js`:

- `200 OK` — successful GET/PUT/PATCH
- `201 Created` — successful POST, with a `Location` header pointing at the new resource
- `204 No Content` — successful DELETE (nothing to return)
- `400 Bad Request` — invalid input (missing title, invalid status/priority value, etc.)
- `401 Unauthorized` — missing/invalid/expired token, or wrong email/password
- `403 Forbidden` — valid token, but the task belongs to a different one of the 5 users
- `404 Not Found` — task/user/route doesn't exist
- `500 Internal Server Error` — unexpected server-side failure

A client (or the CLI) can branch on `response.status` alone and know what happened, without
parsing a message string.

**Conclusion: this API satisfies Level 2.**

## A deliberate step toward Level 3 (not fully claimed)

Every task representation returned by the API includes a `_links` object, e.g.:

```json
{
  "data": {
    "id": "a1b2c3",
    "title": "Buy milk",
    "status": "pending",
    "_links": {
      "self":   { "href": "http://localhost:4000/api/tasks/a1b2c3", "method": "GET" },
      "update": { "href": "http://localhost:4000/api/tasks/a1b2c3", "method": "PUT" },
      "patch":  { "href": "http://localhost:4000/api/tasks/a1b2c3", "method": "PATCH" },
      "delete": { "href": "http://localhost:4000/api/tasks/a1b2c3", "method": "DELETE" }
    }
  }
}
```

This is implemented in `backend/src/controllers/task.controller.js` (`withLinks`). It's a
genuinely useful, low-cost addition — a client could discover available actions on a task
instead of hard-coding URL templates.

**This alone does not make the API Level 3**, for two honest reasons:

1. **Coverage is partial.** Only the `tasks` resource has links. `/api/auth/login` and
   `/api/auth/me` don't advertise `_links` to the next available actions (e.g. "now that
   you're logged in, here's where tasks live").
2. **No affordance-driven client.** True Level 3 means a client only needs the entry point
   URI and follows links from there — it never hard-codes `/api/tasks/:id`. This project's
   React frontend and CLI both still construct URLs directly (see `frontend/src/api/taskApi.js`,
   `cli/index.js`), so the ecosystem around the API isn't actually driven by hypermedia yet,
   even though the data is present.

### To reach full Level 3, the remaining work would be:

- Add a single documented entry point (e.g. `GET /api/`) returning links to `tasks` and `auth`.
- Add `_links` to the login response (e.g. a `tasks` link) and to the task **collection**
  response for pagination (`next`/`prev`/`first`/`last` links based on `meta.page`).
- Make state transitions conditional and advertised — e.g. only include a `complete` link
  when `status !== 'completed'`, and a `reopen` link only when it is — so the API itself
  communicates which transitions are currently legal.
- Update the frontend/CLI to follow `_links` instead of building URLs from `id`, so the API
  could change its URI scheme without breaking clients.

## Summary

| Level | Status |
|-------|--------|
| 0 (POX/RPC) | Superseded — not how this API is built |
| 1 (Resources) | ✅ Satisfied |
| 2 (HTTP Verbs + status codes) | ✅ **Satisfied — target level reached** |
| 3 (HATEOAS) | ⚠️ Partial (task resource has links; not a fully hypermedia-driven API) |
