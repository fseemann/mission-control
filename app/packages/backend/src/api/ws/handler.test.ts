import { describe, test, expect, mock } from 'bun:test';
import type { ServerWebSocket } from 'bun';
import type { Widget, Edge, ClientMessage, ServerMessage, ExecutionResult, WidgetStatus } from '@mc/shared';
import type { IWidgetRepository, NewWidget } from '../../application/widget-repository';
import type { IEdgeRepository } from '../../application/edge-repository';
import { RunnerService } from '../../application/runner-service';
import { SchedulerService } from '../../application/scheduler-service';
import { WsHandler } from './handler';

class MockWidgetRepository implements IWidgetRepository {
  public widgets: Widget[] = [];

  async findAll(): Promise<Widget[]> {
    return this.widgets;
  }

  async findById(id: string): Promise<Widget | null> {
    return this.widgets.find(w => w._id === id) || null;
  }

  async create(data: NewWidget): Promise<Widget> {
    const newWidget: Widget = {
      ...data,
      _id: Math.random().toString(36).substring(7),
      status: 'idle',
      updatedAt: new Date().toISOString(),
    };
    this.widgets.push(newWidget);
    return newWidget;
  }

  async update(id: string, patch: Partial<Widget>): Promise<Widget> {
    const idx = this.widgets.findIndex(w => w._id === id);
    if (idx === -1) throw new Error(`Widget ${id} not found`);
    this.widgets[idx] = { ...this.widgets[idx], ...patch, updatedAt: new Date().toISOString() };
    return this.widgets[idx];
  }

  async delete(id: string): Promise<void> {
    this.widgets = this.widgets.filter(w => w._id !== id);
  }

  async saveResult(id: string, result: ExecutionResult, status: WidgetStatus): Promise<void> {}
}

class MockEdgeRepository implements IEdgeRepository {
  public edges: Edge[] = [];

  async findAll(): Promise<Edge[]> {
    return this.edges;
  }

  async create(edge: Edge): Promise<Edge> {
    this.edges.push(edge);
    return edge;
  }

  async delete(id: string): Promise<void> {
    this.edges = this.edges.filter(e => e.id !== id);
  }
}

class MockWebSocket {
  public sentMessages: string[] = [];

  send(message: string): number {
    this.sentMessages.push(message);
    return message.length;
  }
}

describe('WsHandler', () => {
  test('should track clients and broadcast to all of them', () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    const mockRunner = {} as unknown as RunnerService;
    const mockScheduler = {} as unknown as SchedulerService;

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);

    const ws1 = new MockWebSocket() as unknown as ServerWebSocket<any>;
    const ws2 = new MockWebSocket() as unknown as ServerWebSocket<any>;

    handler.handleOpen(ws1);
    handler.handleOpen(ws2);

    const testMsg: ServerMessage = { type: 'error', message: 'Test error message' };
    handler.broadcast(testMsg);

    expect((ws1 as any).sentMessages.length).toBe(1);
    expect(JSON.parse((ws1 as any).sentMessages[0])).toEqual(testMsg);

    expect((ws2 as any).sentMessages.length).toBe(1);
    expect(JSON.parse((ws2 as any).sentMessages[0])).toEqual(testMsg);

    // Close ws1, should not receive broadcast anymore
    handler.handleClose(ws1);
    handler.broadcast({ type: 'error', message: 'Second message' });

    expect((ws1 as any).sentMessages.length).toBe(1); // Still 1 from first broadcast
    expect((ws2 as any).sentMessages.length).toBe(2);
  });

  test('should handle widget:list and unicast to originating socket', async () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    const mockRunner = {} as unknown as RunnerService;
    const mockScheduler = {} as unknown as SchedulerService;

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);

    const w = await widgetRepo.create({
      label: 'Widget A',
      code: 'console.log("A")',
      envVars: [],
      timeoutMs: 1000,
      position: { x: 0, y: 0 }
    });

    const ws = new MockWebSocket() as unknown as ServerWebSocket<any>;
    handler.handleOpen(ws);

    await handler.handleMessage(ws, JSON.stringify({ type: 'widget:list' } satisfies ClientMessage));

    expect((ws as any).sentMessages.length).toBe(1);
    const response = JSON.parse((ws as any).sentMessages[0]);
    expect(response.type).toBe('widget:data');
    expect(response.widgets.length).toBe(1);
    expect(response.widgets[0]._id).toBe(w._id);
  });

  test('should handle widget:create, schedule, and broadcast', async () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    const mockRunner = {} as unknown as RunnerService;
    
    const mockScheduler = {
      schedule: mock(async (widget: Widget) => {})
    } as unknown as SchedulerService;

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);

    const ws1 = new MockWebSocket() as unknown as ServerWebSocket<any>;
    const ws2 = new MockWebSocket() as unknown as ServerWebSocket<any>;
    handler.handleOpen(ws1);
    handler.handleOpen(ws2);

    const payload: NewWidget = {
      label: 'New Widget',
      code: 'console.log("new")',
      envVars: [],
      timeoutMs: 5000,
      position: { x: 100, y: 100 }
    };

    await handler.handleMessage(ws1, JSON.stringify({
      type: 'widget:create',
      payload
    } satisfies ClientMessage));

    // Verify scheduled was called
    expect(mockScheduler.schedule).toHaveBeenCalledTimes(1);

    // Verify broadcast to all clients
    expect((ws1 as any).sentMessages.length).toBe(1);
    expect((ws2 as any).sentMessages.length).toBe(1);

    const broadcastMsg1 = JSON.parse((ws1 as any).sentMessages[0]);
    expect(broadcastMsg1.type).toBe('widget:created');
    expect(broadcastMsg1.widget.label).toBe('New Widget');
  });

  test('should handle widget:update, schedule, and broadcast', async () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    const mockRunner = {} as unknown as RunnerService;
    
    const mockScheduler = {
      schedule: mock(async (widget: Widget) => {})
    } as unknown as SchedulerService;

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);

    const ws = new MockWebSocket() as unknown as ServerWebSocket<any>;
    handler.handleOpen(ws);

    const w = await widgetRepo.create({
      label: 'Widget Old',
      code: 'console.log("old")',
      envVars: [],
      timeoutMs: 1000,
      position: { x: 0, y: 0 }
    });

    await handler.handleMessage(ws, JSON.stringify({
      type: 'widget:update',
      id: w._id,
      payload: { label: 'Widget New' }
    } satisfies ClientMessage));

    expect(mockScheduler.schedule).toHaveBeenCalledTimes(1);

    expect((ws as any).sentMessages.length).toBe(1);
    const broadcastMsg = JSON.parse((ws as any).sentMessages[0]);
    expect(broadcastMsg.type).toBe('widget:updated');
    expect(broadcastMsg.widget.label).toBe('Widget New');
  });

  test('should handle widget:delete, cancel schedule, and broadcast', async () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    const mockRunner = {} as unknown as RunnerService;
    
    const mockScheduler = {
      cancel: mock(async (id: string) => {})
    } as unknown as SchedulerService;

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);

    const ws = new MockWebSocket() as unknown as ServerWebSocket<any>;
    handler.handleOpen(ws);

    const w = await widgetRepo.create({
      label: 'To delete',
      code: '',
      envVars: [],
      timeoutMs: 1000,
      position: { x: 0, y: 0 }
    });

    await handler.handleMessage(ws, JSON.stringify({
      type: 'widget:delete',
      id: w._id
    } satisfies ClientMessage));

    expect(mockScheduler.cancel).toHaveBeenCalledTimes(1);
    expect(mockScheduler.cancel).toHaveBeenCalledWith(w._id);

    expect((ws as any).sentMessages.length).toBe(1);
    const broadcastMsg = JSON.parse((ws as any).sentMessages[0]);
    expect(broadcastMsg.type).toBe('widget:deleted');
    expect(broadcastMsg.id).toBe(w._id);
  });

  test('should handle widget:run and call runner.run asynchronously', async () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    
    const mockRunner = {
      run: mock(async (id: string) => {})
    } as unknown as RunnerService;
    
    const mockScheduler = {} as unknown as SchedulerService;

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);
    const ws = new MockWebSocket() as unknown as ServerWebSocket<any>;

    await handler.handleMessage(ws, JSON.stringify({
      type: 'widget:run',
      id: 'some-widget-id'
    } satisfies ClientMessage));

    expect(mockRunner.run).toHaveBeenCalledTimes(1);
    expect(mockRunner.run).toHaveBeenCalledWith('some-widget-id');
  });

  test('should handle edge:list and edge mutations', async () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    const mockRunner = {} as unknown as RunnerService;
    const mockScheduler = {} as unknown as SchedulerService;

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);

    const ws = new MockWebSocket() as unknown as ServerWebSocket<any>;
    handler.handleOpen(ws);

    // 1. Create edge
    const edgePayload: Edge = {
      id: 'edge-ab',
      source: 'a',
      target: 'b',
      label: 'connects'
    };

    await handler.handleMessage(ws, JSON.stringify({
      type: 'edge:create',
      payload: edgePayload
    } satisfies ClientMessage));

    expect((ws as any).sentMessages.length).toBe(1);
    expect(JSON.parse((ws as any).sentMessages[0]).type).toBe('edge:created');

    // 2. Edge list
    await handler.handleMessage(ws, JSON.stringify({
      type: 'edge:list'
    } satisfies ClientMessage));

    expect((ws as any).sentMessages.length).toBe(2);
    const listMsg = JSON.parse((ws as any).sentMessages[1]);
    expect(listMsg.type).toBe('edge:data');
    expect(listMsg.edges.length).toBe(1);
    expect(listMsg.edges[0].id).toBe('edge-ab');

    // 3. Delete edge
    await handler.handleMessage(ws, JSON.stringify({
      type: 'edge:delete',
      id: 'edge-ab'
    } satisfies ClientMessage));

    expect((ws as any).sentMessages.length).toBe(3);
    expect(JSON.parse((ws as any).sentMessages[2]).type).toBe('edge:deleted');
    expect(JSON.parse((ws as any).sentMessages[2]).id).toBe('edge-ab');
  });

  test('should handle errors gracefully by sending error message to originating socket', async () => {
    const widgetRepo = new MockWidgetRepository();
    const edgeRepo = new MockEdgeRepository();
    const mockRunner = {} as unknown as RunnerService;
    const mockScheduler = {} as unknown as SchedulerService;

    // Force findById to throw to simulate an database/service error
    widgetRepo.findAll = async () => {
      throw new Error('Database connection failed');
    };

    const handler = new WsHandler(widgetRepo, edgeRepo, mockRunner, mockScheduler);
    const ws = new MockWebSocket() as unknown as ServerWebSocket<any>;

    await handler.handleMessage(ws, JSON.stringify({ type: 'widget:list' } satisfies ClientMessage));

    expect((ws as any).sentMessages.length).toBe(1);
    const response = JSON.parse((ws as any).sentMessages[0]);
    expect(response.type).toBe('error');
    expect(response.message).toBe('Database connection failed');
  });
});
