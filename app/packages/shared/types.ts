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

export type ElementType = 'widget' | 'label' | 'rectangle';

export interface ElementStyle {
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius?: number;
  fontSize?: number;
}

export interface Widget {
  _id: string;
  type?: ElementType;
  label: string;
  code: string;              // raw TS source stored as string
  envVars: EnvVar[];         // plaintext keys; values are encrypted at rest
  cronExpression?: string;   // e.g. "*/5 * * * *" — omit for manual-run only
  timeoutMs: number;         // default 10 000, user-editable
  position: { x: number; y: number };
  style?: ElementStyle;
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
  | { type: 'widget:create'; payload: Pick<Widget, 'type' | 'label' | 'code' | 'envVars' | 'timeoutMs' | 'position' | 'style'> & { cronExpression?: string } }
  | { type: 'widget:update'; id: string; payload: Partial<Pick<Widget, 'type' | 'label' | 'code' | 'envVars' | 'cronExpression' | 'timeoutMs' | 'position' | 'style'>> }
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
