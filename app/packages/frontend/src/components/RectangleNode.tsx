import React from 'react';
import { NodeResizer, NodeProps } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';
import { Lock } from 'lucide-react';

export const RectangleNode: React.FC<NodeProps<Widget>> = ({ id, data: element, selected }) => {
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
  const backgroundColor = style.backgroundColor || '#EEF2F6';
  const borderColor = style.borderColor || '#D1D5DB';
  const borderStyle = style.borderStyle || 'solid';
  const borderRadius = style.borderRadius !== undefined ? `${style.borderRadius}px` : '8px';

  return (
    <div
      className={`rectangle-node ${selected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor,
        border: borderStyle === 'none' ? 'none' : `2px ${borderStyle} ${borderColor}`,
        borderRadius,
        position: 'relative',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        color="var(--accent)"
        minWidth={50}
        minHeight={50}
        isVisible={selected && !element.locked}
        onResizeEnd={onResizeEnd}
      />
      {element.label && (
        <div className="rectangle-node-label">
          {element.label}
        </div>
      )}
      {element.locked && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }} title="Locked">
          <Lock className="icon lock-icon icon-lock" size={12} />
        </div>
      )}
    </div>
  );
};

export default RectangleNode;
