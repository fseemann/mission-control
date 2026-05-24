import React from 'react';
import { NodeProps } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';

export const LabelNode: React.FC<NodeProps<Widget>> = ({ id, data: element, selected }) => {
  const selectWidget = useWidgetStore((state) => state.selectWidget);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectWidget(id);
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
      {element.label || 'Double-click to edit text'}
    </div>
  );
};

export default LabelNode;
