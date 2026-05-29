import React from 'react';
import { NodeResizer, NodeProps, Handle, Position } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';
import { Lock } from 'lucide-react';

export const UseCaseNode: React.FC<NodeProps<Widget>> = ({ id, data: element, selected }) => {
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
  const backgroundColor = style.backgroundColor || '#FAF5FF'; // Soft purple/violet
  const borderColor = style.borderColor || '#A855F7';
  const borderStyle = style.borderStyle || 'solid';
  const fontSize = style.fontSize !== undefined ? `${style.fontSize}px` : '13px';
  const color = style.color || '#7E22CE';
  const fontWeight = style.bold ? 'bold' : '600';

  return (
    <div
      className={`usecase-node-card ${selected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor,
        border: borderStyle === 'none' ? 'none' : `2px ${borderStyle} ${borderColor}`,
        borderRadius: '9999px', // Oval/pill
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 16px',
        boxSizing: 'border-box',
        color,
        fontSize,
        fontWeight,
        textAlign: 'center',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        color="#A855F7"
        minWidth={80}
        minHeight={36}
        isVisible={selected && !element.locked}
        onResizeEnd={onResizeEnd}
      />
      
      {/* Handles: Left (Target) and Right (Source) only */}
      <Handle type="target" position={Position.Left} id="uc_in" style={{ background: '#A855F7', width: '8px', height: '8px' }} />
      <Handle type="source" position={Position.Right} id="uc_out" style={{ background: '#C084FC', width: '8px', height: '8px' }} />

      <div style={{ wordBreak: 'break-word', userSelect: 'none', lineHeight: 1.2 }}>
        {element.label || 'Use Case'}
      </div>

      {element.locked && (
        <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', zIndex: 10, opacity: 0.6 }} title="Locked">
          <Lock className="icon lock-icon" size={10} />
        </div>
      )}
    </div>
  );
};

export default UseCaseNode;
