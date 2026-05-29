# Mission Control — Gemini Guidelines

## App Layout

The codebase is organized as a monorepo under `app/` using Bun workspaces:

* **[`app/packages/shared/`](file:///home/felix/Projects/mission-control/app/packages/shared/)**: Shared domain models and TypeScript definitions, including WebSocket message types (`types.ts`).
* **[`app/packages/frontend/`](file:///home/felix/Projects/mission-control/app/packages/frontend/)**: React application using Vite and React Flow for visual diagramming. Local state is managed with Zustand (`useWidgetStore.ts`).
* **[`app/packages/backend/`](file:///home/felix/Projects/mission-control/app/packages/backend/)**: Node.js/Bun server running widgets. Handles MongoDB persistence, Agenda cron scheduling, and Bun-native WebSocket communication (`index.ts`).

Wiki and development plans are stored in the root [`wiki/`](file:///home/felix/Projects/mission-control/wiki/) directory.

## Architecture Rules

Before writing or reviewing any backend code, consult the **Rules Checklist** in the wiki:

📄 [`wiki/architecture.md#rules-checklist`](./wiki/architecture.md#rules-checklist)

Run every item in that checklist against any new file or pull request that touches `app/packages/backend/src/`.

## Build & Test Guide

All package builds and tests use Bun.

### Working with Packages Individually

You can interact with packages either from the root [app](file:///home/felix/Projects/mission-control/app) directory using workspace filters, or by changing directories.

#### 1. Backend ([app/packages/backend](file:///home/felix/Projects/mission-control/app/packages/backend))
* **Test**: `bun test --filter @mc/backend` *(or `cd app/packages/backend && bun test`)*

#### 2. Frontend ([app/packages/frontend](file:///home/felix/Projects/mission-control/app/packages/frontend))
* **Build**: `bun run --filter @mc/frontend build` *(or `cd app/packages/frontend && bun run build`)*

#### 3. Shared ([app/packages/shared](file:///home/felix/Projects/mission-control/app/packages/shared))
* **Build/Test**: Not required. It exports TypeScript definitions directly from `types.ts`, which are resolved dynamically by Bun workspaces.

---

### Running All Tests

To run all workspace unit tests:
```bash
cd app
bun test
```

## Git & Workflow Guidelines

* **Never commit without human approval**: Do not execute Git commits automatically. Always request explicit confirmation before staging or committing changes.


