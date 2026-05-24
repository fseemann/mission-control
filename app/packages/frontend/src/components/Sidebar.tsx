import React from 'react';
import { useWidgetStore } from '../store/useWidgetStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const isHelpOpen = useWidgetStore((state) => state.isHelpOpen);
  const helpTab = useWidgetStore((state) => state.helpTab);
  const setHelpOpen = useWidgetStore((state) => state.setHelpOpen);

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
          <div className="sidebar-section-title">Widgets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div
              className="draggable-widget"
              draggable
              onDragStart={(e) => onDragStart(e, 'milestoneNode')}
              title="Drag onto canvas to create a new goal milestone"
            >
              <span className="widget-icon">🎯</span>
              <div>
                <strong>Milestone</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Track goals and linked statuses
                </div>
              </div>
            </div>

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
              title="Drag onto canvas to create a label annotation"
            >
              <span className="widget-icon">📝</span>
              <div>
                <strong>Label</strong>
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

            <div
              className="draggable-widget"
              draggable
              onDragStart={(e) => onDragStart(e, 'markdownNode')}
              title="Drag onto canvas to create a markdown card"
            >
              <span className="widget-icon">📄</span>
              <div>
                <strong>Markdown</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Rich-text canvas card
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section-title" style={{ marginTop: '28px' }}>Help & Docs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              className="sidebar-help-btn"
              onClick={() => {
                if (isHelpOpen && helpTab === 'scripting') {
                  setHelpOpen(false);
                } else {
                  setHelpOpen(true, 'scripting');
                }
              }}
              title="Toggle status widget scripting guide and code examples"
              style={{ marginTop: 0 }}
            >
              <span>🛰️</span>
              <span>Scripting Guide</span>
            </button>
            <button
              type="button"
              className="sidebar-help-btn"
              onClick={() => {
                if (isHelpOpen && helpTab === 'edges') {
                  setHelpOpen(false);
                } else {
                  setHelpOpen(true, 'edges');
                }
              }}
              title="Toggle edge connection and deletion guide"
              style={{ marginTop: 0 }}
            >
              <span>🔗</span>
              <span>Edge Connections</span>
            </button>
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
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`sidebar-toggle-icon ${isCollapsed ? 'collapsed' : ''}`}
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    </>
  );
};

export default Sidebar;
