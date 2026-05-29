import React, { useState, useEffect } from 'react';
import { Widget } from '@mc/shared';
import { Lock, Save, Trash2 } from 'lucide-react';

interface MarkdownConfigProps {
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

export const MarkdownConfig: React.FC<MarkdownConfigProps> = ({
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
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState('#111827');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [borderColor, setBorderColor] = useState('#E5E7EB');
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted' | 'none'>('solid');
  const [borderRadius, setBorderRadius] = useState(8);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    setLabel(widget.label || '');
    setLocked(!!widget.locked);
    const style = widget.style || {};
    setFontSize(style.fontSize ?? 14);
    setColor(style.color ?? '#111827');
    setBackgroundColor(style.backgroundColor ?? '#FFFFFF');
    setBorderColor(style.borderColor ?? '#E5E7EB');
    setBorderStyle(style.borderStyle ?? 'solid');
    setBorderRadius(style.borderRadius ?? 8);
    setWidth(style.width ?? 300);
    setHeight(style.height ?? 200);
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

  const handleFontSizeChange = (newVal: number) => {
    setFontSize(newVal);
    triggerReactiveUpdate({}, { fontSize: newVal });
  };

  const handleColorChange = (newVal: string) => {
    setColor(newVal);
    triggerReactiveUpdate({}, { color: newVal });
  };

  const handleBackgroundColorChange = (newVal: string) => {
    setBackgroundColor(newVal);
    triggerReactiveUpdate({}, { backgroundColor: newVal });
  };

  const handleBorderColorChange = (newVal: string) => {
    setBorderColor(newVal);
    triggerReactiveUpdate({}, { borderColor: newVal });
  };

  const handleBorderStyleChange = (newVal: any) => {
    setBorderStyle(newVal);
    triggerReactiveUpdate({}, { borderStyle: newVal });
  };

  const handleBorderRadiusChange = (newVal: number) => {
    setBorderRadius(newVal);
    triggerReactiveUpdate({}, { borderRadius: newVal });
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
      color,
      width: Number(width),
      height: Number(height),
      backgroundColor,
      borderColor,
      borderStyle,
      borderRadius: Number(borderRadius),
    };
    handleSave(e, { label, locked, style });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Markdown Content */}
      <div className="form-group">
        <label className="form-label">Markdown Content</label>
        <textarea
          className="form-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Type markdown here..."
          rows={14}
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

      {/* Background Color Picker / Presets */}
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
            placeholder="#FFFFFF"
            style={{ flexGrow: 1 }}
          />
        </div>
        {/* Presets */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
          {['#EEF2F6', '#E0E7FF', '#D1FAE5', '#FEE2E2', '#FEF3C7', '#FFFFFF', '#00000000'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleBackgroundColorChange(preset)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: preset === '#00000000' ? 'transparent' : preset,
                backgroundImage: preset === '#00000000' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : undefined,
                backgroundSize: preset === '#00000000' ? '8px 8px' : undefined,
                border: backgroundColor === preset ? '2px solid var(--accent)' : '1px solid #D1D5DB',
                cursor: 'pointer',
              }}
              title={preset === '#00000000' ? 'Transparent' : preset}
            />
          ))}
        </div>
      </div>

      {/* Border Color */}
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
            placeholder="#000000"
            style={{ flexGrow: 1 }}
          />
        </div>
        {/* Presets */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
          {['#D1D5DB', '#9CA3AF', '#6366F1', '#10B981', '#EF4444', '#F59E0B', '#111827'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleBorderColorChange(preset)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: preset,
                border: borderColor === preset ? '2px solid var(--accent)' : '1px solid #D1D5DB',
                cursor: 'pointer',
              }}
              title={preset}
            />
          ))}
        </div>
      </div>

      {/* Border Style */}
      <div className="form-group">
        <label className="form-label">Border Style</label>
        <select
          className="form-input"
          value={borderStyle}
          onChange={(e) => handleBorderStyleChange(e.target.value as any)}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="none">None</option>
        </select>
      </div>

      {/* Border Radius */}
      <div className="form-group">
        <label className="form-label">Border Radius ({borderRadius}px)</label>
        <input
          type="range"
          min="0"
          max="24"
          className="form-input"
          style={{ padding: '4px 0' }}
          value={borderRadius}
          onChange={(e) => handleBorderRadiusChange(Number(e.target.value))}
        />
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
          <Trash2 className="icon icon-wiggle-hover" size={14} /> Delete Markdown
        </button>
      </div>
    </form>
  );
};
export default MarkdownConfig;
