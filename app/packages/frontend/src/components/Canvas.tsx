import React, { useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge as FlowEdge,
  Node as FlowNode,
  ReactFlowProvider,
  useReactFlow,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWidgetStore } from '../store/useWidgetStore';
import WidgetNode from './WidgetNode';
import LabelNode from './LabelNode';
import RectangleNode from './RectangleNode';
import MarkdownNode from './MarkdownNode';

const nodeTypes = {
  widgetNode: WidgetNode,
  labelNode: LabelNode,
  rectangleNode: RectangleNode,
  markdownNode: MarkdownNode,
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

  const [initialViewport] = React.useState<Viewport | undefined>(() => {
    const saved = localStorage.getItem('mission-control:viewport');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.x === 'number' &&
          typeof parsed.y === 'number' &&
          typeof parsed.zoom === 'number'
        ) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved viewport from localStorage:', e);
      }
    }
    return undefined;
  });

  const onMoveEnd = useCallback((_event: any, viewport: Viewport) => {
    localStorage.setItem('mission-control:viewport', JSON.stringify(viewport));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync widgets (Zustand Map) to React Flow nodes state
  useEffect(() => {
    setNodes(
      Array.from(widgets.values()).map((w) => {
        const isSelected = selectedWidgetId === w._id;
        const type = w.type === 'label' ? 'labelNode' : w.type === 'rectangle' ? 'rectangleNode' : w.type === 'markdown' ? 'markdownNode' : 'widgetNode';
        return {
          id: w._id,
          type,
          position: w.position,
          data: w,
          selected: isSelected,
          zIndex: w.style?.zIndex ?? (w.type === 'rectangle' ? 0 : 1),
          style: (w.type === 'rectangle' || w.type === 'label' || w.type === 'markdown') ? {
            width: w.style?.width ?? (w.type === 'rectangle' ? 200 : w.type === 'markdown' ? 300 : 150),
            height: w.style?.height ?? (w.type === 'rectangle' ? 150 : w.type === 'markdown' ? 200 : 60),
          } : undefined,
        } as FlowNode;
      })
    );
  }, [widgets, selectedWidgetId, setNodes]);

  // Sync edges (Zustand Array) to React Flow edges state
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

      if (type === 'labelNode') {
        send({
          type: 'widget:create',
          payload: {
            type: 'label',
            label: 'Label',
            code: '',
            envVars: [],
            timeoutMs: 10000,
            position,
            style: {
              fontSize: 16,
              color: '#111827',
              width: 150,
              height: 60,
            },
          },
        });
      } else if (type === 'rectangleNode') {
        send({
          type: 'widget:create',
          payload: {
            type: 'rectangle',
            label: '',
            code: '',
            envVars: [],
            timeoutMs: 10000,
            position,
            style: {
              width: 200,
              height: 150,
              backgroundColor: '#EEF2F6',
              borderColor: '#D1D5DB',
              borderStyle: 'solid',
              borderRadius: 8,
            },
          },
        });
      } else if (type === 'markdownNode') {
        send({
          type: 'widget:create',
          payload: {
            type: 'markdown',
            label: '# Markdown\n\nDouble-click to edit! Supports:\n- **Bold** & *italics*\n- Lists\n- `Code inline` and blocks\n\n```js\n// Example code\nconsole.log("Hello!");\n```',
            code: '',
            envVars: [],
            timeoutMs: 10000,
            position,
            style: {
              width: 300,
              height: 200,
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E7EB',
              borderStyle: 'solid',
              borderRadius: 8,
              fontSize: 14,
              color: '#111827',
            },
          },
        });
      } else {
        send({
          type: 'widget:create',
          payload: {
            type: 'widget',
            label: 'Status Widget',
            code: '', // Default script generated on server/save
            envVars: [],
            timeoutMs: 10000,
            position,
          },
        });
      }
    },
    [project, send]
  );

  // Sync node dragging position back to server
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
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

      const sourceWidget = widgets.get(connection.source);
      const targetWidget = widgets.get(connection.target);

      // 'widget' type corresponds to Status Widget (default type is also 'widget' if not specified)
      if (
        !sourceWidget || sourceWidget.type === 'widget' ||
        !targetWidget || targetWidget.type === 'widget'
      ) {
        console.warn('Status widgets cannot have edge connections');
        return;
      }

      send({
        type: 'edge:create',
        payload: {
          id: generateEdgeId(),
          source: connection.source,
          target: connection.target,
        },
      });
    },
    [widgets, send]
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

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onPaneClick={onPaneClick}
        elevateNodesOnSelect={false}
        defaultViewport={initialViewport}
        fitView={!initialViewport}
        onMoveEnd={onMoveEnd}
      >
        <Background variant={BackgroundVariant.Dots} color="#D1D5DB" gap={16} size={1} />
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
