# Plan 04 — Frontend

> Depends on: `00-shared` (types and WS protocol must exist)  
> Unblocks: nothing (final frontend plan)  
> Parallel-safe with: `01-infrastructure`, `02-application`, `03-api`

---

## Scope

Build the complete React + React Flow frontend in `packages/frontend`. The frontend communicates with the backend **exclusively over WebSocket** — there are no HTTP/REST calls.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite |
| Canvas | React Flow |
| State | Zustand |
| Fonts | Inter (Google Fonts) |
| Code editor | Plain `<textarea>` |
| Styling | Vanilla CSS (design tokens in `index.css`) |

---

## File Inventory

```
app/packages/frontend/
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── styles/
    │   └── index.css
    ├── store/
    │   └── useWidgetStore.ts
    └── components/
        ├── Canvas.tsx
        ├── WidgetNode.tsx
        ├── ConfigPanel.tsx
        └── Sidebar.tsx
```

---

## [NEW] `package.json`

```json
{
  "name": "@mc/frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@mc/shared": "workspace:*",
    "react": "^18",
    "react-dom": "^18",
    "reactflow": "^11",
    "zustand": "^4"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "vite": "^5",
    "@vitejs/plugin-react": "^4"
  }
}
```

---

## [NEW] `vite.config.ts`

Configure the WS proxy so the frontend dev server forwards `/ws` to the backend:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
```

---

## [NEW] `src/styles/index.css`

Global design tokens and resets. Light mode, Linear/Vercel-style aesthetic.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

:root {
  --font:          'Inter', sans-serif;

  /* Canvas */
  --bg-canvas:     #F7F8FA;

  /* Cards */
  --bg-card:       #FFFFFF;
  --border-card:   1px solid #E5E7EB;
  --radius-card:   10px;
  --shadow-card:   0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);

  /* Accent */
  --accent:        #6366F1;
  --accent-hover:  #4F46E5;

  /* Status colours */
  --status-ok:       #22C55E;
  --status-degraded: #F59E0B;
  --status-fail:     #EF4444;
  --status-timeout:  #F97316;
  --status-running:  #6366F1;
  --status-idle:     #94A3B8;
  --status-crash:    #F97316;

  /* Text */
  --text-primary:   #111827;
  --text-secondary: #6B7280;
  --text-muted:     #9CA3AF;

  --transition: 150ms ease;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font);
  background: var(--bg-canvas);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

---

## [NEW] `src/store/useWidgetStore.ts`

Zustand store. Single source of truth for all canvas state. All backend communication goes through this store.

### State shape

```ts
interface WidgetStore {
  widgets: Map<string, Widget>;
  edges: Edge[];
  selectedWidgetId: string | null;

  // Actions
  send: (msg: ClientMessage) => void;
  selectWidget: (id: string | null) => void;
}
```

### WebSocket lifecycle (called from `main.tsx` on mount)

1. Opens `WebSocket` to `/ws` (proxied to `localhost:3001` in dev).
2. On `open`: sends `{ type: 'widget:list' }` and `{ type: 'edge:list' }` to hydrate initial state.
3. On `message`: dispatches each `ServerMessage` frame:

| `ServerMessage.type` | Store update |
|---|---|
| `widget:data` | Replace `widgets` map |
| `edge:data` | Replace `edges` array |
| `widget:created` | Insert into `widgets` map |
| `widget:updated` | Update entry in `widgets` map |
| `widget:deleted` | Remove from `widgets` map |
| `edge:created` | Append to `edges` |
| `edge:deleted` | Remove from `edges` by `id` |
| `widget:result` | Update `widgets[id].status` and `lastResult` |

4. `send(msg)` serialises to JSON and calls `ws.send()`.

---

## [NEW] `src/components/Canvas.tsx`

Full-viewport `<ReactFlow>` component. The main application view.

### React Flow config

- `nodeTypes={{ widgetNode: WidgetNode }}` — custom node renderer.
- `defaultEdgeOptions={{ animated: false }}` — plain edges.
- Background: `<Background variant="dots" color="#E5E7EB" />`.
- `<MiniMap />` bottom-right.
- `<Controls />` top-right.

### Node/edge data binding

- Derives `nodes` array from `store.widgets` (maps `Widget` → React Flow `Node`).
- Uses `store.edges` directly as React Flow `Edge[]`.

### Persistence callbacks

- `onNodeDragStop` → `store.send({ type: 'widget:update', id, payload: { position } })`.
- `onConnect` → `store.send({ type: 'edge:create', payload: { id: nanoid(), ...connection } })`.
- `onEdgesDelete` → for each deleted edge: `store.send({ type: 'edge:delete', id })`.

### Toolbar

A small top-left bar with an **"+ Add Widget"** button. Clicking it sends `widget:create` with default values and a centred position. (The Sidebar handles drag-to-canvas for V1.)

---

## [NEW] `src/components/WidgetNode.tsx`

Custom React Flow node card. Receives a `Widget` as `data`.

### Visual layout

```
┌──────────────────────────────────┐
│ ● status dot  │ Label            │
│               │ Last run: 2m ago │
└──────────────────────────────────┘
```

### Status dot colours

| `WidgetStatus` | Colour token |
|---|---|
| `ok` | `--status-ok` |
| `degraded` | `--status-degraded` |
| `fail` | `--status-fail` |
| `timeout` / `crash` | `--status-timeout` |
| `running` | `--status-running` + pulse animation |
| `idle` | `--status-idle` |

The dot is a `8px × 8px` circle. When `status === 'running'`, apply a CSS `@keyframes pulse` scale animation.

### Border-left accent

The card's `border-left: 3px solid` uses the same colour as the status dot.

### Interactions

- **Double-click** anywhere on the card → `store.selectWidget(id)` (opens `ConfigPanel`).
- **Drag** is handled natively by React Flow.

### React Flow handles

- `<Handle type="source" position={Position.Right} />`
- `<Handle type="target" position={Position.Left} />`

---

## [NEW] `src/components/ConfigPanel.tsx`

Slide-out right panel. Visible when `store.selectedWidgetId !== null`.

### Animation

```css
.config-panel {
  transform: translateX(100%);
  transition: transform var(--transition);
}
.config-panel.open {
  transform: translateX(0);
}
```

### Form fields

| Field | Type | Notes |
|---|---|---|
| Label | `<input type="text">` | |
| Cron expression | `<input type="text">` | Optional. Live humanised hint below (e.g. "every 5 minutes"). Clear button sets to `undefined`. |
| Timeout (ms) | `<input type="number">` | Default `10000`. |
| Code | `<textarea rows="20">` | Monospace font. Pre-filled with default script template on first open. |
| Env vars | Table of `KEY` / `VALUE` pairs | `VALUE` is `type="password"`. "Add row" and row-delete buttons. |

### Buttons

- **Save** → `store.send({ type: 'widget:update', id, payload: { ...formState } })`.
- **Run Now** → `store.send({ type: 'widget:run', id })`. Immediately sets the local dot to `running`.
- **×** (close) → `store.selectWidget(null)`.

### Last Result section

Collapsible `<details>` element at the bottom. Shows:
- `status` badge (coloured pill)
- `message` string
- `durationMs` formatted as `${n}ms`
- `output` rendered as a `<pre>` JSON block

---

## [NEW] `src/components/Sidebar.tsx`

Left sidebar (collapsible). For V1 contains one draggable widget tile: **"Status Widget"**.

Drag behaviour: uses React Flow's `onDrop` / `onDragOver` pattern — on drop, reads the canvas position from the drop event and sends `widget:create`.

---

## Verification

1. `bun run dev` starts both frontend and backend.
2. Open `http://localhost:5173`.
3. Drag "Status Widget" from sidebar onto canvas → card appears.
4. Double-click card → config panel slides in.
5. Leave cron blank → click "Run Now" → dot turns 🟢 within a few seconds.
6. Set cron to `* * * * *`, wait → dot refreshes automatically each minute.
7. Edit script → `return { status: 'degraded', message: 'partial outage' }` → dot turns 🟡.
8. Edit script → `return { status: 'fail', message: 'down' }` → dot turns 🔴.
9. Set `timeoutMs` to `500`, write `await Bun.sleep(2000)` → dot turns 🟠 (`timeout`).
10. Add env var `TARGET_URL=https://example.com`, use it in script → verify it arrives.
11. Draw an edge between two nodes, refresh page → edge persists.
