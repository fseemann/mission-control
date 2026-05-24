# Plan 09: Canvas Copy/Paste & Duplication

Implement clipboard actions and duplication handlers on the React Flow canvas to allow copying and pasting single or multiple nodes.

---

## State Changes

### Frontend Zustand Store (`useWidgetStore.ts`)

- Add state field:
  - `copiedWidgets: Widget[]` (initially `[]`)
- Add actions:
  - `copyWidgets(widgets: Widget[])`: Deep-clones the provided widgets list into `copiedWidgets`.
  - `pasteWidgets(targetTopLeft?: { x: number; y: number })`:
    - If `copiedWidgets` is empty, return.
    - Calculate the bounding box of the copied widgets to find the min X and min Y coordinates:
      ```typescript
      const minX = Math.min(...copiedWidgets.map(w => w.position.x));
      const minY = Math.min(...copiedWidgets.map(w => w.position.y));
      ```
    - For each copied widget, calculate its offset relative to the group's top-left corner:
      `dx = position.x - minX`, `dy = position.y - minY`.
    - Set the new target position:
      - If `targetTopLeft` is provided: `x = targetTopLeft.x + dx`, `y = targetTopLeft.y + dy`.
      - Otherwise (fallback or button trigger): `x = position.x + 40`, `y = position.y + 40`.
    - Clone attributes, appending ` (Copy)` to the label name if it doesn't already end with it.
    - Send `widget:create` messages to the backend.

---

## Component Updates

### 1. [Canvas.tsx](file:///home/felix/Projects/mission-control/app/packages/frontend/src/components/Canvas.tsx)

- Add mouse position tracking:
  - Add a listener `onMouseMove` to the canvas container.
  - Store the client coordinates in a ref.
  - Project them to canvas coordinates via `project({ x: clientX - bounds.left, y: clientY - bounds.top })`.
- Add a global `keydown` event listener for copy/paste keys (`Ctrl+C` / `Ctrl+V` and `Cmd+C` / `Cmd+V`):
  - **Focus Guard**: Ensure `document.activeElement` is not inside an `input`, `textarea`, or any editable text container.
  - **Copy**: Fetch selected widgets from the store matching `selectedWidgetIds` and call `copyWidgets(widgets)`.
  - **Paste**: Convert the mouse position to projected canvas coordinates and call `pasteWidgets(projectedMousePos)`.

### 2. [ConfigPanel.tsx](file:///home/felix/Projects/mission-control/app/packages/frontend/src/components/ConfigPanel.tsx)

- **Single Selection View**:
  - Add a **Duplicate** button in the footer actions next to the "Delete" button.
  - On click, it performs a copy of the selected widget followed by an offset paste.
- **Bulk Selection View** (from Plan 08):
  - Add a **Duplicate Selection** button.
  - On click, it performs a copy of all selected widgets followed by an offset paste.

---

## Styling Updates

### [index.css](file:///home/felix/Projects/mission-control/app/packages/frontend/src/styles/index.css)

- Add styling for the `.action-btn-duplicate` class (e.g. outline layout with hover active/light styles).

---

## Verification Plan

### Manual Verification
1. **Single Node Duplication (Button)**:
   - Double-click a node to show the configuration.
   - Click "Duplicate" and verify a copy is created at `+40px` X and Y offset.
2. **Keyboard Copy/Paste (Single & Multi-Select)**:
   - Select one or more nodes.
   - Press `Ctrl+C`.
   - Hover the mouse cursor over a blank area of the canvas.
   - Press `Ctrl+V` and verify nodes paste at the mouse cursor position.
3. **Editor Input Guarding**:
   - Double click a Status Widget, click in the scripting code editor.
   - Select some code and copy it. Paste it.
   - Verify that no canvas nodes are duplicated during this process.
