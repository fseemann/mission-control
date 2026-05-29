import React from 'react';
import { Widget } from '@mc/shared';

interface BulkActionPanelProps {
  selectedWidgetIds: string[];
  widgets: Map<string, Widget>;
  send: (msg: any) => void;
  selectWidget: (id: string | null) => void;
}

export const BulkActionPanel: React.FC<BulkActionPanelProps> = ({
  selectedWidgetIds,
  widgets,
  send,
  selectWidget,
}) => {
  const selectedWidgets = selectedWidgetIds
    .map((id) => widgets.get(id))
    .filter(Boolean) as Widget[];

  const countByType: Record<string, number> = {};
  selectedWidgets.forEach((w) => {
    const typeLabel =
      w.type === 'label'
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
          <div className="bulk-selection-details">({summaryText})</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <button
            type="button"
            className="action-btn action-btn-delete"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onClick={handleBulkDelete}
          >
            🗑️ Delete Selection
          </button>
        </div>
      </div>
    </div>
  );
};
export default BulkActionPanel;
