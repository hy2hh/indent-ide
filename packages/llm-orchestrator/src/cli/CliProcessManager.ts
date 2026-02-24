import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { CliOptions, CliResponse, StreamChunk } from '@intent-ide/core';
import { PROCESS_LIMITS } from '@intent-ide/core';

const execAsync = promisify(exec);

export interface ProcessManagerOptions {
  maxConcurrent?: number;
  defaultTimeoutMs?: number;
}

/**
 * CLI 프로세스 라이프사이클 관리
 * - 동시 실행 제한
 * - 스트리밍 stdout 수집
 * - 타임아웃 처리
 * - 그레이스풀 종료
 */
export class CliProcessManager {
  private activeProcesses = new Map<string, ReturnType<typeof spawn>>();
  private maxConcurrent: number;
  private defaultTimeoutMs: number;

  constructor(options: ProcessManagerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? PROCESS_LIMITS.MAX_CONCURRENT_CLI;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? PROCESS_LIMITS.CLI_TIMEOUT_MS;
  }

  async execute(
    processId: string,
    command: string,
    args: string[],
    options: CliOptions = {}
  ): Promise<CliResponse> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: options.workingDir,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.activeProcesses.set(processId, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        this.killProcess(processId);
        reject(new Error(`Process timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(processId);

        resolve({
          content: stdout,
          rawOutput: stdout + stderr,
          exitCode: code ?? 1,
          durationMs: Date.now() - startTime,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(processId);
        reject(err);
      });
    });
  }

  async *stream(
    processId: string,
    command: string,
    args: string[],
    options: CliOptions = {}
  ): AsyncIterable<StreamChunk> {
    const proc = spawn(command, args, {
      cwd: options.workingDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.activeProcesses.set(processId, proc);

    const chunks: StreamChunk[] = [];
    let resolve: (() => void) | null = null;
    let isDone = false;
    let error: Error | null = null;

    const enqueue = (chunk: StreamChunk) => {
      chunks.push(chunk);
      resolve?.();
    };

    proc.stdout?.on('data', (data: Buffer) => {
      enqueue({ type: 'text', content: data.toString() });
    });

    proc.stderr?.on('data', (data: Buffer) => {
      enqueue({ type: 'error', content: data.toString() });
    });

    proc.on('close', (code) => {
      this.activeProcesses.delete(processId);
      isDone = true;
      if (code !== 0) {
        enqueue({ type: 'error', content: `Process exited with code ${code}` });
      }
      enqueue({ type: 'done', content: '' });
      resolve?.();
    });

    proc.on('error', (err) => {
      this.activeProcesses.delete(processId);
      error = err;
      isDone = true;
      resolve?.();
    });

    while (!isDone || chunks.length > 0) {
      if (chunks.length === 0) {
        await new Promise<void>((r) => {
          resolve = r;
        });
        resolve = null;
      }

      if (error) {
        throw error;
      }

      const chunk = chunks.shift();
      if (chunk) {
        yield chunk;
      }
    }
  }

  killProcess(processId: string): void {
    const proc = this.activeProcesses.get(processId);
    if (proc) {
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (this.activeProcesses.has(processId)) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  killAll(): void {
    for (const [id] of this.activeProcesses) {
      this.killProcess(id);
    }
  }

  getActiveCount(): number {
    return this.activeProcesses.size;
  }

  isAtCapacity(): boolean {
    return this.activeProcesses.size >= this.maxConcurrent;
  }
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}
