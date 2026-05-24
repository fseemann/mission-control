# Plan 03 — Backend API Layer & Composition Root

> Depends on: `01-infrastructure` and `02-application` (both must be complete)  
> Unblocks: nothing (final backend plan)  
> Parallel-safe with: `04-frontend`

---

## Scope

Implement the **API layer** of `packages/backend` and the **composition root** (`index.ts`) that wires all layers together.

The API layer contains exactly one file: the WebSocket handler. It imports exclusively from `application/`. It never touches `infrastructure/` directly.

See [`wiki/architecture.md`](../architecture.md) for the full layer rules.

---

## Layer position

```
         api/            ← THIS PLAN
          │
          ▼
     application/        ← plan 02
          │
          ▼
   infrastructure/        ← plan 01
```

---

## File Inventory

```
app/packages/backend/src/
├── index.ts                  ← composition root
└── api/
    └── ws/
        └── handler.ts        ← WS server, message router, broadcast()
```

---

## [NEW] `src/api/ws/handler.ts`

`WsHandler` class. The sole inbound adapter. All transport concerns (WebSocket frames, client tracking) live here and nowhere else.

### Constructor

```ts
constructor(
  private widgetRepo: IWidgetRepository,
  private edgeRepo: IEdgeRepository,
  private runner: RunnerService,
  private scheduler: SchedulerService,
)
```

### Client tracking

Maintains `Set<ServerWebSocket>` of all currently connected clients.

### `broadcast(msg: ServerMessage): void`

Serialises `msg` to JSON and sends it to every connected client. Used directly by `WsHandler` for mutation confirmations, and injected into `RunnerService` as the `notify` callback for async execution results.

### `handleOpen(ws: ServerWebSocket): void`

Adds `ws` to the client set.

### `handleClose(ws: ServerWebSocket): void`

Removes `ws` from the client set.

### `handleMessage(ws: ServerWebSocket, raw: string): void`

Parses the incoming `ClientMessage` and routes it:

| `type` | Action | Response |
|---|---|---|
| `widget:list` | `widgetRepo.findAll()` | `widget:data` — unicast to `ws` |
| `widget:create` | `widgetRepo.create(payload)` → `scheduler.schedule(widget)` | `widget:created` — broadcast |
| `widget:update` | `widgetRepo.update(id, payload)` → `scheduler.schedule(widget)` | `widget:updated` — broadcast |
| `widget:delete` | `widgetRepo.delete(id)` → `scheduler.cancel(id)` | `widget:deleted` — broadcast |
| `widget:run` | `runner.run(id)` (async, fire-and-forget) | _(result arrives later as `widget:result` broadcast via the injected `notify` callback)_ |
| `edge:list` | `edgeRepo.findAll()` | `edge:data` — unicast to `ws` |
| `edge:create` | `edgeRepo.create(payload)` | `edge:created` — broadcast |
| `edge:delete` | `edgeRepo.delete(id)` | `edge:deleted` — broadcast |

Any unhandled exception sends `{ type: 'error', message }` back to the originating client only.

---

## [NEW] `src/index.ts` — Composition Root

The **only** file allowed to import from all layers. Contains wiring logic only — no business logic.

### Startup sequence

```ts
// 1. Infrastructure
const db       = await connectMongo(process.env.MONGODB_URI!);
const crypto   = createCrypto(process.env.ENCRYPTION_KEY!);
const agenda   = createAgenda(process.env.MONGODB_URI!);

// 2. Repositories (infrastructure implements application interfaces)
const widgetRepo: IWidgetRepository = new MongoWidgetRepository(
  db.collection('widgets'), crypto
);
const edgeRepo: IEdgeRepository = new MongoEdgeRepository(
  db.collection('edges')
);

// 3. Application services
//    notify is a placeholder; real broadcast is wired in step 4.
let notify: (msg: ServerMessage) => void = () => {};
const runner    = new RunnerService(widgetRepo, (msg) => notify(msg));
const scheduler = new SchedulerService(agenda, widgetRepo, runner);

// 4. API layer — wire broadcast back into runner
const handler = new WsHandler(widgetRepo, edgeRepo, runner, scheduler);
notify = (msg) => handler.broadcast(msg);

// 5. Start scheduler (registers existing widget cron jobs)
await scheduler.start();

// 6. Start Bun WebSocket server
Bun.serve({
  port: Number(process.env.PORT ?? 3001),
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('Mission Control WS server', { status: 200 });
  },
  websocket: {
    open:    (ws) => handler.handleOpen(ws),
    close:   (ws) => handler.handleClose(ws),
    message: (ws, msg) => handler.handleMessage(ws, msg as string),
  },
});
```

> **Why the `notify` indirection?** `RunnerService` needs to call `broadcast`, but `WsHandler` must be constructed first to produce `broadcast`. The mutable `notify` variable, updated immediately after `WsHandler` is constructed, breaks the circular dependency without coupling the layers.

---

## Execution Flow (end-to-end)

```
[infrastructure/agenda — cron fires]
        │
        ▼  (job calls runner.run, registered by scheduler.start())
[application/scheduler-service]
        │
        ▼
[application/runner-service]
  run(widgetId)
  1. widgetRepo.findById(widgetId)
  2. Write harness + code to /tmp/mc-<id>.ts
  3. Bun.spawn(["bun", "run", tmpFile], { env, signal: AbortController(timeoutMs) })
  4. Collect stdout → parse JSON
  5. widgetRepo.saveResult(id, result, status)
  6. this.notify({ type: 'widget:result', ... })   ← injected callback
        │
        ▼  (notify === handler.broadcast, wired in index.ts)
[api/ws/handler — broadcast → all connected clients]
```

---

## Verification

- Start the server: `cd app && bun run packages/backend/src/index.ts`
- Connect a WebSocket client and send `{ "type": "widget:list" }` → receive `{ "type": "widget:data", "widgets": [] }`.
- Send `widget:create` → receive `widget:created` broadcast.
- Send `widget:run` → receive `widget:result` broadcast within the configured timeout.
- Confirm `widget:result` is received on a **second** connected client (broadcast, not unicast).
