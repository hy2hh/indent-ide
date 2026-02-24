import { create } from 'zustand';
import type { EditorTab, CursorPosition } from '@intent-ide/core';

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  cursorPosition: CursorPosition;
  openFile: (filePath: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveTab: (tabId: string) => Promise<void>;
  setCursorPosition: (position: CursorPosition) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  cursorPosition: { line: 1, column: 1 },

  openFile: async (filePath: string) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.filePath === filePath);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    const content = await window.intentIde.fs.readFile(filePath) as string;
    const fileName = filePath.split('/').pop() ?? 'untitled';
    const id = `tab-${Date.now()}`;

    set({
      tabs: [...tabs, {
        id,
        filePath,
        fileName,
        isDirty: false,
        isActive: true,
        content,
        language: getLanguageFromPath(filePath),
      }],
      activeTabId: id,
    });
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter((t) => t.id !== tabId);
    let newActiveId = activeTabId;

    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      newActiveId = newTabs[idx]?.id ?? newTabs[idx - 1]?.id ?? null;
    }

    set({ tabs: newTabs, activeTabId: newActiveId });
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  updateTabContent: (tabId: string, content: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      ),
    }));
  },

  saveTab: async (tabId: string) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab?.content) {
      return;
    }
    await window.intentIde.fs.writeFile(tab.filePath, tab.content);
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, isDirty: false } : t
      ),
    }));
  },

  setCursorPosition: (position) => {
    set({ cursorPosition: position });
  },
}));

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop() ?? '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    go: 'go',
    rs: 'rust',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return langMap[ext] ?? 'text';
}
