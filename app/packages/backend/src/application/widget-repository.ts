import type { Widget, ExecutionResult, WidgetStatus } from '@mc/shared';

export type NewWidget = Pick<Widget,
  'type' | 'label' | 'code' | 'envVars' | 'timeoutMs' | 'position' | 'style' | 'milestoneItems'
> & { cronExpression?: string };

export interface IWidgetRepository {
  findAll(): Promise<Widget[]>;
  findById(id: string): Promise<Widget | null>;
  create(data: NewWidget): Promise<Widget>;
  update(id: string, patch: Partial<Widget>): Promise<Widget>;
  delete(id: string): Promise<void>;
  saveResult(
    id: string,
    result: ExecutionResult,
    status: WidgetStatus
  ): Promise<void>;
}
