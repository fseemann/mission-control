import React, { useState, useEffect, useRef } from 'react';
import { useWidgetStore } from '../store/useWidgetStore';
import { EnvVar, Widget } from '@mc/shared';

const DEFAULT_CODE_TEMPLATE = `// Write your health check script here.
// Must export an async run(ctx) function that returns:
// { status: 'ok' | 'degraded' | 'fail', message?: string, output?: any }
// Use ctx.KEY to access environment variables.

export async function run(ctx) {
  const url = ctx.TARGET_URL || 'https://httpbin.org/status/200';
  
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
  const selectedWidgetId = useWidgetStore((state) => state.selectedWidgetId);
  const widgets = useWidgetStore((state) => state.widgets);
  const selectWidget = useWidgetStore((state) => state.selectWidget);
  const send = useWidgetStore((state) => state.send);

  const widget = selectedWidgetId ? widgets.get(selectedWidgetId) : null;

  // Local form state
  const [label, setLabel] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [code, setCode] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

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

  // Sync local form state when selected widget changes (or is loaded for the first time)
  useEffect(() => {
    if (widget) {
      if (loadedWidgetIdRef.current !== widget._id) {
        setLabel(widget.label || '');
        setCronExpression(widget.cronExpression || '');
        setTimeoutMs(widget.timeoutMs ?? 10000);
        setCode(widget.code || DEFAULT_CODE_TEMPLATE);
        setEnvVars(widget.envVars ? JSON.parse(JSON.stringify(widget.envVars)) : []);
        
        // Sync style fields
        const style = widget.style || {};
        setFontSize(style.fontSize ?? 16);
        setColor(style.color ?? '#111827');
        setBackgroundColor(style.backgroundColor ?? '#EEF2F6');
        setBorderColor(style.borderColor ?? '#D1D5DB');
        setBorderStyle(style.borderStyle ?? 'solid');
        setBorderRadius(style.borderRadius ?? 8);
        setWidth(style.width ?? 200);
        setHeight(style.height ?? 150);

        loadedWidgetIdRef.current = widget._id;
      }
    } else {
      loadedWidgetIdRef.current = null;
    }
  }, [widget]);

  if (!widget) {
    return (
      <div className="config-panel">
        {/* Render empty or closed config panel */}
      </div>
    );
  }

  const isWidget = !widget.type || widget.type === 'widget';
  const isLabel = widget.type === 'label';
  const isRectangle = widget.type === 'rectangle';

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
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleUpdateEnvRow = (index: number, field: keyof EnvVar, val: string) => {
    const next = [...envVars];
    next[index] = { ...next[index], [field]: val };
    setEnvVars(next);
  };

  const handleDeleteEnvRow = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty rows
    const cleanedEnv = envVars.filter((v) => v.key.trim() !== '');

    const stylePayload: any = {};
    if (isLabel) {
      stylePayload.fontSize = Number(fontSize);
      stylePayload.color = color;
    } else if (isRectangle) {
      stylePayload.width = Number(width);
      stylePayload.height = Number(height);
      stylePayload.backgroundColor = backgroundColor;
      stylePayload.borderColor = borderColor;
      stylePayload.borderStyle = borderStyle;
      stylePayload.borderRadius = Number(borderRadius);
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
    const itemType = isLabel ? 'label' : isRectangle ? 'rectangle' : 'widget';
    if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
      send({ type: 'widget:delete', id: widget._id });
      selectWidget(null);
    }
  };

  return (
    <div className={`config-panel ${selectedWidgetId ? 'open' : ''}`}>
      <div className="config-header">
        <h3 className="config-title">
          Configure {isLabel ? 'Label' : isRectangle ? 'Rectangle' : 'Widget'}
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
              {isLabel ? 'Text Content' : isRectangle ? 'Title (Optional)' : 'Label'}
            </label>
            {isLabel ? (
              <textarea
                className="form-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Type label text here..."
                rows={3}
                required
              />
            ) : (
              <input
                type="text"
                className="form-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={isRectangle ? 'e.g. Database Group' : 'e.g. Ping Web Gateway'}
                required={!isRectangle}
              />
            )}
          </div>

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
                      <th>Value (Secret)</th>
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
                        <td>
                          <input
                            type="password"
                            className="form-input"
                            placeholder="Value"
                            value={v.value}
                            onChange={(e) => handleUpdateEnvRow(i, 'value', e.target.value)}
                            required={v.key.trim() !== ''}
                          />
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
                <label className="form-label">Script Code (TypeScript)</label>
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

          {/* Label Specific Fields */}
          {isLabel && (
            <>
              {/* Font Size Selector */}
              <div className="form-group">
                <label className="form-label">Font Size (px)</label>
                <select
                  className="form-input"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
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
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
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
                      onClick={() => setColor(preset)}
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

          {/* Rectangle Specific Fields */}
          {isRectangle && (
            <>
              {/* Dimensions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Width (px)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    min={50}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Height (px)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min={50}
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
                    onChange={(e) => setBackgroundColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
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
                      onClick={() => setBackgroundColor(preset)}
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
                    onChange={(e) => setBorderColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
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
                      onClick={() => setBorderColor(preset)}
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
                  onChange={(e) => setBorderStyle(e.target.value as any)}
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
                  onChange={(e) => setBorderRadius(Number(e.target.value))}
                />
              </div>
            </>
          )}

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
              🗑️ Delete {isLabel ? 'Label' : isRectangle ? 'Rectangle' : 'Widget'}
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
