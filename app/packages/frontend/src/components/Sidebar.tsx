import React from 'react';
import { useWidgetStore } from '../store/useWidgetStore';
import { Satellite, Target, Activity, Type, Square, FileText, Link, Palette, Network, Layers } from 'lucide-react';

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
            <span className="widget-icon"><Satellite className="icon icon-spin-hover" size={18} /></span>
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
              <span className="widget-icon"><Target className="icon icon-target" size={16} /></span>
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
              title="Drag onto canvas to create a new status"
            >
              <span className="widget-icon"><Activity className="icon icon-status" size={16} /></span>
              <div>
                <strong>Status</strong>
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
              <span className="widget-icon"><Type className="icon" size={16} /></span>
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
              <span className="widget-icon"><Square className="icon" size={16} /></span>
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
              <span className="widget-icon"><FileText className="icon" size={16} /></span>
              <div>
                <strong>Markdown</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Rich-text canvas card
                </div>
              </div>
            </div>

            <div
              className="draggable-widget"
              draggable
              onDragStart={(e) => onDragStart(e, 'architectureNode')}
              title="Drag onto canvas to create an architecture diagram component"
            >
              <span className="widget-icon"><Network className="icon" size={16} /></span>
              <div>
                <strong>Architecture</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Connectable system block
                </div>
              </div>
            </div>

            <div
              className="draggable-widget"
              draggable
              onDragStart={(e) => onDragStart(e, 'useCaseNode')}
              title="Drag onto canvas to highlight diagram paths"
            >
              <span className="widget-icon"><Layers className="icon animate-pulse" size={16} /></span>
              <div>
                <strong>Use Case</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Highlights specific edges
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
              <Satellite className="icon" size={14} style={{ marginRight: '6px' }} />
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
              <Link className="icon" size={14} style={{ marginRight: '6px' }} />
              <span>Edge Connections</span>
            </button>
            <button
              type="button"
              className="sidebar-help-btn"
              onClick={() => {
                if (isHelpOpen && helpTab === 'canvas') {
                  setHelpOpen(false);
                } else {
                  setHelpOpen(true, 'canvas');
                }
              }}
              title="Toggle canvas controls, navigation, and shortcuts guide"
              style={{ marginTop: 0 }}
            >
              <Palette className="icon" size={14} style={{ marginRight: '6px' }} />
              <span>Canvas Guide</span>
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
