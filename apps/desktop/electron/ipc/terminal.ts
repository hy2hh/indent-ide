import type { IpcMain, WebContents } from 'electron';

interface PtyProcess {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
  onData: (cb: (data: string) => void) => void;
}

const terminals = new Map<string, PtyProcess>();

export function setupTerminalIpc(ipcMain: IpcMain): void {
  ipcMain.handle('terminal:create', async (event, projectPath: string) => {
    const id = `term-${Date.now()}`;
    const sender: WebContents = event.sender;

    try {
      // Dynamic import to avoid issues if node-pty not installed
      const pty = await import('node-pty');
      const shell = process.platform === 'win32' ? 'cmd.exe' : process.env['SHELL'] ?? 'bash';

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: projectPath,
        env: process.env as Record<string, string>,
      });

      ptyProcess.onData((data) => {
        sender.send(`terminal:data:${id}`, data);
      });

      const ptyWrapper: PtyProcess = {
        write: (data: string) => ptyProcess.write(data),
        resize: (cols: number, rows: number) => ptyProcess.resize(cols, rows),
        kill: () => ptyProcess.kill(),
        onData: (cb: (data: string) => void) => ptyProcess.onData(cb),
      };

      terminals.set(id, ptyWrapper);
    } catch {
      // node-pty not available, create mock terminal
      const mockTerminal: PtyProcess = {
        write: (data: string) => {
          sender.send(`terminal:data:${id}`, `\r\n[Terminal] ${data}`);
        },
        resize: () => { /* no-op */ },
        kill: () => { /* no-op */ },
        onData: () => { /* no-op */ },
      };
      terminals.set(id, mockTerminal);
    }

    return { id };
  });

  ipcMain.handle('terminal:write', (_, id: string, data: string) => {
    const term = terminals.get(id);
    if (term) {
      term.write(data);
    }
    return true;
  });

  ipcMain.handle('terminal:resize', (_, id: string, cols: number, rows: number) => {
    const term = terminals.get(id);
    if (term) {
      term.resize(cols, rows);
    }
    return true;
  });

  ipcMain.handle('terminal:destroy', (_, id: string) => {
    const term = terminals.get(id);
    if (term) {
      term.kill();
      terminals.delete(id);
    }
    return true;
  });
}
