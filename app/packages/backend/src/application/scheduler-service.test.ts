import { describe, test, expect, mock } from 'bun:test';
import type { Widget, ExecutionResult, WidgetStatus, ServerMessage } from '@mc/shared';
import type { IWidgetRepository, NewWidget } from './widget-repository';
import { SchedulerService } from './scheduler-service';
import { RunnerService } from './runner-service';
import Agenda from 'agenda';

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
    this.savedResults.push({ id, result, status });
  }
}

class MockAgenda {
  public jobs = new Map<string, { interval: string; data?: any }>();
  public definitions = new Map<string, Function>();
  public isStarted = false;

  define(name: string, processor: Function) {
    this.definitions.set(name, processor);
  }

  async every(interval: string, name: string, data?: any) {
    this.jobs.set(name, { interval, data });
  }

  async cancel(query: { name: string }) {
    if (this.jobs.has(query.name)) {
      this.jobs.delete(query.name);
      return 1;
    }
    return 0;
  }

  async start() {
    this.isStarted = true;
  }
}

describe('SchedulerService', () => {
  test('should start and schedule existing repeating widgets on boot', async () => {
    const repo = new MockWidgetRepository();
    const agenda = new MockAgenda();

    const w1 = await repo.create({
      label: 'Hourly Widget',
      code: 'console.log("hourly");',
      envVars: [],
      cronExpression: '0 * * * *',
      timeoutMs: 5000,
      position: { x: 0, y: 0 }
    });

    const w2 = await repo.create({
      label: 'Manual Widget',
      code: 'console.log("manual");',
      envVars: [],
      timeoutMs: 5000,
      position: { x: 10, y: 10 }
    });

    const mockRunner = {
      run: mock(async (widgetId: string) => {})
    } as unknown as RunnerService;

    const scheduler = new SchedulerService(agenda as unknown as Agenda, repo, mockRunner);
    await scheduler.start();

    // Verify agenda starts
    expect(agenda.isStarted).toBe(true);

    // Verify w1 is scheduled
    expect(agenda.jobs.has(`mc-${w1._id}`)).toBe(true);
    expect(agenda.jobs.get(`mc-${w1._id}`)!.interval).toBe('0 * * * *');
    expect(agenda.definitions.has(`mc-${w1._id}`)).toBe(true);

    // Verify w2 (no cronExpression) is not scheduled
    expect(agenda.jobs.has(`mc-${w2._id}`)).toBe(false);
    expect(agenda.definitions.has(`mc-${w2._id}`)).toBe(false);
  });

  test('should schedule repeating widget when cronExpression is added or updated', async () => {
    const repo = new MockWidgetRepository();
    const agenda = new MockAgenda();

    const w = await repo.create({
      label: 'Widget',
      code: 'console.log("test");',
      envVars: [],
      timeoutMs: 5000,
      position: { x: 0, y: 0 }
    });

    const mockRunner = {
      run: mock(async (widgetId: string) => {})
    } as unknown as RunnerService;

    const scheduler = new SchedulerService(agenda as unknown as Agenda, repo, mockRunner);

    // Schedule with cron expression
    w.cronExpression = '*/5 * * * *';
    await scheduler.schedule(w);

    expect(agenda.jobs.has(`mc-${w._id}`)).toBe(true);
    expect(agenda.jobs.get(`mc-${w._id}`)!.interval).toBe('*/5 * * * *');
    expect(agenda.definitions.has(`mc-${w._id}`)).toBe(true);

    // Update cron expression
    w.cronExpression = '*/10 * * * *';
    await scheduler.schedule(w);

    expect(agenda.jobs.has(`mc-${w._id}`)).toBe(true);
    expect(agenda.jobs.get(`mc-${w._id}`)!.interval).toBe('*/10 * * * *');
  });

  test('should cancel repeating widget when cronExpression is removed', async () => {
    const repo = new MockWidgetRepository();
    const agenda = new MockAgenda();

    const w = await repo.create({
      label: 'Widget',
      code: 'console.log("test");',
      envVars: [],
      cronExpression: '*/5 * * * *',
      timeoutMs: 5000,
      position: { x: 0, y: 0 }
    });

    const mockRunner = {
      run: mock(async (widgetId: string) => {})
    } as unknown as RunnerService;

    const scheduler = new SchedulerService(agenda as unknown as Agenda, repo, mockRunner);

    // Initial scheduling
    await scheduler.schedule(w);
    expect(agenda.jobs.has(`mc-${w._id}`)).toBe(true);

    // Remove cron expression
    w.cronExpression = undefined;
    await scheduler.schedule(w);
    expect(agenda.jobs.has(`mc-${w._id}`)).toBe(false);
  });

  test('should trigger the runner run method when Agenda job runs', async () => {
    const repo = new MockWidgetRepository();
    const agenda = new MockAgenda();

    const w = await repo.create({
      label: 'Widget',
      code: 'console.log("test");',
      envVars: [],
      cronExpression: '*/5 * * * *',
      timeoutMs: 5000,
      position: { x: 0, y: 0 }
    });

    const mockRunner = {
      run: mock(async (widgetId: string) => {})
    } as unknown as RunnerService;

    const scheduler = new SchedulerService(agenda as unknown as Agenda, repo, mockRunner);
    await scheduler.schedule(w);

    // Trigger the defined function
    const fn = agenda.definitions.get(`mc-${w._id}`);
    expect(fn).toBeDefined();

    await fn!();

    expect(mockRunner.run).toHaveBeenCalledTimes(1);
    expect(mockRunner.run).toHaveBeenCalledWith(w._id);
  });
});
