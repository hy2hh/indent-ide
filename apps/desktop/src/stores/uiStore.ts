import { create } from 'zustand';

export type RightPanelMode = 'spec' | 'browser';
export type LayoutPresetId = 'default' | 'focus' | 'review' | 'custom';

export interface WorkspaceLayout {
  leftWidth: number;
  rightWidth: number;
  terminalHeight: number;
}

interface UiStoreState {
  initialized: boolean;
  rightPanelMode: RightPanelMode;
  currentLayoutId: LayoutPresetId;
  layout: WorkspaceLayout;
  savedLayouts: Record<string, WorkspaceLayout>;
  browserUrl: string;
  browserHistory: string[];
  historyIndex: number;
  browserRevision: number;
  initialize: () => void;
  setRightPanelMode: (mode: RightPanelMode) => void;
  updateLayout: (patch: Partial<WorkspaceLayout>) => void;
  applyBuiltinLayout: (id: Exclude<LayoutPresetId, 'custom'>) => void;
  saveLayout: (name: string) => boolean;
  applySavedLayout: (name: string) => void;
  removeSavedLayout: (name: string) => void;
  setBrowserUrl: (url: string, options?: { pushHistory?: boolean }) => void;
  openBrowserUrl: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  reloadBrowser: () => void;
}

interface PersistedUiState {
  rightPanelMode: RightPanelMode;
  currentLayoutId: LayoutPresetId;
  layout: WorkspaceLayout;
  savedLayouts: Record<string, WorkspaceLayout>;
  browserUrl: string;
  browserHistory: string[];
  historyIndex: number;
}

const STORAGE_KEY = 'intent-ide:ui-state:v1';

const BUILTIN_LAYOUTS: Record<Exclude<LayoutPresetId, 'custom'>, WorkspaceLayout> = {
  default: { leftWidth: 300, rightWidth: 400, terminalHeight: 220 },
  focus: { leftWidth: 260, rightWidth: 360, terminalHeight: 180 },
  review: { leftWidth: 340, rightWidth: 480, terminalHeight: 260 },
};

function clampLayout(layout: WorkspaceLayout): WorkspaceLayout {
  return {
    leftWidth: Math.min(Math.max(layout.leftWidth, 240), 520),
    rightWidth: Math.min(Math.max(layout.rightWidth, 320), 700),
    terminalHeight: Math.min(Math.max(layout.terminalHeight, 140), 420),
  };
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return `http://${trimmed}`;
  }

  if (trimmed.includes('.') || trimmed.includes(':')) {
    return `https://${trimmed}`;
  }

  return `https://${trimmed}`;
}

function toPersistedState(state: UiStoreState): PersistedUiState {
  return {
    rightPanelMode: state.rightPanelMode,
    currentLayoutId: state.currentLayoutId,
    layout: state.layout,
    savedLayouts: state.savedLayouts,
    browserUrl: state.browserUrl,
    browserHistory: state.browserHistory,
    historyIndex: state.historyIndex,
  };
}

function persistState(state: UiStoreState): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedState(state)));
}

function readPersistedState(): PersistedUiState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedUiState>;
    const rightPanelMode = parsed.rightPanelMode === 'browser' ? 'browser' : 'spec';

    const builtinLayout = parsed.currentLayoutId && parsed.currentLayoutId in BUILTIN_LAYOUTS
      ? BUILTIN_LAYOUTS[parsed.currentLayoutId as Exclude<LayoutPresetId, 'custom'>]
      : BUILTIN_LAYOUTS.default;

    const layout = parsed.layout ? clampLayout(parsed.layout) : builtinLayout;

    const savedLayouts = Object.fromEntries(
      Object.entries(parsed.savedLayouts ?? {}).map(([key, value]) => [key, clampLayout(value)])
    );

    const browserHistory = Array.isArray(parsed.browserHistory)
      ? parsed.browserHistory.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      : [];
    const historyIndex = browserHistory.length === 0
      ? -1
      : Math.min(
          Math.max(typeof parsed.historyIndex === 'number' ? parsed.historyIndex : browserHistory.length - 1, 0),
          browserHistory.length - 1
        );
    const browserUrl =
      typeof parsed.browserUrl === 'string' && parsed.browserUrl.length > 0
        ? parsed.browserUrl
        : browserHistory[historyIndex] ?? 'https://www.augmentcode.com/product/intent';

    const currentLayoutId =
      parsed.currentLayoutId === 'default' || parsed.currentLayoutId === 'focus' || parsed.currentLayoutId === 'review'
        ? parsed.currentLayoutId
        : parsed.currentLayoutId === 'custom'
          ? 'custom'
          : 'default';

    return {
      rightPanelMode,
      currentLayoutId,
      layout,
      savedLayouts,
      browserUrl,
      browserHistory,
      historyIndex,
    };
  } catch {
    return null;
  }
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  initialized: false,
  rightPanelMode: 'spec',
  currentLayoutId: 'default',
  layout: BUILTIN_LAYOUTS.default,
  savedLayouts: {},
  browserUrl: 'https://www.augmentcode.com/product/intent',
  browserHistory: ['https://www.augmentcode.com/product/intent'],
  historyIndex: 0,
  browserRevision: 0,

  initialize: () => {
    if (get().initialized) {
      return;
    }
    const persisted = readPersistedState();
    if (persisted) {
      set({
        initialized: true,
        rightPanelMode: persisted.rightPanelMode,
        currentLayoutId: persisted.currentLayoutId,
        layout: persisted.layout,
        savedLayouts: persisted.savedLayouts,
        browserUrl: persisted.browserUrl,
        browserHistory: persisted.browserHistory.length > 0 ? persisted.browserHistory : [persisted.browserUrl],
        historyIndex: persisted.historyIndex >= 0 ? persisted.historyIndex : 0,
      });
      persistState(get());
      return;
    }

    set({ initialized: true });
    persistState(get());
  },

  setRightPanelMode: (mode) => {
    set({ rightPanelMode: mode });
    persistState(get());
  },

  updateLayout: (patch) => {
    const current = get().layout;
    const next = clampLayout({
      leftWidth: patch.leftWidth ?? current.leftWidth,
      rightWidth: patch.rightWidth ?? current.rightWidth,
      terminalHeight: patch.terminalHeight ?? current.terminalHeight,
    });
    set({
      currentLayoutId: 'custom',
      layout: next,
    });
    persistState(get());
  },

  applyBuiltinLayout: (id) => {
    set({
      currentLayoutId: id,
      layout: BUILTIN_LAYOUTS[id],
    });
    persistState(get());
  },

  saveLayout: (name) => {
    const normalizedName = name.trim().slice(0, 32);
    if (!normalizedName) {
      return false;
    }
    const current = get();
    set({
      currentLayoutId: 'custom',
      savedLayouts: {
        ...current.savedLayouts,
        [normalizedName]: clampLayout(current.layout),
      },
    });
    persistState(get());
    return true;
  },

  applySavedLayout: (name) => {
    const existing = get().savedLayouts[name];
    if (!existing) {
      return;
    }
    set({
      currentLayoutId: 'custom',
      layout: clampLayout(existing),
    });
    persistState(get());
  },

  removeSavedLayout: (name) => {
    const current = get();
    if (!current.savedLayouts[name]) {
      return;
    }
    const next = { ...current.savedLayouts };
    delete next[name];
    set({ savedLayouts: next });
    persistState(get());
  },

  setBrowserUrl: (url, options) => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return;
    }

    const pushHistory = options?.pushHistory !== false;
    const current = get();

    if (!pushHistory) {
      set({ browserUrl: normalizedUrl });
      persistState(get());
      return;
    }

    const previous = current.browserHistory.slice(0, current.historyIndex + 1);
    const nextHistory = previous[previous.length - 1] === normalizedUrl
      ? previous
      : [...previous, normalizedUrl].slice(-40);
    const nextIndex = Math.max(nextHistory.length - 1, 0);

    set({
      browserUrl: normalizedUrl,
      browserHistory: nextHistory,
      historyIndex: nextIndex,
      rightPanelMode: 'browser',
    });
    persistState(get());
  },

  openBrowserUrl: (url) => {
    get().setBrowserUrl(url);
    set({ rightPanelMode: 'browser' });
    persistState(get());
  },

  goBack: () => {
    const current = get();
    if (current.historyIndex <= 0) {
      return;
    }
    const nextIndex = current.historyIndex - 1;
    const nextUrl = current.browserHistory[nextIndex] ?? current.browserUrl;
    set({
      historyIndex: nextIndex,
      browserUrl: nextUrl,
      rightPanelMode: 'browser',
    });
    persistState(get());
  },

  goForward: () => {
    const current = get();
    if (current.historyIndex >= current.browserHistory.length - 1) {
      return;
    }
    const nextIndex = current.historyIndex + 1;
    const nextUrl = current.browserHistory[nextIndex] ?? current.browserUrl;
    set({
      historyIndex: nextIndex,
      browserUrl: nextUrl,
      rightPanelMode: 'browser',
    });
    persistState(get());
  },

  reloadBrowser: () => {
    set((state) => ({ browserRevision: state.browserRevision + 1 }));
  },
}));
