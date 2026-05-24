import React from 'react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <span className="widget-icon">🛰️</span>
            Mission Control
          </h2>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section-title">Available Widgets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div
              className="draggable-widget"
              draggable
              onDragStart={(e) => onDragStart(e, 'widgetNode')}
              title="Drag onto canvas to create a new status widget"
            >
              <span className="widget-icon">🟢</span>
              <div>
                <strong>Status Widget</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Runs health-check script
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section-title">Visual Elements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              className="draggable-widget"
              draggable
              onDragStart={(e) => onDragStart(e, 'labelNode')}
              title="Drag onto canvas to create a text label annotation"
            >
              <span className="widget-icon">📝</span>
              <div>
                <strong>Text Label</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Canvas text annotation
                </div>
              </div>
            </div>

            <div
              className="draggable-widget"
              draggable
              onDragStart={(e) => onDragStart(e, 'rectangleNode')}
              title="Drag onto canvas to create a visual grouping container"
            >
              <span className="widget-icon">⬜</span>
              <div>
                <strong>Rectangle</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Resizable layout divider
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Collapse button floating in space */}
      <button 
        className="sidebar-toggle-btn" 
        onClick={onToggle}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        aria-label="Toggle Sidebar"
      >
        {isCollapsed ? '➡️' : '⬅️'}
      </button>
    </>
  );
};

export default Sidebar;
