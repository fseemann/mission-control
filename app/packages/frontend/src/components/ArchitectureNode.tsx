import React from 'react';
import { NodeResizer, NodeProps, Handle, Position } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';
import { Lock } from 'lucide-react';

export const ArchitectureNode: React.FC<NodeProps<Widget>> = ({ id, data: element, selected }) => {
  const selectWidget = useWidgetStore((state) => state.selectWidget);
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

  const style = element.style || {};
  const backgroundColor = style.backgroundColor || '#FFFFFF';
  const borderColor = style.borderColor || '#4F46E5';
  const borderStyle = style.borderStyle || 'solid';
  const borderRadius = style.borderRadius !== undefined ? `${style.borderRadius}px` : '8px';
  const fontSize = style.fontSize !== undefined ? `${style.fontSize}px` : '14px';
  const color = style.color || '#111827';
  const fontWeight = style.bold ? 'bold' : '500';

  return (
    <div
      className={`architecture-node ${selected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor,
        border: borderStyle === 'none' ? 'none' : `2px ${borderStyle} ${borderColor}`,
        borderRadius,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        boxSizing: 'border-box',
        color,
        fontSize,
        fontWeight,
        textAlign: 'center',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        color="var(--accent)"
        minWidth={60}
        minHeight={40}
        isVisible={selected && !element.locked}
        onResizeEnd={onResizeEnd}
      />
      
      {/* Target handles (incoming connections) */}
      <Handle type="target" position={Position.Left} id="l_in" style={{ background: '#6366F1', width: '8px', height: '8px' }} />
      <Handle type="target" position={Position.Top} id="t_in" style={{ background: '#6366F1', width: '8px', height: '8px' }} />
      
      {/* Source handles (outgoing connections) */}
      <Handle type="source" position={Position.Right} id="r_out" style={{ background: '#818CF8', width: '8px', height: '8px' }} />
      <Handle type="source" position={Position.Bottom} id="b_out" style={{ background: '#818CF8', width: '8px', height: '8px' }} />

      <div style={{ wordBreak: 'break-word', userSelect: 'none' }}>
        {element.label || 'System Component'}
      </div>

      {element.locked && (
        <div style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 10, opacity: 0.7 }} title="Locked">
          <Lock className="icon lock-icon" size={11} />
        </div>
      )}
    </div>
  );
};

export default ArchitectureNode;
