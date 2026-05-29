import React, { useEffect, useRef } from 'react';
import { useWidgetStore } from '../store/useWidgetStore';
import { Widget } from '@mc/shared';
import BulkActionPanel from './BulkActionPanel';
import LabelConfig from './LabelConfig';
import RectangleConfig from './RectangleConfig';
import MarkdownConfig from './MarkdownConfig';
import MilestoneConfig from './MilestoneConfig';
import ScriptConfig from './ScriptConfig';
import ArchitectureConfig from './ArchitectureConfig';
import UseCaseConfig from './UseCaseConfig';
import EdgeConfig from './EdgeConfig';

export const ConfigPanel: React.FC = () => {
  const selectedWidgetIds = useWidgetStore((state) => state.selectedWidgetIds || []);
  const selectedEdgeId = useWidgetStore((state) => state.selectedEdgeId);
  const widgets = useWidgetStore((state) => state.widgets);
  const edges = useWidgetStore((state) => state.edges || []);
  const selectWidget = useWidgetStore((state) => state.selectWidget);
  const selectEdge = useWidgetStore((state) => state.selectEdge);
  const send = useWidgetStore((state) => state.send);
  const isHelpOpen = useWidgetStore((state) => state.isHelpOpen);
  const helpTab = useWidgetStore((state) => state.helpTab);
  const setHelpOpen = useWidgetStore((state) => state.setHelpOpen);

  const selectedWidgetId = selectedWidgetIds.length === 1 ? selectedWidgetIds[0] : null;
  const widget = selectedWidgetId ? widgets.get(selectedWidgetId) : null;

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

  if (selectedWidgetIds.length === 0 && !selectedEdgeId) {
    return (
      <div className="config-panel">
        {/* Render empty or closed config panel */}
      </div>
    );
  }

  if (selectedEdgeId) {
    const edge = edges.find((e) => e.id === selectedEdgeId);
    if (!edge) return null;

    return (
      <div className={`config-panel open`}>
        <div className="config-header">
          <h3 className="config-title">Configure Connection</h3>
          <button className="close-btn" onClick={() => selectEdge(null)} title="Close Panel">
            &times;
          </button>
        </div>
        <div className="config-body">
          <EdgeConfig
            edge={edge}
            send={send}
            selectEdge={selectEdge}
            widgets={widgets}
          />
        </div>
      </div>
    );
  }

  if (selectedWidgetIds.length > 1) {
    return (
      <BulkActionPanel
        selectedWidgetIds={selectedWidgetIds}
        widgets={widgets}
        send={send}
        selectWidget={selectWidget}
      />
    );
  }

  if (!widget) return null;

  const isWidget = !widget.type || widget.type === 'widget';
  const isLabel = widget.type === 'label';
  const isRectangle = widget.type === 'rectangle';
  const isMarkdown = widget.type === 'markdown';
  const isMilestone = widget.type === 'milestone';
  const isArchitecture = widget.type === 'architecture';
  const isUseCase = widget.type === 'usecase';

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

  const handleSave = (e: React.FormEvent, localData: any) => {
    e.preventDefault();

    // Cancel any pending debounced update
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    send({
      type: 'widget:update',
      id: widget._id,
      payload: localData,
    });
  };

  const handleDeleteWidget = () => {
    const itemType = isLabel
      ? 'label'
      : isRectangle
      ? 'rectangle'
      : isMarkdown
      ? 'markdown'
      : isMilestone
      ? 'milestone'
      : isArchitecture
      ? 'architecture component'
      : isUseCase
      ? 'use case'
      : 'widget';
    if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
      send({ type: 'widget:delete', id: widget._id });
      selectWidget(null);
    }
  };

  // Compute z-indices info for layer controls
  const allZIndexes = Array.from(widgets.values()).map(
    (w) => w.style?.zIndex ?? (w.type === 'rectangle' ? 0 : 1)
  );
  const maxZ = Math.max(...allZIndexes, 1);
  const minZ = Math.min(...allZIndexes, 0);
  const currentZ = widget.style?.zIndex ?? (widget.type === 'rectangle' ? 0 : 1);

  return (
    <div className={`config-panel ${selectedWidgetIds.length > 0 ? 'open' : ''}`}>
      <div className="config-header">
        <h3 className="config-title">
          Configure{' '}
          {isLabel
            ? 'Label'
            : isRectangle
            ? 'Rectangle'
            : isMarkdown
            ? 'Markdown'
            : isMilestone
            ? 'Milestone'
            : isArchitecture
            ? 'Component'
            : isUseCase
            ? 'Use Case'
            : 'Widget'}
        </h3>
        <button className="close-btn" onClick={() => selectWidget(null)} title="Close Panel">
          &times;
        </button>
      </div>

      <div className="config-body">
        {isLabel && (
          <LabelConfig
            widget={widget}
            send={send}
            selectWidget={selectWidget}
            triggerReactiveUpdate={triggerReactiveUpdate}
            maxZ={maxZ}
            minZ={minZ}
            currentZ={currentZ}
            handleSave={handleSave}
            handleDeleteWidget={handleDeleteWidget}
          />
        )}
        {isRectangle && (
          <RectangleConfig
            widget={widget}
            send={send}
            selectWidget={selectWidget}
            triggerReactiveUpdate={triggerReactiveUpdate}
            maxZ={maxZ}
            minZ={minZ}
            currentZ={currentZ}
            handleSave={handleSave}
            handleDeleteWidget={handleDeleteWidget}
          />
        )}
        {isMarkdown && (
          <MarkdownConfig
            widget={widget}
            send={send}
            selectWidget={selectWidget}
            triggerReactiveUpdate={triggerReactiveUpdate}
            maxZ={maxZ}
            minZ={minZ}
            currentZ={currentZ}
            handleSave={handleSave}
            handleDeleteWidget={handleDeleteWidget}
          />
        )}
        {isMilestone && (
          <MilestoneConfig
            widget={widget}
            send={send}
            selectWidget={selectWidget}
            triggerReactiveUpdate={triggerReactiveUpdate}
            maxZ={maxZ}
            minZ={minZ}
            currentZ={currentZ}
            handleSave={handleSave}
            handleDeleteWidget={handleDeleteWidget}
          />
        )}
        {isArchitecture && (
          <ArchitectureConfig
            widget={widget}
            send={send}
            selectWidget={selectWidget}
            triggerReactiveUpdate={triggerReactiveUpdate}
            maxZ={maxZ}
            minZ={minZ}
            currentZ={currentZ}
            handleSave={handleSave}
            handleDeleteWidget={handleDeleteWidget}
          />
        )}
        {isUseCase && (
          <UseCaseConfig
            widget={widget}
            send={send}
            selectWidget={selectWidget}
            triggerReactiveUpdate={triggerReactiveUpdate}
            maxZ={maxZ}
            minZ={minZ}
            currentZ={currentZ}
            handleSave={handleSave}
            handleDeleteWidget={handleDeleteWidget}
          />
        )}
        {isWidget && (
          <ScriptConfig
            widget={widget}
            send={send}
            selectWidget={selectWidget}
            triggerReactiveUpdate={triggerReactiveUpdate}
            isHelpOpen={isHelpOpen}
            helpTab={helpTab}
            setHelpOpen={setHelpOpen}
            handleSave={handleSave}
            handleDeleteWidget={handleDeleteWidget}
          />
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
