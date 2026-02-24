import type { IpcMain, BrowserWindow } from 'electron';
import { dialog } from 'electron';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileTreeNode } from '@intent-ide/core';

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
