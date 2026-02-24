import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScannedFile } from '../scanner/FileScanner.js';

export interface FileIndex {
  filePath: string;
  modifiedAt: number;
  chunkIds: string[];
  indexed: boolean;
}

export interface IndexState {
  version: number;
  lastIndexed: number;
  files: Record<string, FileIndex>;
}

export class IndexManager {
  private storagePath: string;
  private indexPath: string;
  private state: IndexState;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.indexPath = join(storagePath, 'index.json');
    this.state = {
      version: 1,
      lastIndexed: 0,
      files: {},
    };
  }

  async load(): Promise<void> {
    try {
      const data = await readFile(this.indexPath, 'utf-8');
      this.state = JSON.parse(data) as IndexState;
    } catch {
      // Start fresh if no index exists
      this.state = {
        version: 1,
        lastIndexed: 0,
        files: {},
      };
    }
  }

  async save(): Promise<void> {
    await mkdir(this.storagePath, { recursive: true });
    await writeFile(this.indexPath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  needsIndexing(file: ScannedFile): boolean {
    const existing = this.state.files[file.absolutePath];
    if (!existing) {
      return true;
    }
    return file.modifiedAt > existing.modifiedAt || !existing.indexed;
  }

  markIndexed(filePath: string, chunkIds: string[], modifiedAt: number): void {
    this.state.files[filePath] = {
      filePath,
      modifiedAt,
      chunkIds,
      indexed: true,
    };
  }

  markStale(filePath: string): void {
    const existing = this.state.files[filePath];
    if (existing) {
      existing.indexed = false;
    }
  }

  removeFile(filePath: string): string[] {
    const existing = this.state.files[filePath];
    if (!existing) {
      return [];
    }
    const chunkIds = existing.chunkIds;
    delete this.state.files[filePath];
    return chunkIds;
  }

  getIndexedFilePaths(): string[] {
    return Object.keys(this.state.files);
  }

  getStats(): { total: number; indexed: number; stale: number } {
    const files = Object.values(this.state.files);
    return {
      total: files.length,
      indexed: files.filter((f) => f.indexed).length,
      stale: files.filter((f) => !f.indexed).length,
    };
  }

  updateLastIndexed(): void {
    this.state.lastIndexed = Date.now();
  }
}
