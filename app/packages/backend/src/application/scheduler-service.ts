import Agenda from 'agenda';
import type { Widget } from '@mc/shared';
import type { IWidgetRepository } from './widget-repository';
import type { RunnerService } from './runner-service';

export class SchedulerService {
  constructor(
    private agenda: Agenda,
    private widgetRepo: IWidgetRepository,
    private runner: RunnerService,
  ) {}

  /**
   * Initializes the scheduler by retrieving all widgets, scheduling the repeating ones,
   * and starting the Agenda queue.
   */
  async start(): Promise<void> {
    const widgets = await this.widgetRepo.findAll();
    for (const widget of widgets) {
      await this.schedule(widget);
    }
    await this.agenda.start();
  }

  /**
   * Schedules or updates a repeating widget execution job.
   * If the widget has no cronExpression, any existing job is cancelled.
   * 
   * @param widget The widget to schedule.
   */
  async schedule(widget: Widget): Promise<void> {
    const jobName = `mc-${widget._id}`;

    if (widget.cronExpression && widget.cronExpression.trim() !== '') {
      // Define the processor for the job
      this.agenda.define(jobName, async () => {
        await this.runner.run(widget._id);
      });

      // Cancel any existing job with the same name to avoid duplicates/stale schedules
      await this.cancel(widget._id);

      // Schedule the repeating job
      await this.agenda.every(widget.cronExpression, jobName);
    } else {
      await this.cancel(widget._id);
    }
  }

  /**
   * Cancels and removes the Agenda job for a specific widget.
   * 
   * @param widgetId The ID of the widget.
   */
  async cancel(widgetId: string): Promise<void> {
    const jobName = `mc-${widgetId}`;
    await this.agenda.cancel({ name: jobName });
  }
}
