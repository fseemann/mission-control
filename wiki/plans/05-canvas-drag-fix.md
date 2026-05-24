# Plan 05 — Fix Canvas Node Drag Visibility

> Fixes: canvas node invisibility during drag  
> Scope: frontend only (`packages/frontend`)  
> Parallel-safe with: `06-canvas-zindex`

---

## Problem

When dragging a node already on the canvas, the node becomes **invisible** for the duration of the drag. It lands in exactly the right place when released, but there is no visual feedback — you see only the cursor moving over an empty canvas.

---

## Root Cause

This is a **React Flow controlled-mode state propagation bug** in `Canvas.tsx`.

`Canvas.tsx` passes `nodes={flowNodes}` where `flowNodes` is computed from Zustand via `useMemo`, but provides **no `onNodesChange` handler**.

When a drag begins, React Flow internally marks the node as `isDragging: true` and calls `onNodesChange` with `"select"` and `"position"` change events to propagate this state. Without a handler, those changes are silently dropped. React Flow still applies a CSS `transform` to the DOM element during the drag (which is why the node lands in the correct position), but the React component never receives confirmation that the drag started, so the node is rendered in its dragging visual state (reduced opacity / hidden) for the entire gesture.

`useNodesState` and `useEdgesState` are already imported in `Canvas.tsx` but are **entirely unused** — they were clearly intended to solve exactly this.

---

## Fix

Switch `Canvas.tsx` to React Flow's **local-state pattern**, which is the approach recommended by the React Flow docs for components that sync with an external store (Zustand in our case).

### Steps

1. Replace the `useMemo`-derived `flowNodes` / `flowEdges` with `useNodesState` / `useEdgesState` hooks, which maintain local React Flow state.
2. Add a `useEffect` that syncs from Zustand → local React Flow state whenever `widgets` or `edges` change.
3. Pass `onNodesChange` and `onEdgesChange` (the setters from the hooks) to `<ReactFlow>` so it can manage the full drag lifecycle, including `isDragging` state transitions.
4. Keep `onNodeDragStop` as-is — it fires on release and persists the final position to the server.

---

## File Changes

### `packages/frontend/src/components/Canvas.tsx`

- Remove unused `useMemo` import (or keep if used elsewhere).
- Replace:
  ```ts
  const flowNodes = useMemo(() => { ... }, [widgets, selectedWidgetId]);
  const flowEdges = useMemo(() => { ... }, [edges]);
  ```
  with:
  ```ts
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);
  ```
- Add sync effects:
  ```ts
  useEffect(() => {
    setNodes(
      Array.from(widgets.values()).map((w) => {
        const type = w.type === 'label' ? 'labelNode'
          : w.type === 'rectangle' ? 'rectangleNode'
          : 'widgetNode';
        return {
          id: w._id,
          type,
          position: w.position,
          data: w,
          selected: selectedWidgetId === w._id,
          zIndex: w.style?.zIndex ?? (w.type === 'rectangle' ? 0 : 1),
          style: w.type === 'rectangle'
            ? { width: w.style?.width ?? 200, height: w.style?.height ?? 150 }
            : undefined,
        } as FlowNode;
      })
    );
  }, [widgets, selectedWidgetId, setNodes]);

  useEffect(() => {
    setEdges(
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      })) as FlowEdge[]
    );
  }, [edges, setEdges]);
  ```
- Update `<ReactFlow>` props:
  ```tsx
  <ReactFlow
    nodes={nodes}
    edges={rfEdges}
    onNodesChange={onNodesChange}
    onEdgesChange={onEdgesChange}
    ...
  >
  ```

---

## Verification

1. Run `bun run dev` and open `http://localhost:5173`.
2. Drop any node onto the canvas.
3. Click and drag it — verify the node **remains fully visible** and follows the cursor in real-time throughout the drag.
4. Release — verify it lands in the expected position (unchanged behaviour).
5. Drag multiple node types: widget card, text label, rectangle.
