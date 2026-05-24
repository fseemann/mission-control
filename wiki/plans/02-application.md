# Plan 02 — Backend Application Layer

> Depends on: `00-shared` (types must be importable)  
> Unblocks: `03-api`  
> Parallel-safe with: `01-infrastructure`, `04-frontend`

---

## Scope

Implement the **application layer** of `packages/backend`. This layer contains:

1. **Repository interfaces** (ports) — what the application needs from persistence, without caring how it's stored.
2. **`RunnerService`** — executes widget scripts in isolated Bun child processes.
3. **`SchedulerService`** — manages Agenda cron jobs for widgets that have a `cronExpression`.

The application layer is **self-contained**: it never imports from `api/` and never imports concrete infrastructure classes. All infrastructure dependencies are injected via constructors.

See [`wiki/architecture.md`](../architecture.md) for the full layer rules.

---

## Layer position

```
         api/            ← plan 03
          │
          ▼
     application/        ← THIS PLAN
          │
          ▼
   infrastructure/        ← plan 01
```

---

## File Inventory

```
app/packages/backend/src/
└── application/
    ├── widget-repository.ts   ← IWidgetRepository interface
    ├── edge-repository.ts     ← IEdgeRepository interface
    ├── runner-service.ts
    └── scheduler-service.ts
```

---

## [NEW] `src/application/widget-repository.ts`

TypeScript interface — the **port** for widget persistence. No implementation here.

```ts
import type { Widget, ExecutionResult, WidgetStatus } from '@mc/shared';

export type NewWidget = Pick<Widget,
  'label' | 'code' | 'envVars' | 'timeoutMs' | 'position'
> & { cronExpression?: string };

export interface IWidgetRepository {
  findAll(): Promise<Widget[]>;
  findById(id: string): Promise<Widget | null>;
  create(data: NewWidget): Promise<Widget>;
  update(id: string, patch: Partial<Widget>): Promise<Widget>;
  delete(id: string): Promise<void>;
  saveResult(
    id: string,
    result: ExecutionResult,
    status: WidgetStatus
  ): Promise<void>;
}
```

All application services and the WS handler type their `widgetRepo` parameter against this interface. The concrete implementation (`MongoWidgetRepository`) lives in `infrastructure/`.

---

## [NEW] `src/application/edge-repository.ts`

TypeScript interface — the **port** for edge persistence.

```ts
import type { Edge } from '@mc/shared';

export interface IEdgeRepository {
  findAll(): Promise<Edge[]>;
  create(edge: Edge): Promise<Edge>;
  delete(id: string): Promise<void>;
}
```

---

## [NEW] `src/application/runner-service.ts`

The script execution engine.

### Constructor

```ts
constructor(
  private widgetRepo: IWidgetRepository,
  private notify: (msg: ServerMessage) => void,
)
```

`notify` is an injected callback wired by `index.ts` to `WsHandler.broadcast`. `RunnerService` never imports from `api/`.

### `run(widgetId: string): Promise<void>`

1. Calls `widgetRepo.findById(widgetId)`. If not found, logs and returns.
2. Builds a `{ KEY: VALUE }` env object from the widget's plaintext `envVars`.
3. Writes the widget's `.code` wrapped in a runner harness to a temp file: `/tmp/mc-<widgetId>-<timestamp>.ts`.

   The harness looks like:
   ```ts
   // auto-generated runner harness
   import { run } from '<userCodePath>';
   const env = JSON.parse(process.env.__MC_ENV__!);
   const result = await run(env);
   process.stdout.write(JSON.stringify(result));
   ```

4. Spawns `bun run <tempfile>` with `__MC_ENV__` set to the JSON-serialised env object. Hard-kills the process via `AbortController` after `widget.timeoutMs` ms.
5. Collects stdout. Attempts `JSON.parse`. Maps result:
   - Parsed `{ status: 'ok'|'degraded'|'fail', ... }` → `WidgetStatus` of same name.
   - Process killed by abort signal → `WidgetStatus = 'timeout'`.
   - Any other error (parse failure, non-zero exit) → `WidgetStatus = 'crash'`, `runnerError` set.
6. Calls `widgetRepo.saveResult(widgetId, result, status)`.
7. Calls `this.notify({ type: 'widget:result', widgetId, result, status })`.
8. Deletes the temp file.

### Script contract

User scripts must export an async `run` function:

```ts
export async function run(env: Record<string, string>) {
  return {
    status: 'ok' as const,   // 'ok' | 'degraded' | 'fail'
    message: 'Widget is healthy',
    output: { timestamp: new Date().toISOString() },
  };
}
```

Any unhandled exception thrown inside `run` is caught by the harness and exits with a non-zero code, which the runner maps to `crash`.

### Default script template

Pre-populated in `code` when a new widget is created:

```ts
// Import from ESM CDN — no npm install needed
// e.g. import axios from 'https://esm.sh/axios';

export async function run(env: Record<string, string>) {
  // env contains your decrypted KEY=VALUE pairs

  // Return one of: 'ok' | 'degraded' | 'fail'
  return {
    status: 'ok' as const,
    message: 'Widget is healthy',
    output: { timestamp: new Date().toISOString() },
  };
}
```

---

## [NEW] `src/application/scheduler-service.ts`

Cron scheduling logic. Wraps the Agenda instance (infrastructure) with widget-aware business rules.

### Constructor

```ts
constructor(
  private agenda: Agenda,
  private widgetRepo: IWidgetRepository,
  private runner: RunnerService,
)
```

### Methods

- **`start(): Promise<void>`** — calls `widgetRepo.findAll()`, then calls `schedule(widget)` for each. Starts the Agenda queue. Called once from `index.ts` at boot.
- **`schedule(widget: Widget): Promise<void>`** — if `widget.cronExpression` is set, upserts a named Agenda job (`mc-<widget._id>`) with that expression. If `cronExpression` is absent or empty, calls `cancel(widget._id)` to ensure no stale job remains.
- **`cancel(widgetId: string): Promise<void>`** — cancels and removes the Agenda job named `mc-<widgetId>` if it exists. No-op if none exists.

Each Agenda job handler calls `this.runner.run(widgetId)` — application calling application, no `api/` import involved.

---

## Verification

- `bun test src/application/runner-service` — unit tests using an in-memory `IWidgetRepository` stub:
  - Happy path: script returns `{ status: 'ok' }` → `notify` called with `widget:result` status `ok`.
  - Timeout path: script sleeps longer than `timeoutMs` → status is `timeout`.
  - Crash path: script throws → status is `crash`.
- `bun test src/application/scheduler-service` — verify `schedule` registers a job and `cancel` removes it using an Agenda in-memory mock.
