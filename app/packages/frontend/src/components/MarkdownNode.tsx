import React from 'react';
import { NodeResizer, NodeProps } from 'reactflow';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Lock } from 'lucide-react';

export const MarkdownNode: React.FC<NodeProps<Widget>> = ({ id, data: element, selected }) => {
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
  const fontSize = style.fontSize !== undefined ? `${style.fontSize}px` : '14px';
  const color = style.color || 'var(--text-primary)';
  const backgroundColor = style.backgroundColor || '#FFFFFF';
  const borderColor = style.borderColor || '#E5E7EB';
  const borderStyle = style.borderStyle || 'solid';
  const borderRadius = style.borderRadius !== undefined ? `${style.borderRadius}px` : '8px';

  // Compile Markdown to sanitized HTML safely
  const rawHtml = React.useMemo(() => {
    const raw = element.label || '';
    try {
      // Synchronous parse by default in marked 4+ / 18+
      return DOMPurify.sanitize(marked.parse(raw, { async: false }) as string);
    } catch (e) {
      console.error('Failed to parse Markdown:', e);
      return raw;
    }
  }, [element.label]);

  return (
    <div
      className={`markdown-node-card ${selected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        fontSize,
        color,
        backgroundColor,
        border: borderStyle === 'none' ? 'none' : `2px ${borderStyle} ${borderColor}`,
        borderRadius,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        color="var(--accent)"
        minWidth={100}
        minHeight={60}
        isVisible={selected && !element.locked}
        onResizeEnd={onResizeEnd}
      />
      <div
        className="markdown-node-content"
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
      {element.locked && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, background: 'rgba(255,255,255,0.8)', padding: '2px 4px', borderRadius: '4px' }} title="Locked">
          <Lock className="icon lock-icon" size={12} />
        </div>
      )}
    </div>
  );
};

export default MarkdownNode;
