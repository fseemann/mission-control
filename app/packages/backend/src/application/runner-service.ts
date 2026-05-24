import type { Widget, ExecutionResult, WidgetStatus, ServerMessage } from '@mc/shared';
import type { IWidgetRepository } from './widget-repository';
import { write } from 'bun';
import { unlink } from 'node:fs/promises';

export class RunnerService {
  constructor(
    private widgetRepo: IWidgetRepository,
    private notify: (msg: ServerMessage) => void,
  ) {}

  /**
   * Executes a widget's code in an isolated Bun child process.
   * 
   * @param widgetId The ID of the widget to execute.
   */
  async run(widgetId: string): Promise<void> {
    // 1. Find the widget by ID
    const widget = await this.widgetRepo.findById(widgetId);
    if (!widget) {
      console.error(`[RunnerService] Widget ${widgetId} not found`);
      return;
    }

    // 2. Build the env object from widget.envVars
    const env: Record<string, string> = {};
    if (widget.envVars) {
      for (const item of widget.envVars) {
        env[item.key] = item.value;
      }
    }

    // 3. Define temp file paths
    const timestamp = Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    const userCodePath = `/tmp/mc-${widgetId}-${timestamp}-user.ts`;
    const harnessPath = `/tmp/mc-${widgetId}-${timestamp}.ts`;

    const harnessContent = `// auto-generated runner harness
import { run } from '${userCodePath}';
const env = JSON.parse(process.env.__MC_ENV__!);
const result = await run(env);
process.stdout.write(JSON.stringify(result));
`;

    const startTime = performance.now();
    const startTimeIso = new Date().toISOString();

    let executionResult: ExecutionResult;
    let status: WidgetStatus = 'idle';

    const timeoutMs = widget.timeoutMs || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      // Write the user code and the harness to temp files
      await write(userCodePath, widget.code);
      await write(harnessPath, harnessContent);

      // 4. Spawn the isolated process
      const proc = Bun.spawn([process.execPath, 'run', harnessPath], {
        env: {
          ...process.env,
          __MC_ENV__: JSON.stringify(env),
        },
        stdout: 'pipe',
        stderr: 'pipe',
        signal: controller.signal,
      });

      // Collect stdout and stderr streams
      const stdoutText = await new Response(proc.stdout).text();
      const stderrText = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      // Clear the timeout timer
      clearTimeout(timeoutId);

      const durationMs = Math.round(performance.now() - startTime);

      // 5. Check outcomes and map status
      if (controller.signal.aborted) {
        status = 'timeout';
        executionResult = {
          status: 'fail',
          runnerError: `Timeout after ${timeoutMs}ms`,
          durationMs,
          ranAt: startTimeIso,
        };
      } else if (exitCode !== 0) {
        status = 'crash';
        executionResult = {
          status: 'fail',
          runnerError: `Process exited with code ${exitCode}\nStderr: ${stderrText.trim()}`,
          durationMs,
          ranAt: startTimeIso,
        };
      } else {
        try {
          const parsed = JSON.parse(stdoutText);
          if (
            parsed &&
            typeof parsed === 'object' &&
            'status' in parsed &&
            ['ok', 'degraded', 'fail'].includes(parsed.status)
          ) {
            status = parsed.status as WidgetStatus;
            executionResult = {
              status: parsed.status as any,
              message: parsed.message,
              output: parsed.output,
              durationMs,
              ranAt: startTimeIso,
            };
          } else {
            status = 'crash';
            executionResult = {
              status: 'fail',
              runnerError: `Invalid return format from script: ${stdoutText}`,
              durationMs,
              ranAt: startTimeIso,
            };
          }
        } catch (e: any) {
          status = 'crash';
          executionResult = {
            status: 'fail',
            runnerError: `Failed to parse script output: ${stdoutText}\nError: ${e.message}`,
            durationMs,
            ranAt: startTimeIso,
          };
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const durationMs = Math.round(performance.now() - startTime);
      status = 'crash';
      executionResult = {
        status: 'fail',
        runnerError: `Runner execution error: ${err.message}`,
        durationMs,
        ranAt: startTimeIso,
      };
    } finally {
      // 8. Delete temp files
      try {
        await unlink(userCodePath);
      } catch (e) {}
      try {
        await unlink(harnessPath);
      } catch (e) {}
    }

    // 6. Save result to widget repository
    try {
      await this.widgetRepo.saveResult(widgetId, executionResult, status);
    } catch (saveErr) {
      console.error(`[RunnerService] Failed to save result for widget ${widgetId}:`, saveErr);
    }

    // 7. Broadcast result to clients
    try {
      this.notify({
        type: 'widget:result',
        widgetId,
        result: executionResult,
        status,
      });
    } catch (notifyErr) {
      console.error(`[RunnerService] Failed to broadcast result notification for widget ${widgetId}:`, notifyErr);
    }
  }
}
