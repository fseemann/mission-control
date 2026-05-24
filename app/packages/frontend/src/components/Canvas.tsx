import React, { useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge as FlowEdge,
  Node as FlowNode,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWidgetStore } from '../store/useWidgetStore';
import WidgetNode from './WidgetNode';

const nodeTypes = {
  widgetNode: WidgetNode,
};

const defaultEdgeOptions = {
  animated: false,
};

// Generates a simple random ID for edges
const generateEdgeId = () => {
  return `edge_${Math.random().toString(36).substring(2, 11)}`;
};

const Canvas: React.FC = () => {
  const widgets = useWidgetStore((state) => state.widgets);
  const edges = useWidgetStore((state) => state.edges);
  const selectedWidgetId = useWidgetStore((state) => state.selectedWidgetId);
  const selectWidget = useWidgetStore((state) => state.selectWidget);
  const send = useWidgetStore((state) => state.send);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  // Map widgets (Zustand Map) to React Flow Node array
  const flowNodes = useMemo(() => {
    return Array.from(widgets.values()).map((w) => {
      const isSelected = selectedWidgetId === w._id;
      return {
        id: w._id,
        type: 'widgetNode',
        position: w.position,
        data: w,
        selected: isSelected,
      } as FlowNode;
    });
  }, [widgets, selectedWidgetId]);

  // Map edges (Zustand Array) to React Flow Edge array
  const flowEdges = useMemo(() => {
    return edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
    })) as FlowEdge[];
  }, [edges]);

  // Handle drag over to enable drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle dropped items from the sidebar
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      // Check if dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      // Convert page coordinates to canvas coordinate space
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      send({
        type: 'widget:create',
        payload: {
          label: 'Status Widget',
          code: '', // Default script generated on server/save
          envVars: [],
          timeoutMs: 10000,
          position,
        },
      });
    },
    [project, send]
  );

  // Sync node dragging position back to server
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      send({
        type: 'widget:update',
        id: node.id,
        payload: {
          position: node.position,
        },
      });
    },
    [send]
  );

  // Handle new edge connection drawing
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      send({
        type: 'edge:create',
        payload: {
          id: generateEdgeId(),
          source: connection.source,
          target: connection.target,
        },
      });
    },
    [send]
  );

  // Handle deleting edges
  const onEdgesDelete = useCallback(
    (deleted: FlowEdge[]) => {
      deleted.forEach((edge) => {
        send({ type: 'edge:delete', id: edge.id });
      });
    },
    [send]
  );

  // Handle pane click (closes config panel if clicked outside nodes)
  const onPaneClick = useCallback(() => {
    selectWidget(null);
  }, [selectWidget]);

  // Handle toolbar add button (centers new widget on current screen)
  const handleAddWidget = useCallback(() => {
    if (!reactFlowWrapper.current) return;
    const rect = reactFlowWrapper.current.getBoundingClientRect();
    
    // Compute center coordinates
    const position = project({
      x: rect.width / 2 - 110, // Offset half width of custom node card
      y: rect.height / 2 - 40,
    });

    send({
      type: 'widget:create',
      payload: {
        label: 'Status Widget',
        code: '',
        envVars: [],
        timeoutMs: 10000,
        position,
      },
    });
  }, [project, send]);

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      {/* Top toolbar */}
      <div className="canvas-toolbar">
        <button
          className="toolbar-btn toolbar-btn-primary"
          onClick={handleAddWidget}
          title="Add a new widget to the center of the canvas"
        >
          ➕ Add Widget
        </button>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background variant="dots" color="#D1D5DB" gap={16} size={1} />
        <Controls position="top-right" />
        <MiniMap position="bottom-right" nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  );
};

export default function CanvasWithProvider() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
