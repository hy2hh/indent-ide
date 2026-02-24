import { readdir, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

export interface ScanOptions {
  extensions?: string[];
  excludePatterns?: RegExp[];
  maxDepth?: number;
}

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: number;
}

const DEFAULT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php',
  '.vue', '.svelte', '.json', '.yaml', '.yml', '.toml',
  '.md', '.mdx',
];

const DEFAULT_EXCLUDE = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.next/,
  /\.nuxt/,
  /coverage/,
  /\.cache/,
  /\.intent-ide/,
];

export class FileScanner {
  private rootPath: string;
  private options: Required<ScanOptions>;

  constructor(rootPath: string, options: ScanOptions = {}) {
    this.rootPath = rootPath;
    this.options = {
      extensions: options.extensions ?? DEFAULT_EXTENSIONS,
      excludePatterns: options.excludePatterns ?? DEFAULT_EXCLUDE,
      maxDepth: options.maxDepth ?? 10,
    };
  }

  async scan(): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    await this.scanDirectory(this.rootPath, 0, files);
    return files;
  }

  private async scanDirectory(
    dirPath: string,
    depth: number,
    files: ScannedFile[]
  ): Promise<void> {
    if (depth > this.options.maxDepth) {
      return;
    }

    let entries: string[];
    try {
      entries = await readdir(dirPath);
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dirPath, entry);
        const relPath = relative(this.rootPath, fullPath);

        if (this.isExcluded(relPath)) {
          return;
        }

        let fileStat;
        try {
          fileStat = await stat(fullPath);
        } catch {
          return;
        }

        if (fileStat.isDirectory()) {
          await this.scanDirectory(fullPath, depth + 1, files);
        } else if (fileStat.isFile()) {
          const ext = extname(fullPath);
          if (this.options.extensions.includes(ext)) {
            files.push({
              absolutePath: fullPath,
              relativePath: relPath,
              extension: ext,
              sizeBytes: fileStat.size,
              modifiedAt: fileStat.mtimeMs,
            });
          }
        }
      })
    );
  }

  private isExcluded(path: string): boolean {
    return this.options.excludePatterns.some((pattern) => pattern.test(path));
  }
}
