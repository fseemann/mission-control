import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';
import { humanizeCron } from '../utils/cron';

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
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      <div className="widget-node-header">
        <span
          className={`status-dot status-${status} ${status === 'running' ? 'running' : ''}`}
          style={{ backgroundColor: statusColor }}
          title={`Status: ${status}`}
        />
        <h4 className="widget-node-title" title={widget.label}>
          {widget.label || 'Status'}
        </h4>
        {widget.locked && <span style={{ marginLeft: 'auto', fontSize: '12px' }} title="Element is locked">🔒</span>}
      </div>

      <div className="widget-node-meta" style={{ flexDirection: 'column', gap: '4px' }}>
        <span>{lastRunText}</span>
        {widget.cronExpression && (
          <span 
            className="widget-cron-badge" 
            title={humanizeCron(widget.cronExpression)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
          >
            ⏱️ {humanizeCron(widget.cronExpression)}
          </span>
        )}
      </div>
    </div>
  );
};

export default WidgetNode;
