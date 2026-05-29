import React, { useState, useEffect } from 'react';
import { Widget } from '@mc/shared';
import { Lock, Save, Trash2 } from 'lucide-react';

interface LabelConfigProps {
  widget: Widget;
  send: (msg: any) => void;
  selectWidget: (id: string | null) => void;
  triggerReactiveUpdate: (updatedFields: Partial<Widget>, updatedStyle?: any) => void;
  maxZ: number;
  minZ: number;
  currentZ: number;
  handleSave: (e: React.FormEvent, localData: { label: string; locked: boolean; style: any }) => void;
  handleDeleteWidget: () => void;
}

export const LabelConfig: React.FC<LabelConfigProps> = ({
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
  const [fontSize, setFontSize] = useState(16);
  const [bold, setBold] = useState(false);
  const [cursive, setCursive] = useState(false);
  const [color, setColor] = useState('#111827');
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(150);

  // Sync state from widget updates
  useEffect(() => {
    setLabel(widget.label || '');
    setLocked(!!widget.locked);
    const style = widget.style || {};
    setFontSize(style.fontSize ?? 16);
    setBold(!!style.bold);
    setCursive(!!style.cursive);
    setColor(style.color ?? '#111827');
    setWidth(style.width ?? 150);
    setHeight(style.height ?? 60);
  }, [widget]);

  // Sync width/height from store updates (e.g. resized on canvas)
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

  const handleFontSizeChange = (newVal: number) => {
    setFontSize(newVal);
    triggerReactiveUpdate({}, { fontSize: newVal });
  };

  const handleColorChange = (newVal: string) => {
    setColor(newVal);
    triggerReactiveUpdate({}, { color: newVal });
  };

  const handleBoldChange = (newVal: boolean) => {
    setBold(newVal);
    triggerReactiveUpdate({}, { bold: newVal });
  };

  const handleCursiveChange = (newVal: boolean) => {
    setCursive(newVal);
    triggerReactiveUpdate({}, { cursive: newVal });
  };

  const handleWidthChange = (newVal: number) => {
    setWidth(newVal);
    triggerReactiveUpdate({}, { width: newVal });
  };

  const handleHeightChange = (newVal: number) => {
    setHeight(newVal);
    triggerReactiveUpdate({}, { height: newVal });
  };

  const onSubmit = (e: React.FormEvent) => {
    const style = {
      ...widget.style,
      fontSize: Number(fontSize),
      bold,
      cursive,
      color,
      width: Number(width),
      height: Number(height),
    };
    handleSave(e, { label, locked, style });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Label / Text field */}
      <div className="form-group">
        <label className="form-label">Text Content</label>
        <textarea
          className="form-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Type label text here..."
          rows={3}
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
          <span><Lock className="icon" size={14} style={{ marginRight: '4px' }} /> Lock</span>
        </label>
      </div>

      {/* Font Size Selector */}
      <div className="form-group">
        <label className="form-label">Font Size (px)</label>
        <select
          className="form-input"
          value={fontSize}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
        >
          {[8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96].map(size => (
            <option key={size} value={size}>
              {size} px {size === 12 ? '(Small)' : size === 14 ? '(Regular)' : size === 16 ? '(Medium)' : size === 20 ? '(Large)' : size === 24 ? '(Extra Large)' : size === 32 ? '(Title)' : size === 40 ? '(Display)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Bold & Cursive toggles */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '-8px', marginBottom: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={bold}
            onChange={(e) => handleBoldChange(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Bold
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={cursive}
            onChange={(e) => handleCursiveChange(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Cursive
        </label>
      </div>

      {/* Text Color Picker / Presets */}
      <div className="form-group">
        <label className="form-label">Text Color</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            className="form-input"
            style={{ width: '50px', height: '36px', padding: '2px', cursor: 'pointer' }}
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#000000"
            style={{ flexGrow: 1 }}
          />
        </div>
        {/* Presets */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
          {['#111827', '#4B5563', '#6B7280', '#6366F1', '#10B981', '#EF4444', '#F59E0B'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleColorChange(preset)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: preset,
                border: color === preset ? '2px solid var(--accent)' : '1px solid #D1D5DB',
                cursor: 'pointer',
              }}
              title={preset}
            />
          ))}
        </div>
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
          <Save className="icon" size={14} /> Save Config
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
        <button type="button" className="action-btn action-btn-delete" onClick={handleDeleteWidget}>
          <Trash2 className="icon icon-wiggle-hover" size={14} /> Delete Label
        </button>
      </div>
    </form>
  );
};
export default LabelConfig;
