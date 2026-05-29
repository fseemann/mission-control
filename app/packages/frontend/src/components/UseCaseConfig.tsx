import React, { useState, useEffect } from 'react';
import { Widget } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';
import { Lock, Save, Trash2, Link2 } from 'lucide-react';

interface UseCaseConfigProps {
  widget: Widget;
  send: (msg: any) => void;
  selectWidget: (id: string | null) => void;
  triggerReactiveUpdate: (updatedFields: Partial<Widget>, updatedStyle?: any) => void;
  maxZ: number;
  minZ: number;
  currentZ: number;
  handleSave: (e: React.FormEvent, localData: { label: string; locked: boolean; style: any; useCaseEdges: string[] }) => void;
  handleDeleteWidget: () => void;
}

export const UseCaseConfig: React.FC<UseCaseConfigProps> = ({
  widget,
  send,
  selectWidget,
  triggerReactiveUpdate,
  maxZ,
  minZ,
  currentZ,
  handleSave,
  handleDeleteWidget,
}) => {
  const edges = useWidgetStore((state) => state.edges || []);
  const widgets = useWidgetStore((state) => state.widgets);

  // Find all nodes directly connected to this Use Case node
  const directlyConnectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    if (edge.source === widget._id) directlyConnectedNodeIds.add(edge.target);
    if (edge.target === widget._id) directlyConnectedNodeIds.add(edge.source);
  });

  // Perform BFS to find the entire connected graph component and compute distances
  const connectedNodeIds = new Set<string>(directlyConnectedNodeIds);
  const queue = Array.from(directlyConnectedNodeIds);
  const visited = new Set<string>();
  const distances: Record<string, number> = {};

  directlyConnectedNodeIds.forEach((id) => {
    distances[id] = 1;
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    edges.forEach((edge) => {
      // Exclude edges directly connected to the Use Case node itself
      if (edge.source === widget._id || edge.target === widget._id) return;

      if (edge.source === current && !visited.has(edge.target)) {
        connectedNodeIds.add(edge.target);
        if (distances[edge.target] === undefined) {
          distances[edge.target] = distances[current] + 1;
        }
        queue.push(edge.target);
      }
      if (edge.target === current && !visited.has(edge.source)) {
        connectedNodeIds.add(edge.source);
        if (distances[edge.source] === undefined) {
          distances[edge.source] = distances[current] + 1;
        }
        queue.push(edge.source);
      }
    });
  }

  // Only show edges that connect nodes within this connected component, sorted by distance
  const filteredEdges = edges
    .filter((edge) => {
      if (edge.source === widget._id || edge.target === widget._id) return false;
      return connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target);
    })
    .sort((a, b) => {
      const distA = Math.min(distances[a.source] ?? Infinity, distances[a.target] ?? Infinity);
      const distB = Math.min(distances[b.source] ?? Infinity, distances[b.target] ?? Infinity);
      return distA - distB;
    });

  const [label, setLabel] = useState('');
  const [locked, setLocked] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#FAF5FF');
  const [borderColor, setBorderColor] = useState('#A855F7');
  const [color, setColor] = useState('#7E22CE');
  const [fontSize, setFontSize] = useState(13);
  const [useCaseEdges, setUseCaseEdges] = useState<string[]>([]);
  const [width, setWidth] = useState(140);
  const [height, setHeight] = useState(60);

  useEffect(() => {
    setLabel(widget.label || '');
    setLocked(!!widget.locked);
    const style = widget.style || {};
    setBackgroundColor(style.backgroundColor ?? '#FAF5FF');
    setBorderColor(style.borderColor ?? '#A855F7');
    setColor(style.color ?? '#7E22CE');
    setFontSize(style.fontSize ?? 13);
    setUseCaseEdges(widget.useCaseEdges || []);
    setWidth(style.width ?? 140);
    setHeight(style.height ?? 60);
  }, [widget]);

  useEffect(() => {
    if (widget.style) {
      if (widget.style.width !== undefined) setWidth(widget.style.width);
      if (widget.style.height !== undefined) setHeight(widget.style.height);
    }
  }, [widget.style?.width, widget.style?.height]);

  const handleLabelChange = (newVal: string) => {
    setLabel(newVal);
    triggerReactiveUpdate({ label: newVal });
  };

  const handleLockedChange = (newVal: boolean) => {
    setLocked(newVal);
    triggerReactiveUpdate({ locked: newVal });
  };

  const handleBackgroundColorChange = (newVal: string) => {
    setBackgroundColor(newVal);
    triggerReactiveUpdate({}, { backgroundColor: newVal });
  };

  const handleBorderColorChange = (newVal: string) => {
    setBorderColor(newVal);
    triggerReactiveUpdate({}, { borderColor: newVal });
  };

  const handleColorChange = (newVal: string) => {
    setColor(newVal);
    triggerReactiveUpdate({}, { color: newVal });
  };

  const handleFontSizeChange = (newVal: number) => {
    setFontSize(newVal);
    triggerReactiveUpdate({}, { fontSize: newVal });
  };

  const handleWidthChange = (newVal: number) => {
    setWidth(newVal);
    triggerReactiveUpdate({}, { width: newVal });
  };

  const handleHeightChange = (newVal: number) => {
    setHeight(newVal);
    triggerReactiveUpdate({}, { height: newVal });
  };

  const handleEdgeToggle = (edgeId: string, checked: boolean) => {
    const nextEdges = checked
      ? [...useCaseEdges, edgeId]
      : useCaseEdges.filter((id) => id !== edgeId);
    
    setUseCaseEdges(nextEdges);
    triggerReactiveUpdate({ useCaseEdges: nextEdges });
  };

  const getWidgetName = (id: string) => {
    const w = widgets.get(id);
    if (!w) return 'Unknown';
    return w.label || w.type || 'Widget';
  };

  const onSubmit = (e: React.FormEvent) => {
    const style = {
      ...widget.style,
      width: Number(width),
      height: Number(height),
      backgroundColor,
      borderColor,
      color,
      fontSize: Number(fontSize),
    };
    handleSave(e, { label, locked, style, useCaseEdges });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="form-group">
        <label className="form-label">Use Case Label</label>
        <input
          type="text"
          className="form-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="e.g. Place Order Flow"
          required
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => handleLockedChange(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
          />
          <span><Lock className="icon icon-lock" size={14} style={{ marginRight: '4px' }} /> Lock Position</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Width (px)</label>
          <input
            type="number"
            className="form-input"
            value={width}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            min={40}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Height (px)</label>
          <input
            type="number"
            className="form-input"
            value={height}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            min={20}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Background Color</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            className="form-input"
            style={{ width: '50px', height: '36px', padding: '2px', cursor: 'pointer' }}
            value={backgroundColor}
            onChange={(e) => handleBackgroundColorChange(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            value={backgroundColor}
            onChange={(e) => handleBackgroundColorChange(e.target.value)}
            style={{ flexGrow: 1 }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Border Color</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            className="form-input"
            style={{ width: '50px', height: '36px', padding: '2px', cursor: 'pointer' }}
            value={borderColor}
            onChange={(e) => handleBorderColorChange(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            value={borderColor}
            onChange={(e) => handleBorderColorChange(e.target.value)}
            style={{ flexGrow: 1 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Text Color</label>
          <input
            type="color"
            className="form-input"
            style={{ width: '100%', height: '36px', padding: '2px', cursor: 'pointer' }}
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Font Size (px)</label>
          <input
            type="number"
            className="form-input"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            min={8}
            max={24}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Layer <span className="layer-badge">z{currentZ}</span>
        </label>
        <div className="layer-controls">
          <button
            type="button"
            className="layer-btn"
            onClick={() => send({
              type: 'widget:update',
              id: widget._id,
              payload: { style: { ...widget.style, zIndex: maxZ + 1 } }
            })}
          >
            ↑ Front
          </button>
          <button
            type="button"
            className="layer-btn"
            onClick={() => send({
              type: 'widget:update',
              id: widget._id,
              payload: { style: { ...widget.style, zIndex: Math.max(0, minZ - 1) } }
            })}
          >
            ↓ Back
          </button>
        </div>
      </div>

      {/* Highlighted Connections List */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Link2 size={14} /> Highlighted Paths ({filteredEdges.filter(fe => useCaseEdges.includes(fe.id)).length})
        </label>
        <div 
          className="use-case-edges-list"
          style={{ 
            border: '1px solid #D1D5DB', 
            borderRadius: '6px', 
            maxHeight: '200px', 
            overflowY: 'auto', 
            padding: '8px',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {filteredEdges.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              No connections between linked nodes found
            </span>
          ) : (
            filteredEdges.map((edge) => {
              const isChecked = useCaseEdges.includes(edge.id);
              const edgeLabel = `${getWidgetName(edge.source)} ➔ ${getWidgetName(edge.target)}${edge.label ? ` (${edge.label})` : ''}`;
              
              return (
                <label 
                  key={edge.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    color: isChecked ? '#111827' : 'var(--text-secondary)',
                    fontWeight: isChecked ? '500' : 'normal',
                    padding: '4px',
                    borderRadius: '4px',
                    backgroundColor: isChecked ? 'rgba(168, 85, 247, 0.08)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleEdgeToggle(edge.id, e.target.checked)}
                    style={{ width: '15px', height: '15px', cursor: 'pointer', margin: 0 }}
                  />
                  <span style={{ wordBreak: 'break-all' }}>{edgeLabel}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="config-actions">
        <button type="submit" className="action-btn action-btn-save">
          <Save className="icon" size={14} /> Save Config
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
        <button type="button" className="action-btn action-btn-delete" onClick={handleDeleteWidget}>
          <Trash2 className="icon icon-delete icon-wiggle-hover" size={14} /> Delete Use Case
        </button>
      </div>
    </form>
  );
};

export default UseCaseConfig;
