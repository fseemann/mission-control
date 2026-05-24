# Backend Architecture

The backend (`app/packages/backend`) follows a strict **three-layer architecture**. Every file belongs to exactly one layer. Dependencies flow in one direction only — downward.

```
┌─────────────────────────────────────────┐
│                  api/                   │  inbound adapters
│         (WebSocket handler)             │
└───────────────────┬─────────────────────┘
                    │ calls
                    ▼
┌─────────────────────────────────────────┐
│             application/                │  business logic
│   (services, repository interfaces)     │
└───────────────────┬─────────────────────┘
                    │ calls (via injection)
                    ▼
┌─────────────────────────────────────────┐
│            infrastructure/              │  external drivers
│    (MongoDB, crypto, Agenda client)     │
└─────────────────────────────────────────┘
```

---

## Layer Rules

### `infrastructure/`

> External drivers and adapters. The lowest layer.

- **Never imports from `application/` or `api/`.**
- Contains: MongoDB client, typed collection accessors, concrete repository implementations (`MongoWidgetRepository`, `MongoEdgeRepository`), crypto functions, and the raw Agenda client factory.
- Infrastructure code has no knowledge of business concepts beyond what's needed to persist or retrieve data.

### `application/`

> Business logic and domain interfaces. Self-contained.

- **Never imports from `api/`.**
- **Never imports concrete infrastructure types directly.** It depends only on its own interfaces (`IWidgetRepository`, `IEdgeRepository`), which are injected at runtime by the composition root.
- Contains: repository interfaces (ports), `RunnerService`, `SchedulerService`.
- If the application layer needs to notify the outside world (e.g. broadcast a WebSocket message), it does so via an **injected callback** — it never imports from `api/`.

### `api/`

> Inbound adapters. The highest layer.

- **Only imports from `application/`.** Never imports from `infrastructure/` directly.
- Contains: `WsHandler` — the WebSocket message router.
- Receives typed `ClientMessage` frames, delegates all business logic to application-layer services and repository interfaces, then sends typed `ServerMessage` responses.

---

## Composition Root (`src/index.ts`)

`index.ts` is the **only file allowed to import from all layers**. Its sole responsibility is wiring — no business logic lives here.

Startup order:

1. Create infrastructure adapters (MongoDB client, crypto, Agenda client).
2. Construct concrete repository implementations (`MongoWidgetRepository`, `MongoEdgeRepository`) with adapters injected.
3. Construct application services (`RunnerService`, `SchedulerService`) typed against repository **interfaces**.
4. Construct `WsHandler` with application services injected; wire `handler.broadcast` as the `notify` callback into `RunnerService`.
5. Start the Bun WebSocket server.

---

## Dependency Inversion

Repository interfaces (ports) are defined in `application/` and implemented in `infrastructure/mongodb/`.

```
application/widget-repository.ts     → IWidgetRepository  (interface / port)
infrastructure/mongodb/mongo-widget-repository.ts  → MongoWidgetRepository  (adapter)
```

This means:
- Application code can be unit-tested by injecting an in-memory stub — no MongoDB required.
- The storage backend can be swapped (e.g. SQLite, Postgres) without touching any application or api code.

---

## Directory Reference

```
src/
├── index.ts                                    ← composition root (imports all layers)
│
├── infrastructure/
│   ├── mongodb/
│   │   ├── client.ts                           ← getDb()
│   │   ├── collections.ts                      ← widgetsCol() / edgesCol()
│   │   ├── mongo-widget-repository.ts          ← implements IWidgetRepository
│   │   └── mongo-edge-repository.ts            ← implements IEdgeRepository
│   ├── crypto/
│   │   └── index.ts                            ← encrypt() / decrypt()
│   └── agenda/
│       └── client.ts                           ← raw Agenda instance factory
│
├── application/
│   ├── widget-repository.ts                    ← IWidgetRepository (interface)
│   ├── edge-repository.ts                      ← IEdgeRepository (interface)
│   ├── runner-service.ts                       ← script execution engine
│   └── scheduler-service.ts                    ← cron scheduling logic
│
└── api/
    └── ws/
        └── handler.ts                          ← WS message router
```

---

## Rules Checklist

Use this when reviewing a pull request or adding a new file:

- [ ] Does the file import from a **higher** layer? → **Not allowed.**
- [ ] Does `api/` import from `infrastructure/` directly? → **Not allowed.**
- [ ] Does `application/` import from `api/`? → **Not allowed.**
- [ ] Does `application/` import a **concrete** infrastructure class (e.g. `MongoWidgetRepository`)? → **Not allowed.** Use the interface.
- [ ] Is a new external driver (DB, queue, HTTP client) being added? → It belongs in `infrastructure/`.
- [ ] Is new business logic being added? → It belongs in `application/`.
- [ ] Is a new inbound transport (REST, gRPC, CLI) being added? → It belongs in `api/`.
- [ ] Does a new service need to emit a side-effect outside its layer? → Use an **injected callback**, not a direct import.
