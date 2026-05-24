import React from 'react';
import { NodeResizer, NodeProps } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';

export const LabelNode: React.FC<NodeProps<Widget>> = ({ id, data: element, selected }) => {
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
  const fontSize = style.fontSize !== undefined ? `${style.fontSize}px` : '16px';
  const color = style.color || 'var(--text-primary)';

  return (
    <div
      className={`label-node-card ${selected ? 'selected' : ''}`}
      style={{
        fontSize,
        color,
      }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        color="var(--accent)"
        minWidth={50}
        minHeight={30}
        isVisible={selected}
        onResizeEnd={onResizeEnd}
      />
      <div>
        {element.label || 'Double-click to edit text'}
      </div>
    </div>
  );
};

export default LabelNode;
