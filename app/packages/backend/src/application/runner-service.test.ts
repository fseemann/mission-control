import { describe, test, expect, mock } from 'bun:test';
import type { Widget, ExecutionResult, WidgetStatus, ServerMessage } from '@mc/shared';
import type { IWidgetRepository, NewWidget } from './widget-repository';
import { RunnerService } from './runner-service';

class MockWidgetRepository implements IWidgetRepository {
  public widgets: Widget[] = [];
  public savedResults: { id: string; result: ExecutionResult; status: WidgetStatus }[] = [];

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
    if (idx === -1) throw new Error('Not found');
    this.widgets[idx] = { ...this.widgets[idx], ...patch, updatedAt: new Date().toISOString() };
    return this.widgets[idx];
  }

  async delete(id: string): Promise<void> {
    this.widgets = this.widgets.filter(w => w._id !== id);
  }

  async saveResult(id: string, result: ExecutionResult, status: WidgetStatus): Promise<void> {
    const widget = this.widgets.find(w => w._id === id);
    if (widget) {
      widget.status = status;
      widget.lastResult = result;
    }
    this.savedResults.push({ id, result, status });
  }
}

describe('RunnerService', () => {
  test('Happy path: script returns status ok', async () => {
    const repo = new MockWidgetRepository();
    const notifications: ServerMessage[] = [];
    const notify = (msg: ServerMessage) => {
      notifications.push(msg);
    };

    const widget = await repo.create({
      label: 'Healthy Widget',
      code: `
        export async function run(ctx: { env: Record<string, string> }) {
          return {
            status: 'ok' as const,
            message: 'All good!',
            output: { value: 123 }
          };
        }
      `,
      envVars: [],
      timeoutMs: 5000,
      position: { x: 0, y: 0 }
    });

    const runner = new RunnerService(repo, notify);
    await runner.run(widget._id);

    // Verify database updates
    const updatedWidget = await repo.findById(widget._id);
    expect(updatedWidget).not.toBeNull();
    expect(updatedWidget!.status).toBe('ok');
    expect(updatedWidget!.lastResult).toBeDefined();
    expect(updatedWidget!.lastResult!.status).toBe('ok');
    expect(updatedWidget!.lastResult!.message).toBe('All good!');
    expect((updatedWidget!.lastResult!.output as any).value).toBe(123);
    expect(updatedWidget!.lastResult!.durationMs).toBeGreaterThanOrEqual(0);

    // Verify WebSocket notification was broadcasted
    expect(notifications.length).toBe(1);
    expect(notifications[0]).toEqual({
      type: 'widget:result',
      widgetId: widget._id,
      result: updatedWidget!.lastResult!,
      status: 'ok',
    });
  });

  test('Timeout path: script runs too long', async () => {
    const repo = new MockWidgetRepository();
    const notifications: ServerMessage[] = [];
    const notify = (msg: ServerMessage) => {
      notifications.push(msg);
    };

    const widget = await repo.create({
      label: 'Slow Widget',
      code: `
        export async function run(ctx: { env: Record<string, string> }) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          return {
            status: 'ok' as const,
            message: 'Finished tardily'
          };
        }
      `,
      envVars: [],
      timeoutMs: 300, // short timeout
      position: { x: 0, y: 0 }
    });

    const runner = new RunnerService(repo, notify);
    await runner.run(widget._id);

    const updatedWidget = await repo.findById(widget._id);
    expect(updatedWidget).not.toBeNull();
    expect(updatedWidget!.status).toBe('timeout');
    expect(updatedWidget!.lastResult).toBeDefined();
    expect(updatedWidget!.lastResult!.status).toBe('fail');
    expect(updatedWidget!.lastResult!.runnerError).toContain('Timeout');

    expect(notifications.length).toBe(1);
    expect(notifications[0].status).toBe('timeout');
  });

  test('Crash path: script throws exception', async () => {
    const repo = new MockWidgetRepository();
    const notifications: ServerMessage[] = [];
    const notify = (msg: ServerMessage) => {
      notifications.push(msg);
    };

    const widget = await repo.create({
      label: 'Buggy Widget',
      code: `
        export async function run(ctx: { env: Record<string, string> }) {
          throw new Error('Boom!');
        }
      `,
      envVars: [],
      timeoutMs: 5000,
      position: { x: 0, y: 0 }
    });

    const runner = new RunnerService(repo, notify);
    await runner.run(widget._id);

    const updatedWidget = await repo.findById(widget._id);
    expect(updatedWidget).not.toBeNull();
    expect(updatedWidget!.status).toBe('crash');
    expect(updatedWidget!.lastResult).toBeDefined();
    expect(updatedWidget!.lastResult!.status).toBe('fail');
    expect(updatedWidget!.lastResult!.runnerError).toContain('Boom!');

    expect(notifications.length).toBe(1);
    expect(notifications[0].status).toBe('crash');
  });
});
