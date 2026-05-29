import React, { useState, useEffect } from 'react';
import { Widget, EnvVar } from '@mc/shared';
import { useWidgetStore } from '../store/useWidgetStore';
import { humanizeCron } from '../utils/cron';
import { EnvVarTable } from './EnvVarTable';
import { Lock, HelpCircle, Save, Zap, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

interface ScriptConfigProps {
  widget: Widget;
  send: (msg: any) => void;
  selectWidget: (id: string | null) => void;
  triggerReactiveUpdate: (updatedFields: Partial<Widget>, updatedStyle?: any) => void;
  isHelpOpen: boolean;
  helpTab: string;
  setHelpOpen: (open: boolean, tab?: 'scripting' | 'edges' | 'canvas') => void;
  handleSave: (e: React.FormEvent, localData: { label: string; locked: boolean; cronExpression: string; timeoutMs: number; code: string; envVars: EnvVar[] }) => void;
  handleDeleteWidget: () => void;
}

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

export const ScriptConfig: React.FC<ScriptConfigProps> = ({
  widget,
  send,
  selectWidget,
  triggerReactiveUpdate,
  isHelpOpen,
  helpTab,
  setHelpOpen,
  handleSave,
  handleDeleteWidget,
}) => {
  const [label, setLabel] = useState('');
  const [locked, setLocked] = useState(false);
  const [cronExpression, setCronExpression] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [code, setCode] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  useEffect(() => {
    setLabel(widget.label || '');
    setLocked(!!widget.locked);
    setCronExpression(widget.cronExpression || '');
    setTimeoutMs(widget.timeoutMs ?? 10000);
    setCode(widget.code || DEFAULT_CODE_TEMPLATE);
    setEnvVars(widget.envVars ? JSON.parse(JSON.stringify(widget.envVars)) : []);
  }, [widget]);

  const handleLabelChange = (newVal: string) => {
    setLabel(newVal);
  };

  const handleLockedChange = (newVal: boolean) => {
    setLocked(newVal);
    triggerReactiveUpdate({ locked: newVal });
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

  const onSubmit = (e: React.FormEvent) => {
    // Filter out empty rows
    const cleanedEnv = envVars.filter((v) => v.key.trim() !== '');
    handleSave(e, {
      label,
      locked,
      cronExpression: cronExpression.trim() ? cronExpression : '',
      timeoutMs: Number(timeoutMs),
      code,
      envVars: cleanedEnv,
    });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Label */}
      <div className="form-group">
        <label className="form-label">Label</label>
        <input
          type="text"
          className="form-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="e.g. Ping Web Gateway"
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

      {/* Environment Variables Table */}
      <EnvVarTable
        envVars={envVars}
        widgetEnvVars={widget.envVars}
        onChange={setEnvVars}
      />

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
              textDecoration: 'underline',
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
            <HelpCircle className="icon" size={12} />
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

      {/* Form actions */}
      <div className="config-actions">
        <button type="submit" className="action-btn action-btn-save">
          <Save className="icon" size={14} /> Save Config
        </button>
        <button type="button" className="action-btn action-btn-run" onClick={handleRunNow}>
          <Zap className="icon" size={14} /> Run Now
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '-6px' }}>
        <button type="button" className="action-btn action-btn-delete" onClick={handleDeleteWidget}>
          <Trash2 className="icon icon-wiggle-hover" size={14} /> Delete Widget
        </button>
      </div>

      {/* Last execution results */}
      <details className="result-details" open={!!widget.lastResult}>
        <summary className="result-summary">
          <span>Last Execution Result</span>
          <span>{widget.lastResult ? <ChevronDown className="icon" size={14} /> : <ChevronRight className="icon" size={14} />}</span>
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
    </form>
  );
};
export default ScriptConfig;
