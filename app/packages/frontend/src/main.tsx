import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useWidgetStore } from './store/useWidgetStore';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import ConfigPanel from './components/ConfigPanel';
import HelpPanel from './components/HelpPanel';
import './styles/index.css';

function App() {
  const connectWebSocket = useWidgetStore((state) => state.connectWebSocket);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="workspace-area">
        <Canvas />
      </div>
      <ConfigPanel />
      <HelpPanel />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
