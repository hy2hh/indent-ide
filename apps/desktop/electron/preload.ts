import { contextBridge, ipcRenderer } from 'electron';

/**
 * Renderer Process에 안전하게 노출하는 API
 */
const api = {
  // File System
  fs: {
    readFile: (filePath: string) =>
      ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDir: (dirPath: string) =>
      ipcRenderer.invoke('fs:readDir', dirPath),
    openProject: () =>
      ipcRenderer.invoke('fs:openProject'),
    watchFile: (filePath: string) =>
      ipcRenderer.invoke('fs:watchFile', filePath),
  },

  // Context Engine
  context: {
    indexProject: (projectPath: string) =>
      ipcRenderer.invoke('context:indexProject', projectPath),
    search: (query: string, agentRole: string) =>
      ipcRenderer.invoke('context:search', query, agentRole),
    getStats: () =>
      ipcRenderer.invoke('context:getStats'),
    onIndexProgress: (callback: (progress: number) => void) => {
      ipcRenderer.on('context:indexProgress', (_, progress) => callback(progress as number));
    },
  },

  // Agent Orchestration
  agent: {
    startPipeline: (goal: string, projectPath: string) =>
      ipcRenderer.invoke('agent:startPipeline', goal, projectPath),
    cancelPipeline: (sessionId: string) =>
      ipcRenderer.invoke('agent:cancelPipeline', sessionId),
    approveSpec: (specId: string) =>
      ipcRenderer.invoke('agent:approveSpec', specId),
    updateModelProfile: (role: string, profile: unknown) =>
      ipcRenderer.invoke('agent:updateModelProfile', role, profile),
    getDetectedCLIs: () =>
      ipcRenderer.invoke('agent:getDetectedCLIs'),
    onAgentEvent: (callback: (event: unknown) => void) => {
      ipcRenderer.on('agent:event', (_, event) => callback(event));
      return () => ipcRenderer.removeAllListeners('agent:event');
    },
    onSpecUpdated: (callback: (spec: unknown) => void) => {
      ipcRenderer.on('agent:specUpdated', (_, spec) => callback(spec));
      return () => ipcRenderer.removeAllListeners('agent:specUpdated');
    },
  },

  // Terminal
  terminal: {
    create: (projectPath: string) =>
      ipcRenderer.invoke('terminal:create', projectPath),
    write: (id: string, data: string) =>
      ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke('terminal:resize', id, cols, rows),
    destroy: (id: string) =>
      ipcRenderer.invoke('terminal:destroy', id),
    onData: (id: string, callback: (data: string) => void) => {
      ipcRenderer.on(`terminal:data:${id}`, (_, data) => callback(data as string));
    },
  },
};

contextBridge.exposeInMainWorld('intentIde', api);

export type IntentIdeApi = typeof api;
