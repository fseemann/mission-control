import React from 'react';
import { NodeProps } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';

export const WidgetNode: React.FC<NodeProps<Widget>> = ({ id, data: widget, selected }) => {
  const selectWidget = useWidgetStore((state) => state.selectWidget);

  const status = widget.status || 'idle';

  // Get color variable corresponding to status
  const getStatusColor = (statusVal: string) => {
    switch (statusVal) {
      case 'ok':
        return 'var(--status-ok)';
      case 'degraded':
        return 'var(--status-degraded)';
      case 'fail':
        return 'var(--status-fail)';
      case 'timeout':
        return 'var(--status-timeout)';
      case 'crash':
        return 'var(--status-crash)';
      case 'running':
        return 'var(--status-running)';
      case 'idle':
      default:
        return 'var(--status-idle)';
    }
  };

  const statusColor = getStatusColor(status);

  // Simple relative time formatter
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Never run';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Fallback if client clock is slightly behind server clock
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  };

  const lastRunText = widget.lastResult?.ranAt 
    ? `Last run: ${formatRelativeTime(widget.lastResult.ranAt)}`
    : 'Never run';

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectWidget(id);
  };

  return (
    <div
      className={`widget-node-card ${selected ? 'selected' : ''}`}
      style={{ borderLeft: `4px solid ${statusColor}` }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="widget-node-header">
        <span
          className={`status-dot ${status === 'running' ? 'running' : ''}`}
          style={{ backgroundColor: statusColor }}
          title={`Status: ${status}`}
        />
        <h4 className="widget-node-title" title={widget.label}>
          {widget.label || 'Unnamed Widget'}
        </h4>
      </div>

      <div className="widget-node-meta">
        <span>{lastRunText}</span>
        {widget.cronExpression && (
          <span title={`Schedule: ${widget.cronExpression}`}>⏱️</span>
        )}
      </div>
    </div>
  );
};

export default WidgetNode;
