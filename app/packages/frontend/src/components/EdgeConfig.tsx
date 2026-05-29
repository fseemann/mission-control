import React, { useState, useEffect } from 'react';
import { Edge, Widget } from '@mc/shared';
import { Save, Trash2, ArrowRight, Minus } from 'lucide-react';

interface EdgeConfigProps {
  edge: Edge;
  send: (msg: any) => void;
  selectEdge: (id: string | null) => void;
  widgets: Map<string, Widget>;
}

export const EdgeConfig: React.FC<EdgeConfigProps> = ({
  edge,
  send,
  selectEdge,
  widgets,
}) => {
  const [label, setLabel] = useState('');
  const [undirected, setUndirected] = useState(false);

  useEffect(() => {
    setLabel(edge.label || '');
    setUndirected(!!edge.undirected);
  }, [edge]);

  const handleLabelChange = (newVal: string) => {
    setLabel(newVal);
    send({
      type: 'edge:update',
      id: edge.id,
      payload: { label: newVal },
    });
  };

  const handleDirectionChange = (isUndirected: boolean) => {
    setUndirected(isUndirected);
    send({
      type: 'edge:update',
      id: edge.id,
      payload: { undirected: isUndirected },
    });
  };

  const getWidgetName = (id: string) => {
    const w = widgets.get(id);
    if (!w) return 'Unknown';
    return w.label || w.type || 'Widget';
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this connection?')) {
      send({ type: 'edge:delete', id: edge.id });
      selectEdge(null);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send({
      type: 'edge:update',
      id: edge.id,
      payload: { label, undirected },
    });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div 
        style={{ 
          padding: '12px', 
          background: '#F3F4F6', 
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          border: '1px solid #E5E7EB'
        }}
      >
        <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)' }}>Connection</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', color: '#111827', flexWrap: 'wrap' }}>
          <span>{getWidgetName(edge.source)}</span>
          <ArrowRight size={14} style={{ color: 'var(--text-muted)', minWidth: '14px' }} />
          <span>{getWidgetName(edge.target)}</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Connection Label (Optional)</label>
        <input
          type="text"
          className="form-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="e.g. calls, queries, triggers"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Line Type</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="layer-btn"
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              borderColor: !undirected ? 'var(--accent)' : '#D1D5DB',
              backgroundColor: !undirected ? 'var(--accent-light)' : 'transparent',
              color: !undirected ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: !undirected ? '600' : '500'
            }}
            onClick={() => handleDirectionChange(false)}
          >
            <ArrowRight size={14} /> Directed
          </button>
          <button
            type="button"
            className="layer-btn"
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              borderColor: undirected ? 'var(--accent)' : '#D1D5DB',
              backgroundColor: undirected ? 'var(--accent-light)' : 'transparent',
              color: undirected ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: undirected ? '600' : '500'
            }}
            onClick={() => handleDirectionChange(true)}
          >
            <Minus size={14} /> Undirected
          </button>
        </div>
      </div>

      <div className="config-actions" style={{ marginTop: '8px' }}>
        <button type="submit" className="action-btn action-btn-save">
          <Save className="icon" size={14} /> Save Connection
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
        <button type="button" className="action-btn action-btn-delete" onClick={handleDelete}>
          <Trash2 className="icon icon-delete icon-wiggle-hover" size={14} /> Delete Connection
        </button>
      </div>
    </form>
  );
};

export default EdgeConfig;
