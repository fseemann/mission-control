import React, { useState, useEffect, useRef } from 'react';
import { Widget, MilestoneItem } from '@mc/shared';

interface MilestoneConfigProps {
  widget: Widget;
  send: (msg: any) => void;
  selectWidget: (id: string | null) => void;
  triggerReactiveUpdate: (updatedFields: Partial<Widget>, updatedStyle?: any) => void;
  maxZ: number;
  minZ: number;
  currentZ: number;
  handleSave: (e: React.FormEvent, localData: { label: string; locked: boolean; milestoneItems: MilestoneItem[]; style: any }) => void;
  handleDeleteWidget: () => void;
}

export const MilestoneConfig: React.FC<MilestoneConfigProps> = ({
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
  const [label, setLabel] = useState('');
  const [locked, setLocked] = useState(false);
  const [milestoneItems, setMilestoneItems] = useState<MilestoneItem[]>([]);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(150);

  const draggedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setLabel(widget.label || '');
    setLocked(!!widget.locked);
    setMilestoneItems(widget.milestoneItems ? JSON.parse(JSON.stringify(widget.milestoneItems)) : []);
    const style = widget.style || {};
    setWidth(style.width ?? 150);
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

  const handleWidthChange = (newVal: number) => {
    setWidth(newVal);
    triggerReactiveUpdate({}, { width: newVal });
  };

  const handleHeightChange = (newVal: number) => {
    setHeight(newVal);
    triggerReactiveUpdate({}, { height: newVal });
  };

  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const draggedIndex = draggedIndexRef.current;
    if (draggedIndex === null || draggedIndex === index) return;

    const next = [...milestoneItems];
    const [removed] = next.splice(draggedIndex, 1);
    next.splice(index, 0, removed);

    draggedIndexRef.current = index;
    setMilestoneItems(next);
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
  };

  const handleAddMilestoneItem = () => {
    const newItem = {
      id: `item_${Math.random().toString(36).substring(2, 11)}`,
      text: '',
      checked: false,
    };
    setMilestoneItems([...milestoneItems, newItem]);
  };

  const handleUpdateMilestoneItemText = (index: number, val: string) => {
    const next = [...milestoneItems];
    next[index] = { ...next[index], text: val };
    setMilestoneItems(next);
  };

  const handleDeleteMilestoneItem = (index: number) => {
    setMilestoneItems(milestoneItems.filter((_, i) => i !== index));
  };

  const onSubmit = (e: React.FormEvent) => {
    const style = {
      ...widget.style,
      width: Number(width),
      height: Number(height),
    };
    handleSave(e, { label, locked, milestoneItems, style });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title / Label */}
      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="e.g. v1.0 Launch"
          required
        />
      </div>

      {/* Lock Canvas Element */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px', justifyContent: 'flex-start' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'normal', width: '100%', justifyContent: 'flex-start' }}>
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => handleLockedChange(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
          />
          <span>🔒 Lock</span>
        </label>
      </div>

      {/* Milestone checklist editor */}
      <div className="form-group">
        <label className="form-label">Checklist Items</label>
        <div className="milestone-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {milestoneItems.map((item, index) => (
            <div
              key={item.id}
              className="milestone-item-row"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#F9FAFB',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
              }}
            >
              {/* Drag handle */}
              <div
                className="milestone-item-drag-handle"
                style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: '18px', userSelect: 'none' }}
                title="Drag to reorder"
              >
                ⠿
              </div>

              {/* Checkbox */}
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => {
                  const next = [...milestoneItems];
                  next[index] = { ...next[index], checked: !item.checked };
                  setMilestoneItems(next);
                }}
                className="milestone-checkbox"
                title="Checked state"
              />

              {/* Text input */}
              <input
                type="text"
                className="form-input"
                style={{ flexGrow: 1, padding: '4px 8px' }}
                value={item.text}
                onChange={(e) => handleUpdateMilestoneItemText(index, e.target.value)}
                placeholder="Task description..."
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
                required
              />

              {/* Delete button */}
              <button
                type="button"
                className="env-row-delete-btn"
                style={{ padding: '4px' }}
                onClick={() => handleDeleteMilestoneItem(index)}
                title="Delete item"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="add-row-btn"
          onClick={handleAddMilestoneItem}
          style={{ marginTop: '4px' }}
        >
          + Add Sub-task
        </button>
      </div>

      {/* Dimensions */}
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
            min={30}
          />
        </div>
      </div>

      {/* Layer control row */}
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
            ↑ Bring to Front
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
            ↓ Send to Back
          </button>
        </div>
      </div>

      {/* Form actions */}
      <div className="config-actions">
        <button type="submit" className="action-btn action-btn-save">
          💾 Save Config
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
        <button type="button" className="action-btn action-btn-delete" onClick={handleDeleteWidget}>
          🗑️ Delete Milestone
        </button>
      </div>
    </form>
  );
};
export default MilestoneConfig;
