import React, { useState, useEffect, useRef } from 'react';
import { useWidgetStore } from '../store/useWidgetStore';
import { EnvVar, Widget, MilestoneItem } from '@mc/shared';

const DEFAULT_CODE_TEMPLATE = `// Write your health check script here.
// Must export an async run({ env }) function that returns:
// { status: 'ok' | 'degraded' | 'fail', message?: string, output?: any }
// Use env.KEY to access environment variables.

export async function run({ env }) {
  const url = env.TARGET_URL || 'https://httpbin.org/status/200';
  
  try {
    const start = Date.now();
    const res = await fetch(url);
    const duration = Date.now() - start;
    
    if (res.ok) {
      return {
        status: 'ok',
        message: \`Successfully pinged \${url} in \${duration}ms\`,
        output: { status: res.status, ok: res.ok }
      };
    } else {
      return {
        status: 'degraded',
        message: \`Pinged \${url} but got status \${res.status}\`,
        output: { status: res.status }
      };
    }
  } catch (err) {
    return {
      status: 'fail',
      message: \`Failed to connect to \${url}: \${err.message}\`
    };
  }
}`;

export const ConfigPanel: React.FC = () => {
  const selectedWidgetIds = useWidgetStore((state) => state.selectedWidgetIds || []);
  const widgets = useWidgetStore((state) => state.widgets);
  const selectWidget = useWidgetStore((state) => state.selectWidget);
  const send = useWidgetStore((state) => state.send);
  const isHelpOpen = useWidgetStore((state) => state.isHelpOpen);
  const helpTab = useWidgetStore((state) => state.helpTab);
  const setHelpOpen = useWidgetStore((state) => state.setHelpOpen);

  const selectedWidgetId = selectedWidgetIds.length === 1 ? selectedWidgetIds[0] : null;
  const widget = selectedWidgetId ? widgets.get(selectedWidgetId) : null;

  // Local form state
  const [label, setLabel] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [code, setCode] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [milestoneItems, setMilestoneItems] = useState<MilestoneItem[]>([]);

  // Visual style state
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#111827');
  const [backgroundColor, setBackgroundColor] = useState('#EEF2F6');
  const [borderColor, setBorderColor] = useState('#D1D5DB');
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted' | 'none'>('solid');
  const [borderRadius, setBorderRadius] = useState(8);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(150);

  // Ref to track which widget is loaded
  const loadedWidgetIdRef = useRef<string | null>(null);

  // Milestone item helpers for HTML5 Drag-and-Drop sorting
  const draggedIndexRef = useRef<number | null>(null);

  // Sync local form state when selected widget changes (or is loaded for the first time)
  useEffect(() => {
    if (widget) {
      if (loadedWidgetIdRef.current !== widget._id) {
        setLabel(widget.label || '');
        setCronExpression(widget.cronExpression || '');
        setTimeoutMs(widget.timeoutMs ?? 10000);
        setCode(widget.code || DEFAULT_CODE_TEMPLATE);
        setEnvVars(widget.envVars ? JSON.parse(JSON.stringify(widget.envVars)) : []);
        setMilestoneItems(widget.milestoneItems ? JSON.parse(JSON.stringify(widget.milestoneItems)) : []);
        
        // Sync style fields
        const style = widget.style || {};
        setFontSize(style.fontSize ?? (widget.type === 'markdown' ? 14 : 16));
        setColor(style.color ?? '#111827');
        setBackgroundColor(style.backgroundColor ?? (widget.type === 'markdown' ? '#FFFFFF' : '#EEF2F6'));
        setBorderColor(style.borderColor ?? (widget.type === 'markdown' ? '#E5E7EB' : '#D1D5DB'));
        setBorderStyle(style.borderStyle ?? 'solid');
        setBorderRadius(style.borderRadius ?? 8);
        setWidth(style.width ?? (widget.type === 'markdown' ? 300 : widget.type === 'rectangle' ? 200 : 150));
        setHeight(style.height ?? (widget.type === 'markdown' ? 200 : widget.type === 'rectangle' ? 150 : 60));

        loadedWidgetIdRef.current = widget._id;
      }
    } else {
      loadedWidgetIdRef.current = null;
    }
  }, [widget]);

  // Sync width/height from store updates (e.g., when resized on canvas)
  useEffect(() => {
    if (widget && widget.style) {
      if (widget.style.width !== undefined) setWidth(widget.style.width);
      if (widget.style.height !== undefined) setHeight(widget.style.height);
    }
  }, [widget?.style?.width, widget?.style?.height]);

  // Ref for debouncing websocket sends
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Flush any pending updates when widget selection changes
  useEffect(() => {
    if (debounceTimerRef.current && loadedWidgetIdRef.current) {
      const prevWidgetId = loadedWidgetIdRef.current;
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;

      // Find the widget from the store to get the latest style payload
      const prevWidget = widgets.get(prevWidgetId);
      if (prevWidget) {
        const stylePayload: any = { ...prevWidget.style };
        if (prevWidget.type === 'label') {
          stylePayload.fontSize = Number(fontSize);
          stylePayload.color = color;
          stylePayload.width = Number(width);
          stylePayload.height = Number(height);
        } else if (prevWidget.type === 'rectangle') {
          stylePayload.width = Number(width);
          stylePayload.height = Number(height);
          stylePayload.backgroundColor = backgroundColor;
          stylePayload.borderColor = borderColor;
          stylePayload.borderStyle = borderStyle;
          stylePayload.borderRadius = Number(borderRadius);
        } else if (prevWidget.type === 'markdown') {
          stylePayload.fontSize = Number(fontSize);
          stylePayload.color = color;
          stylePayload.width = Number(width);
          stylePayload.height = Number(height);
          stylePayload.backgroundColor = backgroundColor;
          stylePayload.borderColor = borderColor;
          stylePayload.borderStyle = borderStyle;
          stylePayload.borderRadius = Number(borderRadius);
        } else if (prevWidget.type === 'milestone') {
          stylePayload.width = Number(width);
          stylePayload.height = Number(height);
        }

        const updatePayload: any = {
          label,
          style: stylePayload,
        };
        if (prevWidget.type === 'milestone') {
          updatePayload.milestoneItems = milestoneItems;
        }

        send({
          type: 'widget:update',
          id: prevWidgetId,
          payload: updatePayload,
        });
      }
    }
  }, [selectedWidgetId]);

  if (selectedWidgetIds.length === 0) {
    return (
      <div className="config-panel">
        {/* Render empty or closed config panel */}
      </div>
    );
  }

  if (selectedWidgetIds.length > 1) {
    // Render bulk action panel
    const selectedWidgets = selectedWidgetIds.map(id => widgets.get(id)).filter(Boolean) as Widget[];
    
    // Group them by type to display count summary
    const countByType: Record<string, number> = {};
    selectedWidgets.forEach((w) => {
      const typeLabel = w.type === 'label'
        ? 'Label'
        : w.type === 'rectangle'
        ? 'Rectangle'
        : w.type === 'markdown'
        ? 'Markdown'
        : w.type === 'milestone'
        ? 'Milestone'
        : 'Widget';
      countByType[typeLabel] = (countByType[typeLabel] || 0) + 1;
    });

    const summaryText = Object.entries(countByType)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    const handleBulkDelete = () => {
      if (confirm(`Are you sure you want to delete these ${selectedWidgets.length} elements?`)) {
        selectedWidgets.forEach((w) => {
          send({ type: 'widget:delete', id: w._id });
        });
        selectWidget(null);
      }
    };

    return (
      <div className="config-panel open">
        <div className="config-header">
          <h3 className="config-title">Bulk Actions</h3>
          <button className="close-btn" onClick={() => selectWidget(null)} title="Close Panel">
            &times;
          </button>
        </div>
        <div className="config-body">
          <div className="bulk-selection-summary">
            <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>📦</span>
            <div className="bulk-selection-count">
              <strong>{selectedWidgets.length} elements selected</strong>
            </div>
            <div className="bulk-selection-details">
              ({summaryText})
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              className="action-btn action-btn-delete"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={handleBulkDelete}
            >
              🗑️ Delete Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isWidget = !widget.type || widget.type === 'widget';
  const isLabel = widget.type === 'label';
  const isRectangle = widget.type === 'rectangle';
  const isMarkdown = widget.type === 'markdown';
  const isMilestone = widget.type === 'milestone';

  // General reactive update helper
  const triggerReactiveUpdate = (updatedFields: Partial<Widget>, updatedStyle?: any) => {
    if (!widget) return;

    // 1. Instantly update the local Zustand store so changes render in real-time
    useWidgetStore.setState((state) => {
      const next = new Map(state.widgets);
      const w = next.get(widget._id);
      if (w) {
        const nextStyle = updatedStyle !== undefined ? { ...w.style, ...updatedStyle } : w.style;
        next.set(widget._id, {
          ...w,
          ...updatedFields,
          style: nextStyle,
        });
      }
      return { widgets: next };
    });

    // 2. Debounce the WebSocket message to the server (250ms)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const payload: any = {
        ...updatedFields,
      };
      if (updatedStyle !== undefined) {
        payload.style = {
          ...(widget.style || {}),
          ...updatedStyle,
        };
      }
      send({
        type: 'widget:update',
        id: widget._id,
        payload,
      });
      debounceTimerRef.current = null;
    }, 250);
  };

  // Specific event handlers that trigger reactive updates
  const handleLabelChange = (newVal: string) => {
    setLabel(newVal);
    if (isLabel || isRectangle || isMarkdown) {
      triggerReactiveUpdate({ label: newVal });
    }
  };

  const handleFontSizeChange = (newVal: number) => {
    setFontSize(newVal);
    if (isLabel || isMarkdown) {
      triggerReactiveUpdate({}, { fontSize: newVal });
    }
  };

  const handleColorChange = (newVal: string) => {
    setColor(newVal);
    if (isLabel || isMarkdown) {
      triggerReactiveUpdate({}, { color: newVal });
    }
  };

  const handleBackgroundColorChange = (newVal: string) => {
    setBackgroundColor(newVal);
    if (isRectangle || isMarkdown) {
      triggerReactiveUpdate({}, { backgroundColor: newVal });
    }
  };

  const handleBorderColorChange = (newVal: string) => {
    setBorderColor(newVal);
    if (isRectangle || isMarkdown) {
      triggerReactiveUpdate({}, { borderColor: newVal });
    }
  };

  const handleBorderStyleChange = (newVal: any) => {
    setBorderStyle(newVal);
    if (isRectangle || isMarkdown) {
      triggerReactiveUpdate({}, { borderStyle: newVal });
    }
  };

  const handleBorderRadiusChange = (newVal: number) => {
    setBorderRadius(newVal);
    if (isRectangle || isMarkdown) {
      triggerReactiveUpdate({}, { borderRadius: newVal });
    }
  };

  const handleWidthChange = (newVal: number) => {
    setWidth(newVal);
    if (isLabel || isRectangle || isMarkdown) {
      triggerReactiveUpdate({}, { width: newVal });
    }
  };

  const handleHeightChange = (newVal: number) => {
    setHeight(newVal);
    if (isLabel || isRectangle || isMarkdown) {
      triggerReactiveUpdate({}, { height: newVal });
    }
  };

  const allZIndexes = Array.from(widgets.values()).map(w => w.style?.zIndex ?? (w.type === 'rectangle' ? 0 : 1));
  const maxZ = Math.max(...allZIndexes, 1);
  const minZ = Math.min(...allZIndexes, 0);
  const currentZ = widget.style?.zIndex ?? (widget.type === 'rectangle' ? 0 : 1);

  // Simple humanizer for Cron expression
  const humanizeCron = (cron: string): string => {
    if (!cron.trim()) return 'Manual run only';
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      return 'Invalid: must have exactly 5 fields (min hour day month day-of-week)';
    }
    const [min, hour, day, month, dayOfWeek] = parts;

    if (min === '*' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return 'Runs every minute';
    }
    if (min.startsWith('*/') && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      const m = min.slice(2);
      return `Runs every ${m} minutes`;
    }
    if (min === '0' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return 'Runs every hour at minute 0';
    }
    if (min === '0' && hour.startsWith('*/') && day === '*' && month === '*' && dayOfWeek === '*') {
      const h = hour.slice(2);
      return `Runs every ${h} hours at minute 0`;
    }
    if (min === '0' && hour === '0' && day === '*' && month === '*' && dayOfWeek === '*') {
      return 'Runs daily at midnight';
    }
    return `Custom cron expression: ${cron}`;
  };

  const handleAddEnvRow = () => {
    setEnvVars([...envVars, { key: '', value: '', isSecret: true }]);
  };

  const handleUpdateEnvRow = (index: number, field: keyof EnvVar, val: any) => {
    const next = [...envVars];
    next[index] = { ...next[index], [field]: val };
    setEnvVars(next);
  };

  const handleDeleteEnvRow = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  // Milestone item helpers for HTML5 Drag-and-Drop sorting
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Cancel any pending debounced update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Filter out empty rows
    const cleanedEnv = envVars.filter((v) => v.key.trim() !== '');

    const stylePayload: any = {
      ...widget.style,
    };
    if (isLabel) {
      stylePayload.fontSize = Number(fontSize);
      stylePayload.color = color;
      stylePayload.width = Number(width);
      stylePayload.height = Number(height);
    } else if (isRectangle) {
      stylePayload.width = Number(width);
      stylePayload.height = Number(height);
      stylePayload.backgroundColor = backgroundColor;
      stylePayload.borderColor = borderColor;
      stylePayload.borderStyle = borderStyle;
      stylePayload.borderRadius = Number(borderRadius);
    } else if (isMarkdown) {
      stylePayload.fontSize = Number(fontSize);
      stylePayload.color = color;
      stylePayload.width = Number(width);
      stylePayload.height = Number(height);
      stylePayload.backgroundColor = backgroundColor;
      stylePayload.borderColor = borderColor;
      stylePayload.borderStyle = borderStyle;
      stylePayload.borderRadius = Number(borderRadius);
    } else if (isMilestone) {
      stylePayload.width = Number(width);
      stylePayload.height = Number(height);
    }

    let updatePayload: any = {
      label,
    };

    if (isWidget) {
      updatePayload = {
        ...updatePayload,
        cronExpression: cronExpression.trim() ? cronExpression : '',
        timeoutMs: Number(timeoutMs),
        code,
        envVars: cleanedEnv,
      };
    } else if (isMilestone) {
      updatePayload = {
        ...updatePayload,
        milestoneItems,
        style: stylePayload,
      };
    } else {
      updatePayload.style = stylePayload;
    }

    send({
      type: 'widget:update',
      id: widget._id,
      payload: updatePayload,
    });
  };

  const handleRunNow = () => {
    send({ type: 'widget:run', id: widget._id });

    // Optimistic local update to 'running' for instant visual pulse feedback
    useWidgetStore.setState((state) => {
      const next = new Map(state.widgets);
      const w = next.get(widget._id);
      if (w) {
        next.set(widget._id, { ...w, status: 'running' });
      }
      return { widgets: next };
    });
  };

  const handleDeleteWidget = () => {
    const itemType = isLabel ? 'label' : isRectangle ? 'rectangle' : isMarkdown ? 'markdown' : isMilestone ? 'milestone' : 'widget';
    if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
      send({ type: 'widget:delete', id: widget._id });
      selectWidget(null);
    }
  };

  return (
    <div className={`config-panel ${selectedWidgetIds.length > 0 ? 'open' : ''}`}>
      <div className="config-header">
        <h3 className="config-title">
          Configure {isLabel ? 'Label' : isRectangle ? 'Rectangle' : isMarkdown ? 'Markdown' : isMilestone ? 'Milestone' : 'Widget'}
        </h3>
        <button className="close-btn" onClick={() => selectWidget(null)} title="Close Panel">
          &times;
        </button>
      </div>

      <div className="config-body">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Label / Text field */}
          <div className="form-group">
            <label className="form-label">
              {isLabel ? 'Text Content' : isRectangle ? 'Title (Optional)' : isMarkdown ? 'Markdown Content' : 'Label'}
            </label>
            {isLabel || isMarkdown ? (
              <textarea
                className="form-input"
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder={isMarkdown ? "Type markdown here..." : "Type label text here..."}
                rows={isMarkdown ? 14 : 3}
                required
              />
            ) : (
              <input
                type="text"
                className="form-input"
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder={isRectangle ? 'e.g. Database Group' : isMilestone ? 'e.g. v1.0 Launch' : 'e.g. Ping Web Gateway'}
                required={!isRectangle}
              />
            )}
          </div>

          {/* Milestone checklist editor */}
          {isMilestone && (
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

                    {/* Checkbox (display only / visual state) */}
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
          )}

          {/* Widget Specific Fields */}
          {isWidget && (
            <>
              {/* Cron Field */}
              <div className="form-group">
                <label className="form-label">Cron Expression</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    className="form-input"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="e.g. */5 * * * *"
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setCronExpression('')}
                    disabled={!cronExpression}
                  >
                    Clear
                  </button>
                </div>
                <span className="live-hint">{humanizeCron(cronExpression)}</span>
              </div>

              {/* Timeout Field */}
              <div className="form-group">
                <label className="form-label">Timeout (ms)</label>
                <input
                  type="number"
                  className="form-input"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  min={100}
                  max={60000}
                  required
                />
              </div>

              {/* Environment Variables */}
              <div className="form-group">
                <label className="form-label">Environment Variables</label>
                <table className="env-vars-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Secret</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {envVars.map((v, i) => (
                      <tr key={i}>
                        <td style={{ paddingRight: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="KEY"
                            value={v.key}
                            onChange={(e) => handleUpdateEnvRow(i, 'key', e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ paddingRight: '8px' }}>
                          <input
                            type={v.isSecret !== false ? "password" : "text"}
                            className="form-input"
                            placeholder={v.isSecret !== false ? "Secret Value" : "Value"}
                            value={v.value}
                            onChange={(e) => handleUpdateEnvRow(i, 'value', e.target.value)}
                            required={v.key.trim() !== ''}
                          />
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {(() => {
                            const isSavedSecret = widget.envVars?.some(
                              (savedVar) => savedVar.key === v.key && (savedVar.isSecret === undefined || savedVar.isSecret === true)
                            );
                            return (
                              <input
                                type="checkbox"
                                checked={v.isSecret !== false}
                                disabled={isSavedSecret}
                                onChange={(e) => handleUpdateEnvRow(i, 'isSecret', e.target.checked)}
                                title={
                                  isSavedSecret
                                    ? "Saved secrets cannot be unticked"
                                    : "Toggle secret encryption"
                                }
                                style={{
                                  cursor: isSavedSecret ? 'not-allowed' : 'pointer',
                                  width: '16px',
                                  height: '16px',
                                  margin: 0
                                }}
                              />
                            );
                          })()}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="env-row-delete-btn"
                            onClick={() => handleDeleteEnvRow(i)}
                            title="Remove Variable"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="add-row-btn" onClick={handleAddEnvRow}>
                  + Add Variable
                </button>
              </div>

              {/* Code Textarea */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Script Code (TypeScript)</label>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline'
                    }}
                    onClick={() => {
                      if (isHelpOpen && helpTab === 'scripting') {
                        setHelpOpen(false);
                      } else {
                        setHelpOpen(true, 'scripting');
                      }
                    }}
                    title="Toggle scripting guide and examples"
                  >
                    <span>❓</span>
                    <span>Help & Examples</span>
                  </button>
                </div>
                <textarea
                  className="form-input code-textarea"
                  rows={12}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          {/* Text Styling (for Label & Markdown) */}
          {(isLabel || isMarkdown) && (
            <>
              {/* Font Size Selector */}
              <div className="form-group">
                <label className="form-label">Font Size (px)</label>
                <select
                  className="form-input"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                >
                  <option value={12}>12 (Small)</option>
                  <option value={14}>14 (Regular)</option>
                  <option value={16}>16 (Medium)</option>
                  <option value={20}>20 (Large)</option>
                  <option value={24}>24 (Extra Large)</option>
                  <option value={32}>32 (Title)</option>
                  <option value={40}>40 (Display)</option>
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
            </>
          )}

          {/* Dimensions (Label, Rectangle, Markdown & Milestone) */}
          {(isLabel || isRectangle || isMarkdown || isMilestone) && (
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
          )}

          {/* Container Styling (Rectangle & Markdown) */}
          {(isRectangle || isMarkdown) && (
            <>
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
            </>
          )}

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
            {isWidget && (
              <button type="button" className="action-btn action-btn-run" onClick={handleRunNow}>
                ⚡ Run Now
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
            <button type="button" className="action-btn action-btn-delete" onClick={handleDeleteWidget}>
              🗑️ Delete {isLabel ? 'Label' : isRectangle ? 'Rectangle' : isMarkdown ? 'Markdown' : isMilestone ? 'Milestone' : 'Widget'}
            </button>
          </div>
        </form>

        {/* Last execution results */}
        {isWidget && (
          <details className="result-details" open={!!widget.lastResult}>
            <summary className="result-summary">
              <span>Last Execution Result</span>
              <span>{widget.lastResult ? '🔽' : '▶️'}</span>
            </summary>
            <div className="result-content">
              {widget.lastResult ? (
                <>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`result-pill ${widget.status}`}>
                      <span className={`milestone-badge-indicator status-${widget.status}`} style={{ marginRight: '6px' }} />
                      {widget.status}
                    </span>
                    <span className="result-time">
                      {widget.lastResult.ranAt ? new Date(widget.lastResult.ranAt).toLocaleTimeString() : ''}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      ({widget.lastResult.durationMs}ms)
                    </span>
                  </div>

                  {widget.lastResult.message && (
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                      Message: {widget.lastResult.message}
                    </div>
                  )}

                  {widget.lastResult.runnerError && (
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--status-fail)' }}>
                      Runner Error: {widget.lastResult.runnerError}
                    </div>
                  )}

                  {widget.lastResult.output !== undefined && (
                    <div>
                      <div className="form-label" style={{ marginBottom: '4px' }}>JSON Output</div>
                      <pre className="result-log-pre">
                        {JSON.stringify(widget.lastResult.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  No execution details available yet. Click "Run Now" to execute.
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
