import React, { useState, useEffect, useRef } from 'react';
import { useWidgetStore } from '../store/useWidgetStore';
import { EnvVar, Widget } from '@mc/shared';

const DEFAULT_CODE_TEMPLATE = `// Write your health check script here.
// Must export an async run(ctx) function that returns:
// { status: 'ok' | 'degraded' | 'fail', message?: string, output?: any }
// Use ctx.env.KEY to access environment variables.

export async function run(ctx) {
  const url = ctx.env.TARGET_URL || 'https://httpbin.org/status/200';
  
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
    
    send({
      type: 'widget:update',
      id: widget._id,
      payload: {
        label,
        cronExpression: cronExpression.trim() ? cronExpression : undefined,
        timeoutMs: Number(timeoutMs),
        code,
        envVars: cleanedEnv,
      },
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
    if (confirm(`Are you sure you want to delete "${widget.label}"?`)) {
      send({ type: 'widget:delete', id: widget._id });
      selectWidget(null);
    }
  };

  return (
    <div className={`config-panel ${selectedWidgetId ? 'open' : ''}`}>
      <div className="config-header">
        <h3 className="config-title">Configure Widget</h3>
        <button className="close-btn" onClick={() => selectWidget(null)} title="Close Panel">
          &times;
        </button>
      </div>

      <div className="config-body">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Label Field */}
          <div className="form-group">
            <label className="form-label">Label</label>
            <input
              type="text"
              className="form-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ping Web Gateway"
              required
            />
          </div>

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

          {/* Form and Execution Action buttons */}
          <div className="config-actions">
            <button type="submit" className="action-btn action-btn-save">
              💾 Save Config
            </button>
            <button type="button" className="action-btn action-btn-run" onClick={handleRunNow}>
              ⚡ Run Now
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
            <button type="button" className="action-btn action-btn-delete" onClick={handleDeleteWidget}>
              🗑️ Delete Widget
            </button>
          </div>
        </form>

        {/* Last execution results */}
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
      </div>
    </div>
  );
};

export default ConfigPanel;
