import type { IpcMain } from 'electron';
import { BrowserWindow, dialog, shell } from 'electron';
import { readFile, writeFile, readdir, stat, mkdir, unlink, rename } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { FileTreeNode } from '@intent-ide/core';
import { simpleGit } from 'simple-git';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

export function setupFileSystemIpc(ipcMain: IpcMain): void {
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    const content = await readFile(filePath, 'utf-8');
    return content;
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    await writeFile(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
    await unlink(filePath);
    return true;
  });

  ipcMain.handle('fs:renameFile', async (_, fromPath: string, toPath: string) => {
    await rename(fromPath, toPath);
    return true;
  });

  ipcMain.handle('fs:ensureDir', async (_, dirPath: string) => {
    await mkdir(dirPath, { recursive: true });
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

  ipcMain.handle('fs:createProject', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return null;
    }

    const result = await dialog.showSaveDialog(win, {
      title: 'New Project',
      buttonLabel: 'Create Project',
      nameFieldLabel: 'Project Name',
      defaultPath: 'untitled-project',
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const projectPath = result.filePath;
    await mkdir(projectPath, { recursive: true });

    const readmePath = join(projectPath, 'README.md');
    const readmeContent = `# ${basename(projectPath)}\n\nCreated with Intent IDE.\n`;
    await writeFile(readmePath, readmeContent, 'utf-8').catch(() => undefined);

    return projectPath;
  });

  ipcMain.handle('fs:openExternal', async (_, url: string) => {
    await shell.openExternal(url);
    return true;
  });

  // git 변경 파일 목록
  ipcMain.handle('fs:getGitChanges', async (_, projectPath: string) => {
    try {
      const git = simpleGit(projectPath);
      const status = await git.status();
      const files = status.files.map((file) => {
        const stateCode = file.working_dir.trim() ? file.working_dir : file.index;
        const normalizedStatus =
          stateCode === 'A' || stateCode === '?'
            ? 'added'
            : stateCode === 'D'
              ? 'deleted'
              : 'modified';
        const staged = file.index !== ' ' && file.index !== '?' && file.index !== '!';
        return {
          path: file.path,
          status: normalizedStatus as 'added' | 'modified' | 'deleted',
          staged,
          additions: 0,
          deletions: 0,
        };
      });
      const uniqueFiles = Array.from(new Map(files.map((file) => [file.path, file])).values());
      // diff --stat으로 추가/삭제 줄 수 계산
      const diffStat = await git.diff(['--stat', 'HEAD']).catch(() => '');
      for (const line of diffStat.split('\n')) {
        const match = line.match(/^\s*(.+?)\s+\|\s+\d+\s+([+]+)?(-+)?/);
        if (match) {
          const filePath = match[1]?.trim() ?? '';
          const file = uniqueFiles.find((item) => item.path.endsWith(filePath) || filePath.endsWith(item.path));
          if (file) {
            file.additions = (match[2]?.length ?? 0);
            file.deletions = (match[3]?.length ?? 0);
          }
        }
      }
      return uniqueFiles;
    } catch {
      return [];
    }
  });

  // 파일 diff
  ipcMain.handle('fs:getFileDiff', async (_, projectPath: string, filePath: string) => {
    try {
      const git = simpleGit(projectPath);
      const diff = await git.diff(['HEAD', '--', filePath]).catch(() => '');
      if (diff) {
        return diff;
      }
      // 스테이지되지 않은 새 파일
      const untracked = await git.diff(['--', filePath]).catch(() => '');
      return untracked;
    } catch {
      return '';
    }
  });

  ipcMain.handle('fs:stageFile', async (_, projectPath: string, filePath: string) => {
    try {
      const git = simpleGit(projectPath);
      await git.add([filePath]);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  });

  ipcMain.handle('fs:unstageFile', async (_, projectPath: string, filePath: string) => {
    try {
      const git = simpleGit(projectPath);
      await git.reset(['HEAD', '--', filePath]);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  });

  ipcMain.handle('fs:discardFileChanges', async (_, projectPath: string, filePath: string) => {
    try {
      const git = simpleGit(projectPath);
      try {
        await git.raw(['restore', '--staged', '--worktree', '--', filePath]);
      } catch {
        const absolutePath = join(projectPath, filePath);
        await unlink(absolutePath).catch(() => undefined);
        await git.reset(['HEAD', '--', filePath]).catch(() => undefined);
      }
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  });

  ipcMain.handle('fs:stageHunk', async (_, projectPath: string, patch: string) => {
    if (!patch || !patch.trim()) {
      return { success: false, error: 'Patch content is required.' };
    }

    try {
      const git = simpleGit(projectPath);
      await withTempPatchFile(patch, async (patchFilePath) => {
        await git.raw(['apply', '--cached', '--recount', '--whitespace=nowarn', '--unidiff-zero', patchFilePath]);
      });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  });

  ipcMain.handle('fs:unstageHunk', async (_, projectPath: string, patch: string) => {
    if (!patch || !patch.trim()) {
      return { success: false, error: 'Patch content is required.' };
    }

    try {
      const git = simpleGit(projectPath);
      await withTempPatchFile(patch, async (patchFilePath) => {
        await git.raw(['apply', '--cached', '--reverse', '--recount', '--whitespace=nowarn', '--unidiff-zero', patchFilePath]);
      });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  });

  ipcMain.handle('fs:applyHunk', async (_, projectPath: string, patch: string) => {
    if (!patch || !patch.trim()) {
      return { success: false, error: 'Patch content is required.' };
    }

    try {
      const git = simpleGit(projectPath);
      await withTempPatchFile(patch, async (patchFilePath) => {
        await git.raw(['apply', '--recount', '--whitespace=nowarn', '--unidiff-zero', patchFilePath]);
      });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  });

  ipcMain.handle('fs:discardHunk', async (_, projectPath: string, patch: string) => {
    if (!patch || !patch.trim()) {
      return { success: false, error: 'Patch content is required.' };
    }

    try {
      const git = simpleGit(projectPath);
      await withTempPatchFile(patch, async (patchFilePath) => {
        await git.raw(['apply', '--reverse', '--recount', '--whitespace=nowarn', '--unidiff-zero', patchFilePath]);
      });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    }
  });

  // PR 생성 (gh CLI 연동)
  ipcMain.handle('fs:createPR', async (_, projectPath: string, title: string, body: string) => {
    try {
      const git = simpleGit(projectPath);
      const branch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();

      if (!branch || branch === 'HEAD') {
        return { success: false, error: 'Unable to determine current branch. Commit changes on a branch first.' };
      }

      const { stdout } = await execFileAsync(
        'gh',
        ['pr', 'create', '--title', title, '--body', body, '--head', branch],
        { cwd: projectPath }
      );
      const urlMatch = stdout.match(/https?:\/\/\S+/);
      const url = urlMatch?.[0] ?? stdout.trim();
      return { success: true, url };
    } catch (err) {
      const error = err as Error & { code?: string; stderr?: string };
      if (error.code === 'ENOENT') {
        return { success: false, error: 'gh CLI not found. Install GitHub CLI and run `gh auth login`.' };
      }
      const stderr = error.stderr?.trim();
      const msg = stderr || error.message || String(err);
      return { success: false, error: msg };
    }
  });
}

async function withTempPatchFile(
  patch: string,
  fn: (patchFilePath: string) => Promise<void>,
): Promise<void> {
  const patchFilePath = join(tmpdir(), `intent-ide-${randomUUID()}.patch`);
  await writeFile(patchFilePath, patch, 'utf-8');
  try {
    await fn(patchFilePath);
  } finally {
    await unlink(patchFilePath).catch(() => undefined);
  }
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
