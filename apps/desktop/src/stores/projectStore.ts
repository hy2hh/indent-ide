import { create } from 'zustand';
import type { FileTreeNode } from '@intent-ide/core';

interface ProjectState {
  projectPath: string | null;
  fileTree: FileTreeNode[];
  isIndexing: boolean;
  indexProgress: number;
  indexStats: { total: number; indexed: number; stale: number } | null;
  openProject: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
  indexProject: () => Promise<void>;
  setIndexProgress: (progress: number) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  fileTree: [],
  isIndexing: false,
  indexProgress: 0,
  indexStats: null,

  openProject: async () => {
    const path = await window.intentIde.fs.openProject();
    if (!path) {
      return;
    }
    set({ projectPath: path });
    await get().refreshFileTree();

    // Subscribe to index progress
    window.intentIde.context.onIndexProgress((progress) => {
      get().setIndexProgress(progress);
    });
  },

  refreshFileTree: async () => {
    const { projectPath } = get();
    if (!projectPath) {
      return;
    }
    const tree = await window.intentIde.fs.readDir(projectPath);
    set({ fileTree: tree as FileTreeNode[] });
  },

  indexProject: async () => {
    const { projectPath } = get();
    if (!projectPath) {
      return;
    }
    set({ isIndexing: true, indexProgress: 0 });
    try {
      const result = await window.intentIde.context.indexProject(projectPath) as {
        filesIndexed: number;
        totalChunks: number;
        stats: { total: number; indexed: number; stale: number };
      };
      set({ indexStats: result.stats, isIndexing: false, indexProgress: 100 });
    } catch {
      set({ isIndexing: false });
    }
  },

  setIndexProgress: (progress) => {
    set({ indexProgress: progress });
  },
}));
