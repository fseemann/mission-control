import type { ServerWebSocket } from 'bun';
import type { ClientMessage, ServerMessage } from '@mc/shared';
import type { IWidgetRepository } from '../../application/widget-repository';
import type { IEdgeRepository } from '../../application/edge-repository';
import type { RunnerService } from '../../application/runner-service';
import type { SchedulerService } from '../../application/scheduler-service';

export class WsHandler {
  private clients = new Set<ServerWebSocket<any>>();

  constructor(
    private widgetRepo: IWidgetRepository,
    private edgeRepo: IEdgeRepository,
    private runner: RunnerService,
    private scheduler: SchedulerService,
  ) {}

  /**
   * Serializes the message to JSON and sends it to all connected clients.
   */
  broadcast(msg: ServerMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.clients) {
      try {
        ws.send(payload);
      } catch (err) {
        console.error('[WsHandler] Broadcast error for client:', err);
      }
    }
  }

  /**
   * Tracks a new client connection.
   */
  handleOpen(ws: ServerWebSocket<any>): void {
    this.clients.add(ws);
  }

  /**
   * Untracks a closed client connection.
   */
  handleClose(ws: ServerWebSocket<any>): void {
    this.clients.delete(ws);
  }

  /**
   * Routes the incoming client message to the appropriate repository or service.
   * Sends responses/broadcasts back to clients.
   */
  async handleMessage(ws: ServerWebSocket<any>, raw: string): Promise<void> {
    try {
      const msg: ClientMessage = JSON.parse(raw);

      switch (msg.type) {
        case 'widget:list': {
          const widgets = await this.widgetRepo.findAll();
          ws.send(JSON.stringify({ type: 'widget:data', widgets } satisfies ServerMessage));
          break;
        }
        case 'widget:create': {
          const widget = await this.widgetRepo.create(msg.payload);
          await this.scheduler.schedule(widget);
          this.broadcast({ type: 'widget:created', widget } satisfies ServerMessage);
          break;
        }
        case 'widget:update': {
          const widget = await this.widgetRepo.update(msg.id, msg.payload);
          await this.scheduler.schedule(widget);
          this.broadcast({ type: 'widget:updated', widget } satisfies ServerMessage);
          break;
        }
        case 'widget:delete': {
          await this.widgetRepo.delete(msg.id);
          await this.scheduler.cancel(msg.id);
          this.broadcast({ type: 'widget:deleted', id: msg.id } satisfies ServerMessage);
          break;
        }
        case 'widget:run': {
          // Run the widget asynchronously (fire-and-forget)
          // The results will be broadcast back to clients via notify callback/broadcast
          this.runner.run(msg.id).catch((err) => {
            console.error(`[WsHandler] Error running widget ${msg.id}:`, err);
          });
          break;
        }
        case 'edge:list': {
          const edges = await this.edgeRepo.findAll();
          ws.send(JSON.stringify({ type: 'edge:data', edges } satisfies ServerMessage));
          break;
        }
        case 'edge:create': {
          const sourceWidget = await this.widgetRepo.findById(msg.payload.source);
          const targetWidget = await this.widgetRepo.findById(msg.payload.target);
          if (sourceWidget?.type === 'widget' || targetWidget?.type === 'widget') {
            throw new Error('Status widgets cannot have edge connections');
          }
          const edge = await this.edgeRepo.create(msg.payload);
          this.broadcast({ type: 'edge:created', edge } satisfies ServerMessage);
          break;
        }
        case 'edge:delete': {
          await this.edgeRepo.delete(msg.id);
          this.broadcast({ type: 'edge:deleted', id: msg.id } satisfies ServerMessage);
          break;
        }
        default: {
          const _exhaustive: never = msg;
          throw new Error(`Unhandled message type: ${(msg as any).type}`);
        }
      }
    } catch (err: any) {
      console.error('[WsHandler] Error handling message:', err);
      try {
        ws.send(JSON.stringify({ type: 'error', message: err.message || 'Unknown error' } satisfies ServerMessage));
      } catch (sendErr) {
        console.error('[WsHandler] Failed to send error back to client:', sendErr);
      }
    }
  }
}
