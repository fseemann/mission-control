import React from 'react';
import { EnvVar, Widget } from '@mc/shared';
import { Trash2, Plus } from 'lucide-react';

interface EnvVarTableProps {
  envVars: EnvVar[];
  widgetEnvVars?: EnvVar[];
  onChange: (updatedEnvVars: EnvVar[]) => void;
}

export const EnvVarTable: React.FC<EnvVarTableProps> = ({
  envVars,
  widgetEnvVars,
  onChange,
}) => {
  const handleAddEnvRow = () => {
    onChange([...envVars, { key: '', value: '', isSecret: true }]);
  };

  const handleUpdateEnvRow = (index: number, field: keyof EnvVar, val: any) => {
    const next = [...envVars];
    next[index] = { ...next[index], [field]: val };
    onChange(next);
  };

  const handleDeleteEnvRow = (index: number) => {
    onChange(envVars.filter((_, i) => i !== index));
  };

  return (
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
          {envVars.map((v, i) => {
            const isSavedSecret = widgetEnvVars?.some(
              (savedVar) => savedVar.key === v.key && (savedVar.isSecret === undefined || savedVar.isSecret === true)
            );
            return (
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
                    type={v.isSecret !== false ? 'password' : 'text'}
                    className="form-input"
                    placeholder={v.isSecret !== false ? 'Secret Value' : 'Value'}
                    value={v.value}
                    onChange={(e) => handleUpdateEnvRow(i, 'value', e.target.value)}
                    required={v.key.trim() !== ''}
                  />
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <input
                    type="checkbox"
                    checked={v.isSecret !== false}
                    disabled={isSavedSecret}
                    onChange={(e) => handleUpdateEnvRow(i, 'isSecret', e.target.checked)}
                    title={
                      isSavedSecret
                        ? 'Saved secrets cannot be unticked'
                        : 'Toggle secret encryption'
                    }
                    style={{
                      cursor: isSavedSecret ? 'not-allowed' : 'pointer',
                      width: '16px',
                      height: '16px',
                      margin: 0,
                    }}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="env-row-delete-btn"
                    onClick={() => handleDeleteEnvRow(i)}
                    title="Remove Variable"
                  >
                    <Trash2 className="icon icon-delete" size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" className="add-row-btn" onClick={handleAddEnvRow}>
        <Plus className="icon" size={14} /> Add Variable
      </button>
    </div>
  );
};
