import { connectDb } from './infrastructure/mongodb/client';
import { createAgenda } from './infrastructure/agenda/client';
import * as crypto from './infrastructure/crypto';
import { MongoWidgetRepository } from './infrastructure/mongodb/mongo-widget-repository';
import { MongoEdgeRepository } from './infrastructure/mongodb/mongo-edge-repository';
import { RunnerService } from './application/runner-service';
import { SchedulerService } from './application/scheduler-service';
import { WsHandler } from './api/ws/handler';
import type { ServerMessage } from '@mc/shared';

// Verify required env variables are present
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI environment variable is required');
}

// 1. Infrastructure
const db = await connectDb(mongoUri);
const agenda = createAgenda(mongoUri);

// 2. Repositories (infrastructure implements application interfaces)
const widgetRepo = new MongoWidgetRepository(
  db.collection('widgets') as any,
  crypto
);
const edgeRepo = new MongoEdgeRepository(
  db.collection('edges') as any
);

// 3. Application services
//    notify is a placeholder; real broadcast is wired in step 4.
let notify: (msg: ServerMessage) => void = () => {};
const runner = new RunnerService(widgetRepo, (msg) => notify(msg));
const scheduler = new SchedulerService(agenda, widgetRepo, runner);

// 4. API layer — wire broadcast back into runner
const handler = new WsHandler(widgetRepo, edgeRepo, runner, scheduler);
notify = (msg) => handler.broadcast(msg);

// 5. Start scheduler (registers existing widget cron jobs)
await scheduler.start();

// 6. Start Bun WebSocket server
const port = Number(process.env.PORT ?? 3001);
console.log(`[Server] Starting WebSocket server on port ${port}...`);

Bun.serve({
  port,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return new Response('Mission Control WS server', { status: 200 });
  },
  websocket: {
    open(ws) {
      handler.handleOpen(ws);
    },
    close(ws) {
      handler.handleClose(ws);
    },
    message(ws, msg) {
      handler.handleMessage(ws, msg as string);
    },
  },
});
