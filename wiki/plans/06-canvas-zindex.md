# Plan 06 — Canvas Z-Index Layering

> Depends on: `05-canvas-drag-fix` (the `useNodesState` sync effect is the right place to also pass `zIndex`)  
> Scope: shared types + frontend (`packages/shared`, `packages/frontend`)  
> Parallel-safe with: nothing blocked

---

## Problem

All canvas nodes share the same stacking order. There is no way to send a rectangle behind a widget card, or bring a label in front of another element. This makes rectangles (which are intended as background grouping containers) always render on top of widgets placed inside them.

---

## Approach

React Flow respects a `zIndex` property on each node object — no custom CSS is needed for the stacking itself. The work is:

1. **Persist `zIndex`** as part of `ElementStyle` (it is already saved/loaded as a whole object, so no schema migration is needed).
2. **Apply smart defaults** so rectangles are behind widgets out of the box without any user action.
3. **Expose layer controls** in the ConfigPanel so users can explicitly reorder elements.

---

## File Changes

### `packages/shared/types.ts`

Add `zIndex` to `ElementStyle`:

```ts
export interface ElementStyle {
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  fontSize?: number;
  zIndex?: number;   // ← new
}
```

No changes needed to `ClientMessage` — `style` is already included in `widget:update` payload.

---

### `packages/backend/src/infrastructure/mongodb/mongo-widget-repository.ts`

No changes needed. `style` is already stored and loaded as a whole object; `zIndex` will round-trip automatically.

---

### `packages/frontend/src/components/Canvas.tsx`

In the `useEffect` that maps widgets to React Flow nodes (added in plan `05`), pass `zIndex` with sensible defaults:

```ts
zIndex: w.style?.zIndex ?? (w.type === 'rectangle' ? 0 : 1),
```

- **Rectangles** default to `0` — naturally behind everything else.
- **Labels and widgets** default to `1` — naturally in front of rectangles.

This means the canvas already behaves correctly for the common case (rectangle as background container) without the user needing to touch any setting.

---

### `packages/frontend/src/components/ConfigPanel.tsx`

Add a **Layer** control row that appears for all element types. Place it just above the action buttons.

#### State
```ts
// derive from the live widget store — no new persisted state needed
const widgets = useWidgetStore((state) => state.widgets);
const allZIndexes = Array.from(widgets.values()).map(w => w.style?.zIndex ?? 1);
const maxZ = Math.max(...allZIndexes, 1);
const minZ = Math.min(...allZIndexes, 0);
const currentZ = widget.style?.zIndex ?? (widget.type === 'rectangle' ? 0 : 1);
```

#### UI
```tsx
<div className="form-group">
  <label className="form-label">
    Layer <span className="layer-badge">z{currentZ}</span>
  </label>
  <div className="layer-controls">
    <button
      type="button"
      className="layer-btn"
      onClick={() => send({ type: 'widget:update', id: widget._id,
        payload: { style: { ...widget.style, zIndex: maxZ + 1 } } })}
    >
      ↑ Bring to Front
    </button>
    <button
      type="button"
      className="layer-btn"
      onClick={() => send({ type: 'widget:update', id: widget._id,
        payload: { style: { ...widget.style, zIndex: Math.max(0, minZ - 1) } } })}
    >
      ↓ Send to Back
    </button>
  </div>
</div>
```

The buttons send `widget:update` directly (no local form state needed — the change is instant and the server broadcasts the updated node back).

---

### `packages/frontend/src/styles/index.css`

Add styles for the layer control:

```css
.layer-badge {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  background: #F3F4F6;
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 6px;
  font-family: monospace;
}

.layer-controls {
  display: flex;
  gap: 8px;
}

.layer-btn {
  flex: 1;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

.layer-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}
```

---

## Verification

1. Drop a **Rectangle** onto the canvas, then drop a **Status Widget** inside it.
2. Verify the Widget renders on top of the Rectangle by default (no user action needed).
3. Double-click the Widget → ConfigPanel opens → verify the **Layer** row shows `z1`.
4. Click **↓ Send to Back** → verify the Widget is now behind the Rectangle. Badge updates to `z0`.
5. Click **↑ Bring to Front** → Widget is in front again. Badge updates to `z2`.
6. Refresh the page — verify the z-index ordering persists.
7. Repeat for Label nodes.
