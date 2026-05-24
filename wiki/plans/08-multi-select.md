# Plan 08: Multi-Select Support on the Canvas

Enable multi-selection of elements on the canvas (using Shift+click or bounding box drag selection) and synchronize selection state with the Zustand store to allow bulk operations.

---

## Data & State Changes

### Frontend Zustand Store (`useWidgetStore.ts`)

- Replace `selectedWidgetId: string | null` with `selectedWidgetIds: string[]`.
- Keep `selectWidget(id: string | null)` for single double-click and pane click events to ensure backwards compatibility:
  ```typescript
  selectWidget: (id: string | null) => {
    set({ selectedWidgetIds: id ? [id] : [] });
  }
  ```

---

## Component Updates

### 1. [Canvas.tsx](file:///home/felix/Projects/mission-control/app/packages/frontend/src/components/Canvas.tsx)

- Update node mapping in the `useEffect` that maps widgets to React Flow nodes to determine selection:
  ```typescript
  const isSelected = selectedWidgetIds.includes(w._id);
  ```
- Attach the `onSelectionChange` event listener to `<ReactFlow>`:
  ```typescript
  const onSelectionChange = useCallback(({ nodes }: { nodes: FlowNode[] }) => {
    const selectedIds = nodes.map(n => n.id);
    const currentIds = useWidgetStore.getState().selectedWidgetIds;
    const isDifferent = selectedIds.length !== currentIds.length || selectedIds.some(id => !currentIds.includes(id));
    if (isDifferent) {
      useWidgetStore.setState({ selectedWidgetIds: selectedIds });
    }
  }, []);
  ```

### 2. [ConfigPanel.tsx](file:///home/felix/Projects/mission-control/app/packages/frontend/src/components/ConfigPanel.tsx)

- Access `selectedWidgetIds` from the Zustand store.
- **Single Selection Mode** (`selectedWidgetIds.length === 1`):
  - Render the existing single widget configuration view.
- **Bulk Selection Mode** (`selectedWidgetIds.length > 1`):
  - Hide specific input fields, scripts, or environment variable sections.
  - Display a selection summary (e.g. `"Selected: 3 elements (2 widgets, 1 rectangle)"`).
  - Provide a bulk **Delete Selection** action:
    - Fired via a button styled with red warning color.
    - Asks for confirmation (`"Are you sure you want to delete these N elements?"`).
    - Loops through selected IDs and sends `{ type: 'widget:delete', id }` for each.
    - Clears the selection on success.

---

## Styling Updates

### [index.css](file:///home/felix/Projects/mission-control/app/packages/frontend/src/styles/index.css)

- Add bulk-selection layout styling.
- Design clean summary pills to represent selected node categories.

---

## Verification Plan

### Manual Verification
1. **Selection Sync**:
   - Hold Shift and click on multiple nodes on the canvas. Verify they all receive highlight borders.
   - Verify that double-clicking a single node clears other selections and opens the config panel for that node only.
2. **Bounding Box Selection**:
   - Hold Shift and drag a bounding selection box over multiple nodes. Verify they all become selected.
3. **Bulk Config View**:
   - Check that when multiple elements are selected, the `ConfigPanel` slides open and displays the correct count and types of selected nodes.
4. **Bulk Deletion**:
   - Select multiple nodes, click the delete button in the bulk panel, confirm, and verify that they are removed from the canvas.
