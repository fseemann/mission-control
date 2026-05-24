# Milestone Node

A new first-class canvas element: an overarching goal with two independent signals —
**completion** (manual checklist) and **health** (live widget status).

---

## Concept

The Milestone node has two orthogonal axes:

| Signal | Source | What it drives |
|---|---|---|
| **Completion** | Manual checkboxes | Progress bar (e.g. 3/5 done = 60%) |
| **Health** | Connected widget statuses | A status badge in the header |

The progress bar **only** counts checked items. Widgets never add to it — instead, if any
connected widget is in `fail`, `degraded`, `timeout`, or `crash`, the milestone header badge
switches from `● ACTIVE` to `⚠ AT RISK` or `✕ FAILED`. You can achieve 100% completion
but still see your monitoring says something is wrong.

### Visual layout

```
╔═══════════════════════════════════════════╗
║  🎯  v1.0 Launch               ⚠ AT RISK ║
║  [████████████░░░░░░] 3 / 5 complete      ║
╠═══════════════════════════════════════════╣
║  ✅ Set up CI/CD                          ║
║  ✅ Write docs                            ║
║  ✅ Beta testing                          ║
║  ☐  Fix auth bug                          ║
║  ☐  Deploy to prod                        ║
╚═══════════════════════════════════════════╝
```

The header bar has a distinct indigo/purple gradient to visually differentiate milestones
from other node types. The health badge updates in real-time as widget statuses change via
WebSocket. Checklist items are managed exclusively via the ConfigPanel (not inline on the
node). Items are drag-sortable in the ConfigPanel.

---

## Data model changes

### `@mc/shared` — `types.ts`

```ts
// New interface
export interface MilestoneItem {
  id: string;       // nanoid / uuid
  text: string;
  checked: boolean;
}

// ElementType extended
export type ElementType = 'widget' | 'label' | 'rectangle' | 'markdown' | 'milestone';

// Widget extended
export interface Widget {
  // ... existing fields ...
  milestoneItems?: MilestoneItem[];  // only populated when type === 'milestone'
}
```

Also extend the `ClientMessage` picks for `widget:create` and `widget:update` to include
`milestoneItems`.

---

## Backend changes

### `mongo-widget-repository.ts`

- Add `'milestoneItems'` to the `fields` array in `update()` so it gets persisted via `$set`
- Map `milestoneItems: doc.milestoneItems` in `mapDocToWidget()`
- Pass `milestoneItems: data.milestoneItems` through in `create()`

No schema migration needed — MongoDB is schemaless; the field is absent for older documents
and the frontend treats `undefined` as `[]`.

---

## Frontend changes

### New: `MilestoneNode.tsx`

React Flow node component with three visual sections:

**Header bar**
- Gradient background (indigo → purple)
- Title from `element.label`
- Health badge (computed at render time from store — see below)

**Progress bar**
- `checked / total` from `element.milestoneItems`
- Animated fill, shows `N / M complete` label

**Checklist**
- Read-only on the canvas (no inline editing)
- Each item: checkbox + text label
- Toggling a checkbox sends `widget:update` with the full updated `milestoneItems` array
  immediately (no debounce — toggling must feel instant)

**Resizer**
- Uses `NodeResizer` (min 280 × 200)

**Handles**
- No source handle — milestones cannot originate edges
- Target handle only — widgets wire *into* the milestone

**Double-click**
- Opens ConfigPanel (same pattern as other nodes)

### Health badge logic

Computed purely on the frontend from existing store state — no new backend messages:

```ts
const edges = useWidgetStore(state => state.edges);
const widgets = useWidgetStore(state => state.widgets);

const incomingWidgetIds = edges
  .filter(e => e.target === id)
  .map(e => e.source);

const unhealthyStatuses: WidgetStatus[] = ['fail', 'degraded', 'timeout', 'crash'];

const worstStatus = incomingWidgetIds.reduce<'active' | 'at-risk' | 'failed'>((acc, wid) => {
  const w = widgets.get(wid);
  if (!w) return acc;
  if (w.status === 'fail' || w.status === 'crash') return 'failed';
  if (unhealthyStatuses.includes(w.status) && acc === 'active') return 'at-risk';
  return acc;
}, 'active');
```

Badge appearance:
- `active` → green pill, `● ACTIVE`
- `at-risk` → amber pill, `⚠ AT RISK`
- `failed` → red pill, `✕ FAILED`

---

### Modify: `Canvas.tsx`

- Register `milestoneNode` in `nodeTypes`
- Import `MilestoneNode`
- Add `milestone` branch in the widget→node type mapper
- Add default `width: 320, height: 240` for milestone in the style block
- Add `milestoneNode` drop handler in `onDrop` (creates widget with type `'milestone'` and
  empty `milestoneItems: []`)
- Update `onConnect` edge rule:

```ts
// Allow: source is a 'widget' status node AND target is a 'milestone'
// Allow: neither is a 'widget' (existing behaviour)
// Block: everything else involving 'widget' nodes
const sourceIsMilestone = sourceWidget?.type === 'milestone';
const targetIsMilestone = targetWidget?.type === 'milestone';
const sourceIsStatusWidget = !sourceWidget?.type || sourceWidget.type === 'widget';
const targetIsStatusWidget = !targetWidget?.type || targetWidget.type === 'widget';

if (sourceIsStatusWidget && targetIsMilestone) {
  // ✅ allowed — widget feeds into milestone health
} else if (sourceIsStatusWidget || targetIsStatusWidget) {
  // ❌ blocked — status widgets can't connect to non-milestone targets
  return;
}
```

---

### Modify: `Sidebar.tsx`

Add a drag item for `milestoneNode` with a `🎯` icon and "Milestone" label, placed near the
top of the element list.

---

### Modify: `ConfigPanel.tsx`

Add `isMilestone` flag alongside existing `isWidget`, `isLabel`, etc.

**Milestone config section:**
- **Title field** — text input mapped to `label`
- **Checklist editor** — drag-sortable list of items:
  - Each row: drag handle (`⠿`) + text input + delete button
  - Uses HTML5 drag-and-drop or a lightweight library (e.g. `@dnd-kit/sortable`)
  - "＋ Add item" button at the bottom, appends a new blank row
- **Dimensions** — width / height inputs (same as other resizable nodes)
- **Save** — sends `{ label, milestoneItems, style }` via `widget:update`

No cron, timeout, env vars, or code fields are shown for milestone nodes.

---

## Edge connection summary

| Source type | Target type | Allowed? | Reason |
|---|---|---|---|
| `widget` | `milestone` | ✅ | feeds health badge |
| `widget` | anything else | ❌ | status widgets stay isolated |
| anything | `widget` | ❌ | status widgets stay isolated |
| non-widget | non-widget | ✅ | existing behaviour unchanged |

---

## Files changed

| File | Change |
|---|---|
| `packages/shared/types.ts` | Add `MilestoneItem`, extend `ElementType` and `Widget`, extend WS message picks |
| `packages/backend/src/infrastructure/mongodb/mongo-widget-repository.ts` | Persist `milestoneItems` |
| `packages/frontend/src/components/MilestoneNode.tsx` | **New** |
| `packages/frontend/src/components/Canvas.tsx` | Register node type, drop handler, edge rules |
| `packages/frontend/src/components/Sidebar.tsx` | Add drag item |
| `packages/frontend/src/components/ConfigPanel.tsx` | Add milestone config section with drag-sortable checklist |

---

## Verification

```bash
# Full build
cd /home/felix/Projects/mission-control/app && bun run --filter '*' build
```

Manual smoke test:
1. Drag a Milestone onto the canvas → header bar + empty checklist renders
2. Double-click → ConfigPanel opens with title field and checklist editor
3. Add items, drag-reorder them, save → items persist after page reload
4. Check/uncheck items on the canvas → progress bar updates live
5. Draw an edge from a status widget to the milestone → health badge reflects widget status
6. Badge shows `AT RISK` / `FAILED` when widget is unhealthy; returns to `ACTIVE` when ok
