import { create } from 'zustand';
import { ClientMessage, ServerMessage, Widget, Edge } from '@mc/shared';

interface WidgetStore {
  widgets: Map<string, Widget>;
  edges: Edge[];
  selectedWidgetId: string | null;
  isConnected: boolean;
  isHelpOpen: boolean;
  helpTab: 'scripting' | 'edges';

  // Actions
  connectWebSocket: () => void;
  send: (msg: ClientMessage) => void;
  selectWidget: (id: string | null) => void;
  setHelpOpen: (open: boolean, tab?: 'scripting' | 'edges') => void;
}

let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export const useWidgetStore = create<WidgetStore>((set, get) => {
  const connect = () => {
    if (socket) {
      if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
        return;
      }
      socket.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Using relative path /ws which Vite proxies to the backend, or directly to the production server
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log(`Connecting to WebSocket: ${wsUrl}`);
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      set({ isConnected: true });
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // Hydrate initial state
      get().send({ type: 'widget:list' });
      get().send({ type: 'edge:list' });
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting in 3s...');
      set({ isConnected: false });
      
      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        console.log('Received server message:', msg.type, msg);

        switch (msg.type) {
          case 'widget:data': {
            const nextWidgets = new Map<string, Widget>();
            msg.widgets.forEach((w) => nextWidgets.set(w._id, w));
            set({ widgets: nextWidgets });
            break;
          }
          case 'edge:data':
            set({ edges: msg.edges });
            break;
          case 'widget:created':
            set((state) => {
              const next = new Map(state.widgets);
              next.set(msg.widget._id, msg.widget);
              return { widgets: next };
            });
            break;
          case 'widget:updated':
            set((state) => {
              const next = new Map(state.widgets);
              next.set(msg.widget._id, msg.widget);
              return { widgets: next };
            });
            break;
          case 'widget:deleted':
            set((state) => {
              const next = new Map(state.widgets);
              next.delete(msg.id);
              
              // If the deleted widget was selected, deselect it
              const nextSelectedId = state.selectedWidgetId === msg.id ? null : state.selectedWidgetId;
              return { widgets: next, selectedWidgetId: nextSelectedId };
            });
            break;
          case 'edge:created':
            set((state) => {
              // Avoid duplicates
              if (state.edges.some((e) => e.id === msg.edge.id)) {
                return {};
              }
              return { edges: [...state.edges, msg.edge] };
            });
            break;
          case 'edge:deleted':
            set((state) => ({
              edges: state.edges.filter((e) => e.id !== msg.id),
            }));
            break;
          case 'widget:result':
            set((state) => {
              const next = new Map(state.widgets);
              const widget = next.get(msg.widgetId);
              if (widget) {
                const updatedWidget = {
                  ...widget,
                  status: msg.status,
                  lastResult: msg.result,
                };
                next.set(msg.widgetId, updatedWidget);
              }
              return { widgets: next };
            });
            break;
          case 'error':
            console.error('Error from server:', msg.message);
            break;
          default:
            console.warn('Unknown message type:', (msg as any).type);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err, event.data);
      }
    };
  };

  return {
    widgets: new Map<string, Widget>(),
    edges: [],
    selectedWidgetId: null,
    isConnected: false,
    isHelpOpen: false,
    helpTab: 'scripting',

    connectWebSocket: () => {
      connect();
    },

    send: (msg: ClientMessage) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      } else {
        console.warn('WebSocket not open. Queueing or ignoring message:', msg);
      }
    },

    selectWidget: (id: string | null) => {
      set({ selectedWidgetId: id });
    },

    setHelpOpen: (open: boolean, tab?: 'scripting' | 'edges') => {
      set((state) => ({
        isHelpOpen: open,
        helpTab: tab || (open ? 'scripting' : state.helpTab)
      }));
    },
  };
});

export default useWidgetStore;
