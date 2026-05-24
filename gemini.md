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
