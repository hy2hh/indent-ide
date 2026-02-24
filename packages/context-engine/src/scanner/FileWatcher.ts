import { EventEmitter } from 'node:events';

export type FileChangeType = 'add' | 'change' | 'unlink';

export interface FileChangeEvent {
  type: FileChangeType;
  filePath: string;
  timestamp: number;
}

export class FileWatcher extends EventEmitter {
  private watchPath: string;
  private watcher: unknown = null;
  private debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
  private debounceMs: number;

  constructor(watchPath: string, debounceMs = 300) {
    super();
    this.watchPath = watchPath;
    this.debounceMs = debounceMs;
  }

  async start(): Promise<void> {
    // Dynamic import to avoid top-level dependency issues
    const { default: chokidar } = await import('chokidar');

    this.watcher = chokidar.watch(this.watchPath, {
      ignored: [
        /node_modules/,
        /\.git/,
        /dist/,
        /\.intent-ide/,
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    const w = this.watcher as ReturnType<typeof chokidar.watch>;

    w.on('add', (path: string) => {
      this.debounceEmit({ type: 'add', filePath: path, timestamp: Date.now() });
    });

    w.on('change', (path: string) => {
      this.debounceEmit({ type: 'change', filePath: path, timestamp: Date.now() });
    });

    w.on('unlink', (path: string) => {
      this.debounceEmit({ type: 'unlink', filePath: path, timestamp: Date.now() });
    });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await (this.watcher as { close(): Promise<void> }).close();
      this.watcher = null;
    }
    for (const timer of this.debounceMap.values()) {
      clearTimeout(timer);
    }
    this.debounceMap.clear();
  }

  private debounceEmit(event: FileChangeEvent): void {
    const key = event.filePath;
    const existing = this.debounceMap.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceMap.delete(key);
      this.emit('change', event);
    }, this.debounceMs);

    this.debounceMap.set(key, timer);
  }
}
