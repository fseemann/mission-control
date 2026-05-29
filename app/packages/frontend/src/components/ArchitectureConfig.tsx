import React, { useState, useEffect } from 'react';
import { Widget } from '@mc/shared';
import { Lock, Save, Trash2 } from 'lucide-react';

interface ArchitectureConfigProps {
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

export const ArchitectureConfig: React.FC<ArchitectureConfigProps> = ({
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
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [borderColor, setBorderColor] = useState('#4F46E5');
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted' | 'none'>('solid');
  const [borderRadius, setBorderRadius] = useState(8);
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState('#111827');
  const [bold, setBold] = useState(false);
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(80);

  useEffect(() => {
    setLabel(widget.label || '');
    setLocked(!!widget.locked);
    const style = widget.style || {};
    setBackgroundColor(style.backgroundColor ?? '#FFFFFF');
    setBorderColor(style.borderColor ?? '#4F46E5');
    setBorderStyle(style.borderStyle ?? 'solid');
    setBorderRadius(style.borderRadius ?? 8);
    setFontSize(style.fontSize ?? 14);
    setColor(style.color ?? '#111827');
    setBold(!!style.bold);
    setWidth(style.width ?? 160);
    setHeight(style.height ?? 80);
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

  const handleBorderStyleChange = (newVal: any) => {
    setBorderStyle(newVal);
    triggerReactiveUpdate({}, { borderStyle: newVal });
  };

  const handleBorderRadiusChange = (newVal: number) => {
    setBorderRadius(newVal);
    triggerReactiveUpdate({}, { borderRadius: newVal });
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
      width: Number(width),
      height: Number(height),
      backgroundColor,
      borderColor,
      borderStyle,
      borderRadius: Number(borderRadius),
      fontSize: Number(fontSize),
      color,
      bold,
    };
    handleSave(e, { label, locked, style });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="form-group">
        <label className="form-label">Component Label</label>
        <input
          type="text"
          className="form-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="e.g. Web Server"
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
            min={30}
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
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Border Radius (px)</label>
          <input
            type="number"
            className="form-input"
            value={borderRadius}
            onChange={(e) => handleBorderRadiusChange(Number(e.target.value))}
            min={0}
            max={50}
          />
        </div>
      </div>

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
            style={{ flexGrow: 1 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Font Size (px)</label>
          <input
            type="number"
            className="form-input"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            min={8}
            max={32}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end', height: '38px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={bold}
              onChange={(e) => handleBoldChange(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
            />
            <span>Bold Text</span>
          </label>
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

      <div className="config-actions">
        <button type="submit" className="action-btn action-btn-save">
          <Save className="icon" size={14} /> Save Config
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
        <button type="button" className="action-btn action-btn-delete" onClick={handleDeleteWidget}>
          <Trash2 className="icon icon-delete icon-wiggle-hover" size={14} /> Delete Component
        </button>
      </div>
    </form>
  );
};

export default ArchitectureConfig;
