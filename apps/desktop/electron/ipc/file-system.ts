import type { IpcMain, BrowserWindow } from 'electron';
import { dialog } from 'electron';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileTreeNode } from '@intent-ide/core';
import { simpleGit } from 'simple-git';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

export function setupFileSystemIpc(ipcMain: IpcMain): void {
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    const content = await readFile(filePath, 'utf-8');
    return content;
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    await writeFile(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:readDir', async (_, dirPath: string): Promise<FileTreeNode[]> => {
    return buildFileTree(dirPath, dirPath);
  });

  ipcMain.handle('fs:openProject', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return null;
    }

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Open Project',
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return result.filePaths[0];
  });

  // git 변경 파일 목록
  ipcMain.handle('fs:getGitChanges', async (_, projectPath: string) => {
    try {
      const git = simpleGit(projectPath);
      const status = await git.status();
      const files = [
        ...status.modified.map(f => ({ path: f, status: 'modified' as const, additions: 0, deletions: 0 })),
        ...status.created.map(f => ({ path: f, status: 'added' as const, additions: 0, deletions: 0 })),
        ...status.deleted.map(f => ({ path: f, status: 'deleted' as const, additions: 0, deletions: 0 })),
        ...status.not_added.map(f => ({ path: f, status: 'added' as const, additions: 0, deletions: 0 })),
      ];
      // diff --stat으로 추가/삭제 줄 수 계산
      const diffStat = await git.diff(['--stat', 'HEAD']).catch(() => '');
      for (const line of diffStat.split('\n')) {
        const match = line.match(/^\s*(.+?)\s+\|\s+\d+\s+([+]+)?(-+)?/);
        if (match) {
          const filePath = match[1]?.trim() ?? '';
          const file = files.find(f => f.path.endsWith(filePath) || filePath.endsWith(f.path));
          if (file) {
            file.additions = (match[2]?.length ?? 0);
            file.deletions = (match[3]?.length ?? 0);
          }
        }
      }
      return files;
    } catch {
      return [];
    }
  });

  // 파일 diff
  ipcMain.handle('fs:getFileDiff', async (_, projectPath: string, filePath: string) => {
    try {
      const git = simpleGit(projectPath);
      const diff = await git.diff(['HEAD', '--', filePath]).catch(() => '');
      if (diff) return diff;
      // 스테이지되지 않은 새 파일
      const untracked = await git.diff(['--', filePath]).catch(() => '');
      return untracked;
    } catch {
      return '';
    }
  });

  // PR 생성 (gh CLI 연동)
  ipcMain.handle('fs:createPR', async (_, projectPath: string, title: string, body: string) => {
    try {
      const { stdout } = await execAsync(
        `gh pr create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --head HEAD`,
        { cwd: projectPath }
      );
      return { success: true, url: stdout.trim() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });
}

async function buildFileTree(
  dirPath: string,
  rootPath: string
): Promise<FileTreeNode[]> {
  const EXCLUDED = new Set([
    'node_modules', '.git', 'dist', 'out', '.next', '.nuxt',
    'coverage', '.cache', '.intent-ide',
  ]);

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    return [];
  }

  const nodes: FileTreeNode[] = [];

  for (const entry of entries.sort()) {
    if (EXCLUDED.has(entry)) {
      continue;
    }

    const fullPath = join(dirPath, entry);
    let fileStat;
    try {
      fileStat = await stat(fullPath);
    } catch {
      continue;
    }

    if (fileStat.isDirectory()) {
      nodes.push({
        name: entry,
        path: fullPath,
        type: 'directory',
        children: await buildFileTree(fullPath, rootPath),
        isExpanded: false,
      });
    } else {
      nodes.push({
        name: entry,
        path: fullPath,
        type: 'file',
      });
    }
  }

  return nodes;
}
