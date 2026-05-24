# Plan 00 — Shared Foundation

**Prerequisite for all other plans. Start here.**

> Depends on: nothing  
> Unblocks: `01-infrastructure`, `02-application`, `04-frontend` (all in parallel)

---

## Scope

Scaffold the monorepo and write the shared TypeScript types and WebSocket message protocol that every other package depends on.

---

## Monorepo Structure

```
mission-control/
├── app/                  ← Bun workspace root
│   ├── package.json      ← workspace manifest
│   └── packages/
│       ├── shared/       ← this plan
│       ├── frontend/     ← plan 04
│       └── backend/      ← plans 01 – 03
└── wiki/                 ← docs (already exists)
```

### [NEW] `app/package.json`

Bun workspace root. Points at all three packages and defines a top-level `dev` script that starts frontend and backend in parallel.

```json
{
  "name": "mission-control",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev"
  }
}
```

### [NEW] `app/packages/shared/package.json`

```json
{
  "name": "@mc/shared",
  "version": "0.0.1",
  "module": "types.ts",
  "types": "types.ts"
}
```

---

## [NEW] `app/packages/shared/types.ts`

The single source of truth for all domain types and the full WebSocket message protocol. Both `@mc/backend` and `@mc/frontend` import from here.

```ts
// ── Domain status types ────────────────────────────────────────────────────

/** Status returned by the widget's run() function. */
export type RunStatus = 'ok' | 'degraded' | 'fail';

/**
 * Node status on the canvas.
 * Script-level: ok | degraded | fail
 * Runner-level: idle | running | timeout | crash
 */
export type WidgetStatus =
  | 'idle'
  | 'running'
  | 'ok'
  | 'degraded'
  | 'fail'
  | 'timeout'
  | 'crash';

// ── Domain models ──────────────────────────────────────────────────────────

export interface EnvVar {
  key: string;
  value: string;
}

export interface Edge {
  id: string;
  source: string;   // widget _id
  target: string;   // widget _id
  label?: string;
}

export interface Widget {
  _id: string;
  label: string;
  code: string;              // raw TS source stored as string
  envVars: EnvVar[];         // plaintext keys; values are encrypted at rest
  cronExpression?: string;   // e.g. "*/5 * * * *" — omit for manual-run only
  timeoutMs: number;         // default 10 000, user-editable
  position: { x: number; y: number };
  status: WidgetStatus;
  lastResult?: ExecutionResult;
  updatedAt: string;
}

export interface ExecutionResult {
  /** Script-reported outcome. */
  status: RunStatus;
  message?: string;
  output?: unknown;
  durationMs: number;
  ranAt: string;
  /** Populated when the runner itself crashes or times out (not the script). */
  runnerError?: string;
}

// ── WebSocket message protocol ─────────────────────────────────────────────
// All client↔server communication goes through WebSocket.
// There are no REST endpoints.

/** Messages sent from the CLIENT to the SERVER. */
export type ClientMessage =
  // Widgets
  | { type: 'widget:list' }
  | { type: 'widget:create'; payload: Pick<Widget, 'label' | 'code' | 'envVars' | 'timeoutMs' | 'position'> & { cronExpression?: string } }
  | { type: 'widget:update'; id: string; payload: Partial<Pick<Widget, 'label' | 'code' | 'envVars' | 'cronExpression' | 'timeoutMs' | 'position'>> }
  | { type: 'widget:delete'; id: string }
  | { type: 'widget:run';    id: string }
  // Edges
  | { type: 'edge:list' }
  | { type: 'edge:create'; payload: Edge }
  | { type: 'edge:delete'; id: string };

/** Messages sent from the SERVER to the CLIENT. */
export type ServerMessage =
  // Responses to list queries (unicast to requesting client)
  | { type: 'widget:data';    widgets: Widget[] }
  | { type: 'edge:data';      edges: Edge[] }
  // Mutations confirmed (broadcast to all connected clients)
  | { type: 'widget:created'; widget: Widget }
  | { type: 'widget:updated'; widget: Widget }
  | { type: 'widget:deleted'; id: string }
  | { type: 'edge:created';   edge: Edge }
  | { type: 'edge:deleted';   id: string }
  // Runner events (broadcast)
  | { type: 'widget:result';  widgetId: string; result: ExecutionResult; status: WidgetStatus }
  // Errors
  | { type: 'error'; message: string };
```

---

## Verification

- `cd app && bun install` resolves with no errors.
- `import type { Widget } from '@mc/shared'` resolves correctly from both `packages/backend` and `packages/frontend`.
