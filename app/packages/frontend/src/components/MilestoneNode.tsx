import React from 'react';
import { NodeResizer, NodeProps, Handle, Position } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';

export const MilestoneNode: React.FC<NodeProps<Widget>> = ({ id, data: element, selected }) => {
  const selectWidget = useWidgetStore((state) => state.selectWidget);
  const widgets = useWidgetStore((state) => state.widgets);
  const edges = useWidgetStore((state) => state.edges);
  const send = useWidgetStore((state) => state.send);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectWidget(id);
  };

  const onResizeEnd = (_event: any, params: { width: number; height: number }) => {
    send({
      type: 'widget:update',
      id,
      payload: {
        style: {
          ...element.style,
          width: params.width,
          height: params.height,
        },
      },
    });
  };

  // Compute Health Status from incoming connected status widgets
  const incomingWidgetIds = edges
    .filter((e) => e.target === id)
    .map((e) => e.source);

  const hasConnections = incomingWidgetIds.length > 0;
  const unhealthyStatuses = ['fail', 'degraded', 'timeout', 'crash'];

  const healthStatus = incomingWidgetIds.reduce<'active' | 'at-risk' | 'failed'>((acc, wid) => {
    const w = widgets.get(wid);
    if (!w) return acc;
    if (w.status === 'fail' || w.status === 'crash') return 'failed';
    if (unhealthyStatuses.includes(w.status) && acc === 'active') return 'at-risk';
    return acc;
  }, 'active');

  // Compute checklist completion progress
  const items = element.milestoneItems || [];
  const totalItems = items.length;
  const checkedItems = items.filter((item) => item.checked).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // Toggle item status with instant local Zustand state update and immediate WS message
  const handleToggleItem = (itemId: string) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    // 1. Optimistic update
    useWidgetStore.setState((state) => {
      const next = new Map(state.widgets);
      const w = next.get(id);
      if (w) {
        next.set(id, {
          ...w,
          milestoneItems: updatedItems,
        });
      }
      return { widgets: next };
    });

    // 2. Send instantly via WebSocket
    send({
      type: 'widget:update',
      id,
      payload: {
        milestoneItems: updatedItems,
      },
    });
  };

  // Health badge rendering options
  const renderHealthBadge = () => {
    if (!hasConnections) return null;

    let badgeClass = 'milestone-badge-active';
    let badgeLabel = 'ACTIVE';
    let statusDotClass = 'status-ok';

    if (healthStatus === 'failed') {
      badgeClass = 'milestone-badge-failed';
      badgeLabel = 'FAILED';
      statusDotClass = 'status-fail';
    } else if (healthStatus === 'at-risk') {
      badgeClass = 'milestone-badge-at-risk';
      badgeLabel = 'AT RISK';
      statusDotClass = 'status-degraded';
    }

    return (
      <span className={`milestone-health-badge ${badgeClass}`}>
        <span className={`milestone-badge-indicator ${statusDotClass}`} />
        <span>{badgeLabel}</span>
      </span>
    );
  };

  return (
    <div
      className={`milestone-node-card ${selected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        color="var(--accent)"
        minWidth={280}
        minHeight={200}
        isVisible={selected}
        onResizeEnd={onResizeEnd}
      />

      <Handle
        type="target"
        position={Position.Left}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />

      {/* Header bar */}
      <div className="milestone-node-header">
        <span className="milestone-node-icon">🎯</span>
        <h4 className="milestone-node-title" title={element.label}>
          {element.label || 'Goal Milestone'}
        </h4>
        {renderHealthBadge()}
      </div>

      {/* Progress Section */}
      <div className="milestone-progress-section">
        <div className="milestone-progress-bar-container">
          <div
            className="milestone-progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="milestone-progress-text">
          {checkedItems} / {totalItems} complete ({progressPercent}%)
        </div>
      </div>

      {/* Checklist items */}
      <div className="milestone-checklist-container">
        {totalItems === 0 ? (
          <div className="milestone-checklist-empty">
            Double-click to configure and add sub-tasks
          </div>
        ) : (
          items.map((item) => (
            <label
              key={item.id}
              className="milestone-checklist-item"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggleItem(item.id)}
                className="milestone-checkbox"
              />
              <span className={`milestone-checklist-text ${item.checked ? 'checked' : ''}`}>
                {item.text}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
};

export default MilestoneNode;
