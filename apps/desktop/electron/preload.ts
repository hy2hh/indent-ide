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
    deleteFile: (filePath: string) =>
      ipcRenderer.invoke('fs:deleteFile', filePath),
    renameFile: (fromPath: string, toPath: string) =>
      ipcRenderer.invoke('fs:renameFile', fromPath, toPath),
    ensureDir: (dirPath: string) =>
      ipcRenderer.invoke('fs:ensureDir', dirPath),
    readDir: (dirPath: string) =>
      ipcRenderer.invoke('fs:readDir', dirPath),
    openProject: () =>
      ipcRenderer.invoke('fs:openProject'),
    createProject: () =>
      ipcRenderer.invoke('fs:createProject'),
    openExternal: (url: string) =>
      ipcRenderer.invoke('fs:openExternal', url),
    watchFile: (filePath: string) =>
      ipcRenderer.invoke('fs:watchFile', filePath),
    getGitChanges: (projectPath: string) =>
      ipcRenderer.invoke('fs:getGitChanges', projectPath),
    getFileDiff: (projectPath: string, filePath: string) =>
      ipcRenderer.invoke('fs:getFileDiff', projectPath, filePath),
    stageFile: (projectPath: string, filePath: string) =>
      ipcRenderer.invoke('fs:stageFile', projectPath, filePath),
    unstageFile: (projectPath: string, filePath: string) =>
      ipcRenderer.invoke('fs:unstageFile', projectPath, filePath),
    discardFileChanges: (projectPath: string, filePath: string) =>
      ipcRenderer.invoke('fs:discardFileChanges', projectPath, filePath),
    stageHunk: (projectPath: string, patch: string) =>
      ipcRenderer.invoke('fs:stageHunk', projectPath, patch),
    unstageHunk: (projectPath: string, patch: string) =>
      ipcRenderer.invoke('fs:unstageHunk', projectPath, patch),
    applyHunk: (projectPath: string, patch: string) =>
      ipcRenderer.invoke('fs:applyHunk', projectPath, patch),
    discardHunk: (projectPath: string, patch: string) =>
      ipcRenderer.invoke('fs:discardHunk', projectPath, patch),
    createPR: (projectPath: string, title: string, body: string) =>
      ipcRenderer.invoke('fs:createPR', projectPath, title, body),
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
    updateSpecDraft: (payload: { tasks: unknown[] }) =>
      ipcRenderer.invoke('agent:updateSpecDraft', payload),
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
